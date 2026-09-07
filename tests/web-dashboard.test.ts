import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createWebApiResponse, parseDashboardQuery } from '../apps/web/src/index.js';

const workspace = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(workspace, 'apps/web/src/main.ts'), 'utf8');
const dataSource = fs.readFileSync(path.join(workspace, 'apps/web/src/data.ts'), 'utf8');

describe('LM-Vision web dashboard MVP', () => {
  it('preserves the existing shared dashboard query contract', () => {
    expect(parseDashboardQuery({ page: 1, pageSize: 25 })).toMatchObject({ page: 1, pageSize: 25 });
    expect(createWebApiResponse([], 'web-test').success).toBe(true);
  });

  it('provides a visible non-reloading refresh control and freshness states', () => {
    expect(source).toContain('data-action="refresh"');
    expect(source).toContain('Last updated:');
    expect(source).toContain('Refresh failed');
    expect(source).toContain('auto-refresh');
  });

  it('uses paginated inspection reads instead of loading every inspection', () => {
    expect(dataSource).toContain('.range(from, from + pageSize - 1)');
    expect(dataSource).toContain("select('*', { count: 'exact' })");
  });

  it('keeps AI observation, deterministic assessment, and final decision distinct', () => {
    expect(source).toContain('AI observation');
    expect(source).toContain('Deterministic rule engine');
    expect(source).toContain('Inspector final decision');
  });

  it('does not package privileged credentials or an AI SDK in the web source', () => {
    const webFiles = [source, dataSource, fs.readFileSync(path.join(workspace, 'apps/web/package.json'), 'utf8')].join('\n');
    expect(webFiles).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(webFiles).not.toContain('GEMINI_API_KEY');
    expect(webFiles).not.toContain('@google/genai');
    expect(webFiles).toContain('@lm-vision/supabase-client/browser');
  });

  it('does not mutate legal rules, assessments, final decisions, or sync receipts from the UI', () => {
    expect(dataSource).not.toContain(".from('rules').insert");
    expect(dataSource).not.toContain(".from('compliance_assessments').update");
    expect(dataSource).not.toContain(".from('inspector_decisions').update");
    expect(dataSource).not.toContain(".from('sync_operation_receipts').insert");
  });
});
