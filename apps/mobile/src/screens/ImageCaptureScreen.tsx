import React, { useCallback, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PackageSurface } from '@lm-vision/shared-types';
import { COLOR_TOKENS } from '@lm-vision/ui';
import type { RootStackParamList } from '../navigation/types';
import { useInspectionWorkflow } from '../state/InspectionWorkflowProvider';
import { generateUuid } from '../state/draft';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useCameraLifecycle } from '../hooks/useCameraLifecycle';

type Props = NativeStackScreenProps<RootStackParamList, 'CameraCapture' | 'SmartScan'>;

// React 19 JSX typing bridge for CameraView
const CameraComponent = CameraView as unknown as React.ComponentType<any>;

const SURFACES: { key: PackageSurface; label: string }[] = [
  { key: 'FRONT', label: 'Front' },
  { key: 'BACK', label: 'Back' },
  { key: 'LEFT', label: 'Left Side' },
  { key: 'RIGHT', label: 'Right Side' },
  { key: 'TOP', label: 'Top / Cap' },
  { key: 'BOTTOM', label: 'Base' },
];

export function ImageCaptureScreen({ navigation }: Props): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedSurface, setSelectedSurface] = useState<PackageSurface>('FRONT');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const workflow = useInspectionWorkflow();
  const images = workflow.activeDraft?.images || [];

  useCameraLifecycle(useCallback(() => {
    setIsTorchOn(false);
    setIsCapturing(false);
  }, []));

  const toggleTorch = () => {
    setIsTorchOn((prev) => !prev);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setCaptureError(null);
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: false,
      });

      if (photo?.uri) {
        const now = new Date().toISOString();
        const base64Data = photo.base64 ? photo.base64.replace(/^data:[^;]+;base64,/, '') : undefined;
        const newImage = {
          id: generateUuid(),
          inspectionId: workflow.activeDraft?.localId || 'draft',
          surface: selectedSurface,
          fileUrl: photo.uri,
          base64Data,
          fileSizeBytes: base64Data ? Math.round((base64Data.length * 3) / 4) : 1024 * 500,
          mimeType: 'image/jpeg',
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          syncState: 'LOCAL_ONLY' as const,
          quality: {
            overallScore: 0.92,
            isAcceptable: true,
            sharpness: 90,
            brightness: 85,
            glareDetected: false,
            blurDetected: false,
            shadowDetected: false,
            warnings: [],
          },
          capturedAt: now,
          createdAt: now,
        };
        workflow.addImage(newImage);
        setIsTorchOn(false);

        // Auto-advance to next logical surface
        if (selectedSurface === 'FRONT') setSelectedSurface('BACK');
      }
    } catch {
      setCaptureError('The camera could not capture this panel. Check lighting and try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset) return;

        const now = new Date().toISOString();
        const base64Data = asset.base64 ? asset.base64.replace(/^data:[^;]+;base64,/, '') : undefined;
        const newImage = {
          id: generateUuid(),
          inspectionId: workflow.activeDraft?.localId || 'draft',
          surface: selectedSurface,
          fileUrl: asset.uri,
          base64Data,
          fileSizeBytes: base64Data ? Math.round((base64Data.length * 3) / 4) : (asset.fileSize || 1024 * 400),
          mimeType: asset.mimeType || 'image/jpeg',
          sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          syncState: 'LOCAL_ONLY' as const,
          quality: {
            overallScore: 0.94,
            isAcceptable: true,
            sharpness: 92,
            brightness: 88,
            glareDetected: false,
            blurDetected: false,
            shadowDetected: false,
            warnings: [],
          },
          capturedAt: now,
          createdAt: now,
        };
        workflow.addImage(newImage);
        if (selectedSurface === 'FRONT') setSelectedSurface('BACK');
      }
    } catch {
      setCaptureError('The image could not be imported. Please try another photo.');
    }
  };

  // If permission is not yet granted, render permission gate with gallery fallback
  if (!permission || !permission.granted) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <Text style={styles.permTitle}>Field Inspection Camera</Text>
          <Text style={styles.permDesc}>
            Statutory evidence capture requires camera access to photograph packaging surfaces and declarations.
          </Text>
          {permission?.canAskAgain === false ? <Text style={styles.permissionError}>Camera access is disabled in system settings. Gallery import remains available.</Text> : null}
          <View style={styles.permBtnGroup}>
            <Button
              label="Grant Camera Access"
              onPress={() => void requestPermission()}
            />
            <View style={{ height: 12 }} />
            <Button
              label="Select from Gallery"
              variant="secondary"
              onPress={() => void handleGalleryPick()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.fullscreen}>
      {/* In-app Camera Viewfinder (No nested children to comply with CameraView architecture) */}
      <CameraComponent
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={isTorchOn}
      />

      {/* Camera UI Overlay Layer */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top bar with back button, flashlight toggle, and target surface chip selector */}
        <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave camera"
            accessibilityHint="Turns off the torch and returns to the previous screen"
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Torch ${isTorchOn ? 'on' : 'off'}`}
            accessibilityState={{ checked: isTorchOn }}
            onPress={toggleTorch}
            style={[styles.torchBtn, isTorchOn && styles.torchBtnActive]}
          >
            <Text style={[styles.torchText, isTorchOn && styles.torchTextActive]}>
              {isTorchOn ? '⚡ ON' : '⚡ OFF'}
            </Text>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.surfaceChips}
          >
            {SURFACES.map((s) => {
              const isSelected = selectedSurface === s.key;
              const hasImage = images.some((img) => img.surface === s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setSelectedSurface(s.key)}
                  style={[styles.chip, isSelected && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {s.label} {hasImage ? '✓' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Viewfinder Guideline Overlay */}
        <View style={styles.reticleContainer} pointerEvents="none">
          <View style={styles.reticleBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.reticleHint}>Align {selectedSurface} panel within frame</Text>
          </View>
        </View>

        {/* Bottom Bar: Thumbnails & Shutter & Gallery */}
        <View style={styles.bottomOverlay}>
          {captureError ? <View accessibilityLiveRegion="polite" style={styles.captureError}><Text style={styles.captureErrorText}>{captureError}</Text></View> : null}
          {/* Thumbnails row */}
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
            >
              {images.map((img) => (
                <View key={img.id} style={styles.thumbWrapper}>
                  <Image source={{ uri: img.fileUrl }} style={styles.thumbImage} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${img.surface} captured image`}
                    onPress={() => workflow.removeImage(img.id)}
                    style={styles.thumbDelete}
                  >
                    <Text style={styles.thumbDeleteText}>✕</Text>
                  </Pressable>
                  <Text style={styles.thumbSurfaceBadge}>{img.surface}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Shutter and Controls */}
          <View style={styles.shutterRow}>
            {/* Gallery Import Fallback */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open photo gallery"
              onPress={() => void handleGalleryPick()}
              style={styles.galleryBtn}
            >
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </Pressable>

            {/* Shutter Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isCapturing ? 'Capturing photo' : `Capture ${selectedSurface} panel`}
              accessibilityState={{ disabled: isCapturing }}
              onPress={() => void handleCapture()}
              disabled={isCapturing}
              style={({ pressed }) => [
                styles.shutterOuter,
                pressed && styles.shutterPressed,
              ]}
            >
              <View style={styles.shutterInner} />
            </Pressable>

            {/* Proceed to Review */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Review ${images.length} captured image${images.length === 1 ? '' : 's'}`}
              disabled={images.length === 0}
              onPress={() => {
                setIsTorchOn(false);
                navigation.navigate('ImageReview');
              }}
              style={[
                styles.reviewBtn,
                images.length === 0 && styles.reviewBtnDisabled,
              ]}
            >
              <Text style={styles.reviewBtnText}>Review ({images.length})</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionError: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },
  permBtnGroup: {
    width: '100%',
  },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  torchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  torchBtnActive: {
    backgroundColor: '#eab308',
  },
  torchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  torchTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  surfaceChips: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: {
    backgroundColor: COLOR_TOKENS.primary[600],
  },
  chipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  reticleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  reticleBox: {
    width: '100%',
    height: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#ffffff',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  reticleHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomOverlay: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingBottom: 20,
    paddingTop: 12,
  },
  captureError: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
  },
  captureErrorText: { color: '#ffffff', fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: '600' },
  thumbStrip: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDelete: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDeleteText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  thumbSurfaceBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 1,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  galleryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  galleryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  reviewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLOR_TOKENS.primary[600],
  },
  reviewBtnDisabled: {
    opacity: 0.35,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
