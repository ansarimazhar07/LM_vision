import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { createAiEngineServer } from '../services/ai-engine/src/server.js';
import { inspectionStore } from '../services/ai-engine/src/storage/inspectionStore.js';

describe('Real-Time Sync Integration & Resilient Fallback Endpoints', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    server = createAiEngineServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
          baseUrl = `http://127.0.0.1:${port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/v1/sync/status returns online sync status and LAN endpoint info', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sync/status`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ONLINE');
    expect(json.data.lanEndpoint).toBe('http://10.60.111.108:3001');
    expect(typeof json.data.totalInspections).toBe('number');
  });

  it('POST /api/v1/dashboard/sync receives mobile draft and updates store', async () => {
    const testDraft = {
      localId: 'SYNC-TEST-001',
      productName: 'Instant Masala Noodles 70g',
      brandName: 'NoodleChef',
      category: 'COMMODITY',
      status: 'DECIDED',
      declarations: [
        {
          id: 'dec-1',
          field: 'declarations.NET_QUANTITY',
          declaredValue: '70 g',
          standardizedValue: '70 g',
          unit: 'g',
          status: 'PRESENT',
          boundingPolygons: [],
          ruleReference: 'GSR-202E-RULE-06-01-A',
        },
      ],
      inspectorDecision: {
        decision: 'NON_COMPLIANT',
        summaryNotes: 'Missing consumer care address',
        decidedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/v1/dashboard/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: testDraft }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.savedCount).toBe(1);

    const stored = inspectionStore.getInspection('SYNC-TEST-001');
    expect(stored).toBeDefined();
    expect(stored?.productName).toBe('Instant Masala Noodles 70g');
    expect(stored?.status).toBe('DECIDED');
  });

  it('GET /api/v1/rules returns authoritative statutory rules', async () => {
    const res = await fetch(`${baseUrl}/api/v1/rules`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(8);
    expect(json.data[0]).toHaveProperty('rule_number');
    expect(json.data[0]).toHaveProperty('title');
  });

  it('GET /api/v1/reports returns stored reports', async () => {
    const res = await fetch(`${baseUrl}/api/v1/reports`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('GET /api/v1/evidence returns physical evidence photos and metadata', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evidence`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('GET /api/v1/audit returns audit records', async () => {
    const res = await fetch(`${baseUrl}/api/v1/audit`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('action');
  });

  it('GET /api/v1/inspectors returns active officers directory', async () => {
    const res = await fetch(`${baseUrl}/api/v1/inspectors`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(2);
    expect(json.data[0].role).toBe('INSPECTOR');
  });
});
