import type { Declaration, TextRegion } from '@lm-vision/shared-types';

/**
 * Mock Declaration Engine: Converts detected text regions into canonical
 * mandatory declarations under Packaged Commodities rules.
 */
export function extractMockDeclarations(regions: TextRegion[]): Declaration[] {
  const findRegion = (id: string): TextRegion | undefined => regions.find((r) => r.id === id);

  const genericRegion = findRegion('region-generic-name');
  const netQtyRegion = findRegion('region-net-qty');
  const mrpRegion = findRegion('region-mrp');
  const mfrRegion = findRegion('region-mfr');
  const careRegion = findRegion('region-care');
  const dateRegion = findRegion('region-date');

  return [
    {
      type: 'GENERIC_NAME',
      rawText: genericRegion?.text || 'Anti-Dandruff Shampoo with Tea Tree Oil',
      normalizedValue: 'Shampoo',
      unit: null,
      confidence: 0.98,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: genericRegion,
    },
    {
      type: 'NET_QUANTITY',
      rawText: netQtyRegion?.text || 'Net Vol. 500 ml',
      normalizedValue: 500,
      unit: 'ml',
      confidence: 0.96,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: netQtyRegion,
    },
    {
      type: 'MRP',
      rawText: mrpRegion?.text || 'MRP Rs. 249.00 (Inclusive of all taxes)',
      normalizedValue: 249,
      unit: 'INR',
      confidence: 0.95,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: mrpRegion,
    },
    {
      type: 'MANUFACTURER_NAME_ADDRESS',
      rawText: mfrRegion?.text || 'Manufactured by: ABC Consumer Goods Pvt Ltd, Plot 42, Industrial Area, Solan, HP 173205',
      normalizedValue: 'ABC Consumer Goods Pvt Ltd',
      unit: null,
      confidence: 0.92,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: mfrRegion,
    },
    {
      type: 'CONSUMER_CARE_DETAILS',
      rawText: careRegion?.text || 'For consumer feedback or queries write to: care@abcgoods.com',
      normalizedValue: 'care@abcgoods.com',
      unit: null,
      confidence: 0.88,
      isFormatStandard: false,
      detectedLanguage: 'en',
      region: careRegion,
    },
    {
      type: 'DATE_OF_PACKAGING',
      rawText: dateRegion?.text || 'Pkd: 08/2026',
      normalizedValue: '2026-08-01',
      unit: null,
      confidence: 0.91,
      isFormatStandard: true,
      detectedLanguage: 'en',
      region: dateRegion,
    },
  ];
}
