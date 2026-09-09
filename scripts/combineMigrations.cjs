const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../supabase/migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

let combined = `-- ============================================================================
-- LM-VISION COMPLETE SUPABASE CLOUD SCHEMA MIGRATIONS
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vcxxjjrqbbcbtpputzpx/sql/new
-- ============================================================================

`;

for (const file of files) {
  combined += `\n-- ============================================================================\n`;
  combined += `-- MIGRATION: ${file}\n`;
  combined += `-- ============================================================================\n\n`;
  combined += fs.readFileSync(path.join(dir, file), 'utf8');
  combined += `\n\n`;
}

// Add the demo inspector user seed so Demo Inspector can authenticate
combined += `\n-- ============================================================================\n`;
combined += `-- SEED: Ensure Demo Inspector and Default Roles Exist\n`;
combined += `-- ============================================================================\n\n`;
combined += `
DO $$
BEGIN
  -- Ensure default roles exist
  INSERT INTO public.roles (name, description)
  VALUES 
    ('ADMIN', 'Full administrative access'),
    ('SUPERVISOR', 'Senior oversight and decision authorization'),
    ('INSPECTOR', 'Field inspection and evidence capture'),
    ('AUDITOR', 'Read-only compliance auditing')
  ON CONFLICT (name) DO NOTHING;

  -- Ensure demo inspector user exists in public.users
  INSERT INTO public.users (id, full_name, designation, badge_number, employee_code, is_active, role_id)
  SELECT 
    '00000002-0000-0000-0000-000000000001'::uuid,
    'Demo Inspector',
    'Legal Metrology Field Officer',
    'INS-DL-0042',
    'LM-DEL-042',
    true,
    (SELECT id FROM public.roles WHERE name = 'INSPECTOR' LIMIT 1)
  ON CONFLICT (id) DO NOTHING;
END $$;
`;

const outputPath = path.resolve(__dirname, '../supabase/combined_migrations.sql');
fs.writeFileSync(outputPath, combined, 'utf8');
console.log(`Successfully generated ${outputPath} (${Math.round(combined.length / 1024)} KB)`);
