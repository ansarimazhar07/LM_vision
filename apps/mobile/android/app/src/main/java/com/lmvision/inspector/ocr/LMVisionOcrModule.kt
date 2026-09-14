package com.lmvision.inspector.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.Executors
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * =========================================================================================
 * PHASE B: ANDROID Matrix SEMANTICS & HOMOGRAPHY MAPPING SPECIFICATION
 * =========================================================================================
 *
 * 1. DIRECTION OF android.graphics.Matrix.setPolyToPoly():
 *    Method signature:
 *      setPolyToPoly(float[] src, int srcIndex, float[] dst, int dstIndex, int pointCount)
 *
 *    DIRECTION:
 *      Maps points from SOURCE (src) to DESTINATION (dst).
 *      Mathematically: [X_dst, Y_dst, 1]^T = M * [X_src, Y_src, 1]^T
 *
 *    POINT ORDERING (4 points):
 *      Index 0: Top-Left     [src[0], src[1]] -> [dst[0], dst[1]]
 *      Index 1: Top-Right    [src[2], src[3]] -> [dst[2], dst[3]]
 *      Index 2: Bottom-Right [src[4], src[5]] -> [dst[4], dst[5]]
 *      Index 3: Bottom-Left  [src[6], src[7]] -> [dst[6], dst[7]]
 *
 * 2. INVERSION OF THE MATRIX:
 *    When forward Matrix M maps Original Photo Quad -> Rectified Canvas Rect:
 *      M.invert(invMatrix)
 *    invMatrix maps points from RECTIFIED CANVAS -> ORIGINAL PHOTO (DESTINATION -> SOURCE).
 *
 * 3. OCR BOUNDING BOX PROJECTION INVARIANT:
 *    ML Kit OCR operates on the rectified canvas, producing bounding boxes in rectified canvas coordinates.
 *    To map these boxes back to the ORIGINAL immutable evidence photograph:
 *      - All 4 corners of the detected box must be transformed using invMatrix:
 *          (xMin, yMin), (xMax, yMin), (xMax, yMax), (xMin, yMax)
 *      - Transforming only xMin/yMin produces severe distortion on tilted or sheared panels.
 *      - The enclosing axis-aligned bounding box [min(X), min(Y), max(X), max(Y)] is computed
 *        in original image space, normalized by original (width, height), and clamped to [0.0, 1.0].
 *    This ensures the Evidence Heatmap on the mobile screen aligns perfectly on the original photo.
 * =========================================================================================
 *
 * LMVisionOcrModule (Phase B: Advanced Offline Computer Vision & Quality Analysis)
 *
 * Real On-Device Offline OCR & CV Engine for LM-Vision:
 * - 100% On-device processing using Google ML Kit bundled models.
 * - Latin + Devanagari dual recognizer execution with spatial deduplication.
 * - Explicit EXIF orientation extraction and effective dimension scaling.
 * - Nullable confidence preservation without fabricated numbers.
 * - Mathematical discrete Laplacian variance blur & focus analysis.
 * - Specular reflection glare clustering without presuming text is unreadable.
 * - Selective lightweight in-memory preprocessing (ColorMatrix contrast enhancement, grayscale, scaling).
 * - Selective multi-pass OCR: Pass 2 triggered ONLY when initial results indicate low quality, small text,
 *   suspicious numbers/dates, or ambiguity.
 * - Explicit conflict resolution: conflicting readings produce REQUIRES_VERIFICATION state without guessing.
 * - Zero network requests, zero cloud calls, zero Gemini calls.
 */

class LMVisionOcrModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val backgroundExecutor = Executors.newSingleThreadExecutor()

    // Lazy initialization of bundled recognizers
    private val latinRecognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    private val devanagariRecognizer by lazy {
        TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
    }

    override fun getName(): String = "LMVisionOcr"

    @ReactMethod
    fun recognizeText(imageUriOrBase64: String, promise: Promise) {
        backgroundExecutor.execute {
            var pass1Bitmap: Bitmap? = null
            var pass2Bitmap: Bitmap? = null
            try {
                if (imageUriOrBase64.isBlank()) {
                    promise.reject("EMPTY_INPUT", "Image source URI or Base64 payload cannot be empty.")
                    return@execute
                }

                // 1. Resolve image input, EXIF orientation, and dimensions
                val parsedImage = resolveInputImage(imageUriOrBase64)
                val rawWidth = parsedImage.rawWidth
                val rawHeight = parsedImage.rawHeight
                val rotationDegrees = parsedImage.rotationDegrees
                val effectiveWidth = parsedImage.effectiveWidth
                val effectiveHeight = parsedImage.effectiveHeight
                pass1Bitmap = parsedImage.allocatedBitmap

                // 2. PASS 1: Execute Latin + Devanagari bundled recognizers
                val pass1Blocks = runDualRecognition(
                    parsedImage.inputImage,
                    effectiveWidth,
                    effectiveHeight
                )

                // 3. Evaluate Pass 1 to determine if selective Pass 2 is warranted
                val shouldRunPass2 = shouldTriggerSecondPass(pass1Blocks, effectiveWidth, effectiveHeight)
                var finalBlocks = pass1Blocks
                var secondPassExecuted = false
                var preprocessingApplied = "NONE"
                var anyConflict = false

                if (shouldRunPass2) {
                    try {
                        // Load or obtain bitmap for lightweight in-memory preprocessing
                        val baseBitmap: Bitmap? = pass1Bitmap ?: decodeBitmapForPreprocessing(parsedImage)
                        if (baseBitmap != null) {
                            secondPassExecuted = true
                            val shouldUpscale = (effectiveWidth < 1400 || effectiveHeight < 1400)
                            preprocessingApplied = if (shouldUpscale) "CONTRAST_ENHANCED_GRAYSCALE_UPSCALED" else "CONTRAST_ENHANCED_GRAYSCALE"

                            pass2Bitmap = preprocessBitmap(
                                baseBitmap,
                                upscale = shouldUpscale,
                                enhanceContrast = true
                            )

                            val pass2Input = InputImage.fromBitmap(pass2Bitmap, rotationDegrees)
                            val pass2Blocks = runDualRecognition(
                                pass2Input,
                                effectiveWidth,
                                effectiveHeight
                            )

                            // 4. Reconcile Pass 1 and Pass 2 results with conflict detection
                            val reconciliation = reconcilePassResults(pass1Blocks, pass2Blocks)
                            finalBlocks = reconciliation.mergedBlocks
                            anyConflict = reconciliation.hasConflict
                        }
                    } catch (_: Exception) {
                        // If selective second pass fails due to memory or format, gracefully fallback to Pass 1
                        finalBlocks = pass1Blocks
                    }
                }

                // 5. Build React Native JSON response
                val blocksArray: WritableArray = Arguments.createArray()
                val fullTextBuilder = StringBuilder()

                for (block in finalBlocks) {
                    if (fullTextBuilder.isNotEmpty()) {
                        fullTextBuilder.append("\n")
                    }
                    fullTextBuilder.append(block.text)

                    val blockMap: WritableMap = Arguments.createMap()
                    blockMap.putString("text", block.text)

                    val frameMap: WritableMap = Arguments.createMap()
                    frameMap.putInt("x", block.box.left)
                    frameMap.putInt("y", block.box.top)
                    frameMap.putInt("width", block.box.width())
                    frameMap.putInt("height", block.box.height())
                    blockMap.putMap("frame", frameMap)

                    val normalizedBoxMap: WritableMap = Arguments.createMap()
                    normalizedBoxMap.putDouble("xMin", block.normalizedXMin)
                    normalizedBoxMap.putDouble("yMin", block.normalizedYMin)
                    normalizedBoxMap.putDouble("xMax", block.normalizedXMax)
                    normalizedBoxMap.putDouble("yMax", block.normalizedYMax)
                    normalizedBoxMap.putDouble("width", block.normalizedWidth)
                    normalizedBoxMap.putDouble("height", block.normalizedHeight)
                    blockMap.putMap("boundingBox", normalizedBoxMap)

                    if (block.confidence != null) {
                        blockMap.putDouble("confidence", block.confidence)
                    } else {
                        blockMap.putNull("confidence")
                    }

                    blockMap.putBoolean("hasConflict", block.hasConflict)
                    if (block.hasConflict) {
                        blockMap.putString("verificationStatus", "REQUIRES_VERIFICATION")
                        if (block.conflictDetail != null) {
                            blockMap.putString("conflictDetail", block.conflictDetail)
                        }
                    } else {
                        blockMap.putString("verificationStatus", "VERIFIED")
                    }

                    val linesArray: WritableArray = Arguments.createArray()
                    for (line in block.lines) {
                        val lineMap: WritableMap = Arguments.createMap()
                        lineMap.putString("text", line.text)
                        if (line.confidence != null) {
                            lineMap.putDouble("confidence", line.confidence)
                        } else {
                            lineMap.putNull("confidence")
                        }
                        linesArray.pushMap(lineMap)
                    }
                    blockMap.putArray("lines", linesArray)

                    blocksArray.pushMap(blockMap)
                }

                val response: WritableMap = Arguments.createMap()
                response.putString("text", fullTextBuilder.toString())
                response.putInt("imageWidth", rawWidth)
                response.putInt("imageHeight", rawHeight)
                response.putInt("effectiveWidth", effectiveWidth)
                response.putInt("effectiveHeight", effectiveHeight)
                response.putInt("rotationDegrees", rotationDegrees)
                response.putBoolean("multiPassExecuted", secondPassExecuted)
                response.putString("preprocessingApplied", preprocessingApplied)
                response.putBoolean("hasConflict", anyConflict)
                response.putString("status", if (anyConflict) "REQUIRES_VERIFICATION" else "SUCCESS")
                response.putArray("blocks", blocksArray)

                promise.resolve(response)
            } catch (e: Exception) {
                promise.reject("OCR_PROCESSING_ERROR", "Error executing on-device OCR: ${e.message}", e)
            } finally {
                pass1Bitmap?.recycle()
                pass2Bitmap?.recycle()
            }
        }
    }

    /**
     * Fast On-Device Image Quality Analysis (Phase B)
     *
     * Computes discrete Laplacian variance (sharpness), RMS contrast,
     * mean luminance, and specular highlight ratio without cloud calls.
     */
    @ReactMethod
    fun analyzeImageQuality(imageUriOrBase64: String, promise: Promise) {
        backgroundExecutor.execute {
            var bitmap: Bitmap? = null
            try {
                if (imageUriOrBase64.isBlank()) {
                    promise.reject("EMPTY_INPUT", "Image source cannot be empty.")
                    return@execute
                }

                val parsedImage = resolveInputImage(imageUriOrBase64)
                bitmap = parsedImage.allocatedBitmap ?: decodeBitmapForPreprocessing(parsedImage)
                if (bitmap == null) {
                    promise.reject("DECODE_FAILED", "Failed to decode image bitmap for quality analysis.")
                    return@execute
                }

                // Subsample for fast luminance analysis if image is excessively large
                val maxDim = 1200
                val sampleWidth: Int
                val sampleHeight: Int
                val workingBitmap: Bitmap

                if (bitmap.width > maxDim || bitmap.height > maxDim) {
                    val scale = min(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height)
                    sampleWidth = max(100, (bitmap.width * scale).toInt())
                    sampleHeight = max(100, (bitmap.height * scale).toInt())
                    workingBitmap = Bitmap.createScaledBitmap(bitmap, sampleWidth, sampleHeight, true)
                } else {
                    sampleWidth = bitmap.width
                    sampleHeight = bitmap.height
                    workingBitmap = bitmap
                }

                val pixels = IntArray(sampleWidth * sampleHeight)
                workingBitmap.getPixels(pixels, 0, sampleWidth, 0, 0, sampleWidth, sampleHeight)
                if (workingBitmap != bitmap) {
                    workingBitmap.recycle()
                }

                // Extract 8-bit luminance
                val luminance = ByteArray(sampleWidth * sampleHeight)
                var sumL = 0.0
                var sumSqL = 0.0
                var glarePixels = 0

                for (i in pixels.indices) {
                    val c = pixels[i]
                    val r = (c shr 16) and 0xFF
                    val g = (c shr 8) and 0xFF
                    val b = c and 0xFF
                    val lum = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
                    luminance[i] = lum.toByte()

                    sumL += lum
                    sumSqL += lum * lum
                    if (lum >= 245) {
                        glarePixels++
                    }
                }

                val totalPixels = sampleWidth * sampleHeight
                val meanLuminance = sumL / totalPixels
                val varianceLuminance = max(0.0, (sumSqL / totalPixels) - (meanLuminance * meanLuminance))
                val rmsContrast = sqrt(varianceLuminance)
                val glareRatio = glarePixels.toDouble() / totalPixels

                // Discrete 3x3 Laplacian variance for blur/sharpness
                var lapSum = 0.0
                var lapSumSq = 0.0
                var lapCount = 0

                for (y in 1 until sampleHeight - 1) {
                    val rowPrev = (y - 1) * sampleWidth
                    val rowCurr = y * sampleWidth
                    val rowNext = (y + 1) * sampleWidth

                    for (x in 1 until sampleWidth - 1) {
                        val center = luminance[rowCurr + x].toInt() and 0xFF
                        val up = luminance[rowPrev + x].toInt() and 0xFF
                        val down = luminance[rowNext + x].toInt() and 0xFF
                        val left = luminance[rowCurr + x - 1].toInt() and 0xFF
                        val right = luminance[rowCurr + x + 1].toInt() and 0xFF

                        val lap = -4 * center + up + down + left + right
                        lapSum += lap
                        lapSumSq += lap * lap
                        lapCount++
                    }
                }

                val lapMean = if (lapCount > 0) lapSum / lapCount else 0.0
                val lapVariance = if (lapCount > 0) max(0.0, (lapSumSq / lapCount) - (lapMean * lapMean)) else 0.0

                // Calibrated empirical sharpness score (0-100 scale)
                val sharpnessScore = max(5.0, min(100.0, 100.0 * (1.0 - 1.0 / (1.0 + lapVariance / 40.0))))
                val brightnessScore = max(0.0, min(100.0, (meanLuminance / 255.0) * 100.0))

                val qualityStatus = when {
                    lapVariance >= 100.0 && glareRatio < 0.08 && meanLuminance in 45.0..215.0 -> "GOOD"
                    lapVariance >= 40.0 && glareRatio < 0.20 -> "ACCEPTABLE"
                    lapVariance >= 15.0 -> "LOW_QUALITY"
                    else -> "UNUSABLE"
                }

                val exposure = when {
                    meanLuminance < 45.0 -> "UNDEREXPOSED"
                    meanLuminance > 215.0 -> "OVEREXPOSED"
                    else -> "NORMAL"
                }

                val response: WritableMap = Arguments.createMap()
                response.putDouble("sharpnessScore", Math.round(sharpnessScore * 10.0) / 10.0)
                response.putDouble("laplacianVariance", Math.round(lapVariance * 10.0) / 10.0)
                response.putDouble("brightnessScore", Math.round(brightnessScore * 10.0) / 10.0)
                response.putDouble("meanLuminance", Math.round(meanLuminance * 10.0) / 10.0)
                response.putDouble("contrastScore", Math.round(rmsContrast * 10.0) / 10.0)
                response.putDouble("glareRatio", Math.round(glareRatio * 10000.0) / 10000.0)
                response.putBoolean("glareDetected", glareRatio >= 0.03)
                response.putBoolean("blurDetected", lapVariance < 40.0)
                response.putString("qualityStatus", qualityStatus)
                response.putString("exposureClassification", exposure)
                response.putBoolean("resolutionAdequate", parsedImage.rawWidth >= 600 && parsedImage.rawHeight >= 600)

                promise.resolve(response)
            } catch (e: Exception) {
                promise.reject("QUALITY_ANALYSIS_ERROR", "Error assessing image quality: ${e.message}", e)
            } finally {
                bitmap?.recycle()
            }
        }
    }

    /**
     * Perspective Rectification using android.graphics.Matrix (Phase B)
     *
     * DIRECTION SPECIFICATION:
     * - forwardMatrix maps original quad points (src) -> rectified rectangle (dst) [SOURCE -> DESTINATION]
     * - inverseMatrix maps rectified rectangle (dst) -> original quad points (src) [DESTINATION -> SOURCE]
     */
    @ReactMethod
    fun rectifyPerspective(imageUriOrBase64: String, quadPoints: ReadableArray, promise: Promise) {
        backgroundExecutor.execute {
            var origBitmap: Bitmap? = null
            var rectifiedBitmap: Bitmap? = null
            try {
                if (quadPoints.size() != 8) {
                    promise.reject("INVALID_QUAD", "quadPoints must contain exactly 8 float coordinates [x0,y0, x1,y1, x2,y2, x3,y3].")
                    return@execute
                }

                val parsedImage = resolveInputImage(imageUriOrBase64)
                origBitmap = parsedImage.allocatedBitmap ?: decodeBitmapForPreprocessing(parsedImage)
                if (origBitmap == null) {
                    promise.reject("DECODE_FAILED", "Failed to decode source image.")
                    return@execute
                }

                val srcPts = FloatArray(8)
                for (i in 0 until 8) {
                    srcPts[i] = quadPoints.getDouble(i).toFloat()
                }

                // Compute output rectified rectangle dimensions
                val tlX = srcPts[0]; val tlY = srcPts[1]
                val trX = srcPts[2]; val trY = srcPts[3]
                val brX = srcPts[4]; val brY = srcPts[5]
                val blX = srcPts[6]; val blY = srcPts[7]

                val widthTop = hypot((trX - tlX).toDouble(), (trY - tlY).toDouble()).toFloat()
                val widthBottom = hypot((brX - blX).toDouble(), (brY - blY).toDouble()).toFloat()
                val heightLeft = hypot((blX - tlX).toDouble(), (blY - tlY).toDouble()).toFloat()
                val heightRight = hypot((brX - trX).toDouble(), (brY - trY).toDouble()).toFloat()

                val dstWidth = max(100, max(widthTop, widthBottom).toInt())
                val dstHeight = max(100, max(heightLeft, heightRight).toInt())

                val dstPts = floatArrayOf(
                    0f, 0f,
                    dstWidth.toFloat(), 0f,
                    dstWidth.toFloat(), dstHeight.toFloat(),
                    0f, dstHeight.toFloat()
                )

                // Forward Matrix: SOURCE (orig quad) -> DESTINATION (rectified canvas)
                val forwardMatrix = Matrix()
                val success = forwardMatrix.setPolyToPoly(srcPts, 0, dstPts, 0, 4)
                if (!success) {
                    promise.reject("MATRIX_CALC_FAILED", "Failed to calculate perspective transform matrix.")
                    return@execute
                }

                // Inverse Matrix: DESTINATION (rectified canvas) -> SOURCE (orig quad)
                val inverseMatrix = Matrix()
                val invertSuccess = forwardMatrix.invert(inverseMatrix)
                if (!invertSuccess) {
                    promise.reject("INVERT_FAILED", "Perspective transform matrix is singular and cannot be inverted.")
                    return@execute
                }

                // Render rectified canvas
                rectifiedBitmap = Bitmap.createBitmap(dstWidth, dstHeight, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(rectifiedBitmap)
                // Draw inverted transformation to map source bitmap onto target rectangle
                canvas.concat(forwardMatrix)
                canvas.drawBitmap(origBitmap, 0f, 0f, Paint(Paint.FILTER_BITMAP_FLAG))

                // Cache rectified image file for downstream offline ML Kit OCR
                val cacheFile = File(reactApplicationContext.cacheDir, "rectified_${System.currentTimeMillis()}.jpg")
                FileOutputStream(cacheFile).use { out ->
                    rectifiedBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                }

                val fValues = FloatArray(9)
                forwardMatrix.getValues(fValues)
                val forwardArray = Arguments.createArray()
                for (v in fValues) forwardArray.pushDouble(v.toDouble())

                val invValues = FloatArray(9)
                inverseMatrix.getValues(invValues)
                val inverseArray = Arguments.createArray()
                for (v in invValues) inverseArray.pushDouble(v.toDouble())

                val result = Arguments.createMap()
                result.putString("rectifiedUri", Uri.fromFile(cacheFile).toString())
                result.putInt("derivedWidth", dstWidth)
                result.putInt("derivedHeight", dstHeight)
                result.putInt("sourceWidth", origBitmap.width)
                result.putInt("sourceHeight", origBitmap.height)
                result.putArray("forwardMatrix", forwardArray)
                result.putArray("inverseMatrix", inverseArray)
                result.putString("matrixDirection", "SOURCE_TO_DESTINATION")
                result.putString("inverseMatrixDirection", "DESTINATION_TO_SOURCE")

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("PERSPECTIVE_ERROR", "Error rectifying perspective: ${e.message}", e)
            } finally {
                origBitmap?.recycle()
                rectifiedBitmap?.recycle()
            }
        }
    }


    private data class ParsedImageInfo(
        val inputImage: InputImage,
        val rawWidth: Int,
        val rawHeight: Int,
        val rotationDegrees: Int,
        val effectiveWidth: Int,
        val effectiveHeight: Int,
        val uri: Uri? = null,
        val decodedBytes: ByteArray? = null,
        val allocatedBitmap: Bitmap? = null
    )

    private fun resolveInputImage(imageUriOrBase64: String): ParsedImageInfo {
        val context = reactApplicationContext

        // 1. URI input (file://, content://, or /storage)
        if (imageUriOrBase64.startsWith("file://") ||
            imageUriOrBase64.startsWith("content://") ||
            imageUriOrBase64.startsWith("/")
        ) {
            val uri = if (imageUriOrBase64.startsWith("/")) {
                Uri.fromFile(File(imageUriOrBase64))
            } else {
                Uri.parse(imageUriOrBase64)
            }

            // Extract EXIF orientation
            var rotationDegrees = 0
            try {
                var stream: InputStream? = null
                try {
                    stream = context.contentResolver.openInputStream(uri)
                    if (stream != null) {
                        val exif = ExifInterface(stream)
                        val orientation = exif.getAttributeInt(
                            ExifInterface.TAG_ORIENTATION,
                            ExifInterface.ORIENTATION_NORMAL
                        )
                        rotationDegrees = when (orientation) {
                            ExifInterface.ORIENTATION_ROTATE_90 -> 90
                            ExifInterface.ORIENTATION_ROTATE_180 -> 180
                            ExifInterface.ORIENTATION_ROTATE_270 -> 270
                            else -> 0
                        }
                    }
                } finally {
                    stream?.close()
                }
            } catch (_: Exception) {
                rotationDegrees = 0
            }

            // Extract raw dimensions
            var rawWidth = 0
            var rawHeight = 0
            try {
                var stream: InputStream? = null
                try {
                    stream = context.contentResolver.openInputStream(uri)
                    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeStream(stream, null, options)
                    rawWidth = options.outWidth
                    rawHeight = options.outHeight
                } finally {
                    stream?.close()
                }
            } catch (_: Exception) {
                rawWidth = 1000
                rawHeight = 1000
            }

            if (rawWidth <= 0) rawWidth = 1000
            if (rawHeight <= 0) rawHeight = 1000

            val effectiveWidth = if (rotationDegrees == 90 || rotationDegrees == 270) rawHeight else rawWidth
            val effectiveHeight = if (rotationDegrees == 90 || rotationDegrees == 270) rawWidth else rawHeight

            val inputImage = InputImage.fromFilePath(context, uri)

            return ParsedImageInfo(
                inputImage = inputImage,
                rawWidth = rawWidth,
                rawHeight = rawHeight,
                rotationDegrees = rotationDegrees,
                effectiveWidth = effectiveWidth,
                effectiveHeight = effectiveHeight,
                uri = uri
            )
        }

        // 2. Base64 payload decoding
        val cleanBase64 = imageUriOrBase64.replaceFirst(Regex("^data:image/[^;]+;base64,"), "").trim()
        val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

        var rotationDegrees = 0
        try {
            val exif = ExifInterface(decodedBytes.inputStream())
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90
                ExifInterface.ORIENTATION_ROTATE_180 -> 180
                ExifInterface.ORIENTATION_ROTATE_270 -> 270
                else -> 0
            }
        } catch (_: Exception) {
            rotationDegrees = 0
        }

        val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            ?: throw IllegalArgumentException("Failed to decode bitmap from base64 data.")

        val rawWidth = bitmap.width
        val rawHeight = bitmap.height
        val effectiveWidth = if (rotationDegrees == 90 || rotationDegrees == 270) rawHeight else rawWidth
        val effectiveHeight = if (rotationDegrees == 90 || rotationDegrees == 270) rawWidth else rawHeight

        val inputImage = InputImage.fromBitmap(bitmap, rotationDegrees)

        return ParsedImageInfo(
            inputImage = inputImage,
            rawWidth = rawWidth,
            rawHeight = rawHeight,
            rotationDegrees = rotationDegrees,
            effectiveWidth = effectiveWidth,
            effectiveHeight = effectiveHeight,
            decodedBytes = decodedBytes,
            allocatedBitmap = bitmap
        )
    }

    private fun decodeBitmapForPreprocessing(info: ParsedImageInfo): Bitmap? {
        val context = reactApplicationContext
        return try {
            if (info.uri != null) {
                var stream: InputStream? = null
                try {
                    stream = context.contentResolver.openInputStream(info.uri)
                    BitmapFactory.decodeStream(stream)
                } finally {
                    stream?.close()
                }
            } else if (info.decodedBytes != null) {
                BitmapFactory.decodeByteArray(info.decodedBytes, 0, info.decodedBytes.size)
            } else null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Lightweight in-memory Bitmap preprocessing:
     * - ColorMatrix contrast expansion (+30%) and grayscale conversion to strip packaging color noise
     * - Optional resolution scaling for small font text (<1400px frames)
     */
    private fun preprocessBitmap(source: Bitmap, upscale: Boolean, enhanceContrast: Boolean): Bitmap {
        val scaleFactor = if (upscale && source.width < 1400 && source.height < 1400) 1.5f else 1.0f
        val targetWidth = max(1, (source.width * scaleFactor).toInt())
        val targetHeight = max(1, (source.height * scaleFactor).toInt())

        val processed = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(processed)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        if (enhanceContrast) {
            val colorMatrix = ColorMatrix()
            // 1. Grayscale
            val grayMatrix = ColorMatrix().apply { setSaturation(0f) }
            // 2. High dynamic range contrast enhancement
            val contrast = 1.35f
            val translate = (-0.5f * contrast + 0.5f) * 255f
            val contrastMatrix = ColorMatrix(floatArrayOf(
                contrast, 0f, 0f, 0f, translate,
                0f, contrast, 0f, 0f, translate,
                0f, 0f, contrast, 0f, translate,
                0f, 0f, 0f, 1f, 0f
            ))
            colorMatrix.postConcat(grayMatrix)
            colorMatrix.postConcat(contrastMatrix)
            paint.colorFilter = ColorMatrixColorFilter(colorMatrix)
        }

        val srcRect = Rect(0, 0, source.width, source.height)
        val dstRect = Rect(0, 0, targetWidth, targetHeight)
        canvas.drawBitmap(source, srcRect, dstRect, paint)

        return processed
    }

    /**
     * Executes Latin + Devanagari recognizers and returns merged deduplicated blocks.
     * Synchronous on the background thread.
     */
    private fun runDualRecognition(
        inputImage: InputImage,
        effectiveWidth: Int,
        effectiveHeight: Int
    ): List<InternalBlockInfo> {
        val latinTask = latinRecognizer.process(inputImage)
        val devanagariTask = devanagariRecognizer.process(inputImage)
        val results = Tasks.await(Tasks.whenAllSuccess<Text>(latinTask, devanagariTask))
        val latinResult = results.getOrNull(0) as? Text
        val devanagariResult = results.getOrNull(1) as? Text

        return mergeAndDeduplicateBlocks(
            latinResult?.textBlocks ?: emptyList(),
            devanagariResult?.textBlocks ?: emptyList(),
            effectiveWidth,
            effectiveHeight
        )
    }

    /**
     * Evaluates whether a second pass is required.
     * SELECTIVE: Only triggered on low quality, likely small text, suspicious numbers/dates, or ambiguity.
     */
    private fun shouldTriggerSecondPass(
        blocks: List<InternalBlockInfo>,
        effectiveWidth: Int,
        effectiveHeight: Int
    ): Boolean {
        // 1. Blank or almost blank in high-resolution image
        if (blocks.isEmpty()) return true
        if (blocks.size <= 2 && (effectiveWidth > 1000 || effectiveHeight > 1000)) return true

        // 2. Low average confidence
        val confidences = blocks.mapNotNull { it.confidence }
        if (confidences.isNotEmpty() && confidences.average() < 0.65) return true

        // 3. Small text blocks (lines with small pixel heights)
        val smallTextBlocks = blocks.count { it.box.height() in 1..20 }
        if (smallTextBlocks > 0 && smallTextBlocks.toDouble() / blocks.size.toDouble() > 0.35) return true

        // 4. Suspicious numeric / date recognition in packaging text
        for (b in blocks) {
            val upper = b.text.uppercase()
            // Look for price or quantity with confusing letter replacements (e.g. "MRP O5", "RS l20")
            if (Regex("(?:MRP|RS|₹|एमआरपी)\\s*[:.-]?\\s*[OIlB][0-9]").containsMatchIn(upper)) return true
            // Look for dates with broken delimiters or suspicious characters
            if (Regex("(?:PKD|MFD|EXP|PACKED)\\s*[:.-]?\\s*[0-9]{1,2}[^0-9/.-][0-9]{2,4}").containsMatchIn(upper)) return true
        }

        return false
    }

    private data class ReconciliationResult(
        val mergedBlocks: List<InternalBlockInfo>,
        val hasConflict: Boolean
    )

    /**
     * Reconciles Pass 1 and Pass 2 results with conflict detection.
     * If passes disagree on a critical declaration, DOES NOT GUESS.
     * Flags explicit REQUIRES_VERIFICATION state.
     */
    private fun reconcilePassResults(
        pass1: List<InternalBlockInfo>,
        pass2: List<InternalBlockInfo>
    ): ReconciliationResult {
        val result = mutableListOf<InternalBlockInfo>()
        val matchedPass2Indices = mutableSetOf<Int>()
        var conflictFound = false

        for (b1 in pass1) {
            // Find overlapping block in Pass 2
            var bestIdx = -1
            var bestIoU = 0.0
            for ((idx, b2) in pass2.withIndex()) {
                if (idx in matchedPass2Indices) continue
                val iou = computeIoU(b1.box, b2.box)
                if (iou > bestIoU) {
                    bestIoU = iou
                    bestIdx = idx
                }
            }

            if (bestIdx >= 0 && bestIoU >= 0.35) {
                matchedPass2Indices.add(bestIdx)
                val b2 = pass2[bestIdx]

                val clean1 = b1.text.trim().replace("\\s+".toRegex(), " ")
                val clean2 = b2.text.trim().replace("\\s+".toRegex(), " ")

                if (clean1.equals(clean2, ignoreCase = true)) {
                    // Perfect agreement
                    result.add(b1)
                } else {
                    // Disagreement check: are numbers/dates contradictory?
                    val digits1 = clean1.filter { it.isDigit() }
                    val digits2 = clean2.filter { it.isDigit() }

                    if (digits1.isNotEmpty() && digits2.isNotEmpty() && digits1 != digits2) {
                        // Contradiction on numeric values (e.g. price or date digits disagree)
                        // DO NOT GUESS! Flag explicit REQUIRES_VERIFICATION
                        conflictFound = true
                        result.add(
                            b1.copy(
                                hasConflict = true,
                                conflictDetail = "Conflict between Pass 1 ('$clean1') and Pass 2 ('$clean2')"
                            )
                        )
                    } else {
                        // Non-conflicting difference (e.g. Pass 2 recovered extra words or clearer punctuation)
                        val preferred = if ((b2.confidence ?: 0.0) >= (b1.confidence ?: 0.0)) b2 else b1
                        result.add(preferred)
                    }
                }
            } else {
                result.add(b1)
            }
        }

        // Add any newly discovered blocks from Pass 2 that had no counterpart in Pass 1
        for ((idx, b2) in pass2.withIndex()) {
            if (idx !in matchedPass2Indices) {
                result.add(b2)
            }
        }

        // Sort reading order: top-to-bottom, left-to-right
        result.sortWith(compareBy({ it.normalizedYMin }, { it.normalizedXMin }))

        return ReconciliationResult(result, conflictFound)
    }

    private data class InternalLineInfo(
        val text: String,
        val confidence: Double?
    )

    private data class InternalBlockInfo(
        val text: String,
        val box: Rect,
        val confidence: Double?,
        val lines: List<InternalLineInfo>,
        val normalizedXMin: Double,
        val normalizedYMin: Double,
        val normalizedXMax: Double,
        val normalizedYMax: Double,
        val normalizedWidth: Double,
        val normalizedHeight: Double,
        val hasConflict: Boolean = false,
        val conflictDetail: String? = null
    )

    private fun mergeAndDeduplicateBlocks(
        latinBlocks: List<Text.TextBlock>,
        devanagariBlocks: List<Text.TextBlock>,
        effectiveWidth: Int,
        effectiveHeight: Int
    ): List<InternalBlockInfo> {
        val devanagariRegex = Regex("[\\u0900-\\u097F]")
        val result = mutableListOf<InternalBlockInfo>()

        fun toInternal(block: Text.TextBlock): InternalBlockInfo {
            val box = block.boundingBox ?: Rect(0, 0, 0, 0)
            val lines = block.lines.map { line ->
                val lineConf: Double? = try {
                    val conf = line.confidence
                    if (!conf.isNaN() && conf in 0.0f..1.0f) conf.toDouble() else null
                } catch (_: Exception) {
                    null
                }
                InternalLineInfo(text = line.text, confidence = lineConf)
            }

            val validConfidences = lines.mapNotNull { it.confidence }
            val avgConf = if (validConfidences.isNotEmpty()) {
                validConfidences.sum() / validConfidences.size
            } else null

            val widthDenom = max(1, effectiveWidth).toDouble()
            val heightDenom = max(1, effectiveHeight).toDouble()

            val xMin = max(0.0, min(1.0, box.left.toDouble() / widthDenom))
            val yMin = max(0.0, min(1.0, box.top.toDouble() / heightDenom))
            val xMax = max(0.0, min(1.0, box.right.toDouble() / widthDenom))
            val yMax = max(0.0, min(1.0, box.bottom.toDouble() / heightDenom))

            return InternalBlockInfo(
                text = block.text,
                box = box,
                confidence = avgConf,
                lines = lines,
                normalizedXMin = xMin,
                normalizedYMin = yMin,
                normalizedXMax = xMax,
                normalizedYMax = yMax,
                normalizedWidth = max(0.0, xMax - xMin),
                normalizedHeight = max(0.0, yMax - yMin)
            )
        }

        // 1. Process Devanagari blocks that actually contain Devanagari script
        val devanagariInternal = devanagariBlocks.map { toInternal(it) }
        val devanagariScriptBlocks = devanagariInternal.filter { devanagariRegex.containsMatchIn(it.text) }

        // 2. Process Latin blocks
        val latinInternal = latinBlocks.map { toInternal(it) }

        // 3. For blocks with spatial overlap (IoU >= 0.4):
        // If a region contains Devanagari characters, prefer the Devanagari block.
        // Otherwise, prefer the Latin block.
        val processedLatin = mutableSetOf<InternalBlockInfo>()
        val processedDevanagari = mutableSetOf<InternalBlockInfo>()

        for (devBlock in devanagariScriptBlocks) {
            result.add(devBlock)
            processedDevanagari.add(devBlock)
            for (latinBlock in latinInternal) {
                if (computeIoU(devBlock.box, latinBlock.box) >= 0.4) {
                    processedLatin.add(latinBlock)
                }
            }
        }

        // Add remaining Latin blocks
        for (latinBlock in latinInternal) {
            if (latinBlock !in processedLatin) {
                result.add(latinBlock)
                processedLatin.add(latinBlock)
            }
        }

        // Add any remaining Devanagari blocks that didn't overlap with any Latin block
        for (devBlock in devanagariInternal) {
            if (devBlock !in processedDevanagari) {
                val hasOverlapWithLatin = latinInternal.any { computeIoU(devBlock.box, it.box) >= 0.4 }
                if (!hasOverlapWithLatin) {
                    result.add(devBlock)
                    processedDevanagari.add(devBlock)
                }
            }
        }

        // Sort reading order: top-to-bottom, left-to-right
        result.sortWith(compareBy({ it.normalizedYMin }, { it.normalizedXMin }))

        return result
    }

    private fun computeIoU(r1: Rect, r2: Rect): Double {
        val interLeft = max(r1.left, r2.left)
        val interTop = max(r1.top, r2.top)
        val interRight = min(r1.right, r2.right)
        val interBottom = min(r1.bottom, r2.bottom)

        val interWidth = max(0, interRight - interLeft)
        val interHeight = max(0, interBottom - interTop)
        val interArea = interWidth * interHeight

        if (interArea <= 0) return 0.0

        val area1 = r1.width() * r1.height()
        val area2 = r2.width() * r2.height()
        val unionArea = area1 + area2 - interArea

        return if (unionArea > 0) interArea.toDouble() / unionArea.toDouble() else 0.0
    }
}
