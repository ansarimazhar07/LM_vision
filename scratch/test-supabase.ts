import { createClient } from '@supabase/supabase-js';

const c = createClient(
  'https://vcxxjjrqbbcbtpputzpx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeHhqanJxYmJjYnRwcHV0enB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTY5NTMsImV4cCI6MjEwNDE3Mjk1M30.2jGtUQBTavfejF5rzBNwsWkX6c_syWn_Gongjgi543I'
);

async function main() {
  const [rules, reports, audits, users, evidence, assessments] = await Promise.all([
    c.from('rules').select('*').limit(5),
    c.from('reports').select('*').limit(5),
    c.from('audit_logs').select('*').limit(5),
    c.from('users').select('*').limit(5),
    c.from('evidence').select('*').limit(5),
    c.from('compliance_assessments').select('*').limit(5),
  ]);
  console.log({
    rules: { count: rules.data?.length, error: rules.error?.message },
    reports: { count: reports.data?.length, error: reports.error?.message },
    audits: { count: audits.data?.length, error: audits.error?.message },
    users: { count: users.data?.length, error: users.error?.message },
    evidence: { count: evidence.data?.length, error: evidence.error?.message },
    assessments: { count: assessments.data?.length, error: assessments.error?.message },
  });
}

main().catch(console.error);
