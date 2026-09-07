# LM-Vision — Web App Specification

## 1. Web Information Architecture

```text
Login
Dashboard
Inspections
Inspection Detail
Products
Manufacturers
Violations
Risk Intelligence
Reports
Rulebook
Rule Updates
Audit Logs
Users
Settings
```

## 2. Permission Matrix

| Feature | Inspector | Supervisor | Admin | Auditor |
|---|---:|---:|---:|---:|
| Dashboard | Own/relevant | Team/global scope | Global | Read-only |
| Inspections | Own/assigned | Team/global scope | Global | Read-only |
| Inspection detail | ✓ | ✓ | ✓ | ✓ |
| Products | ✓ | ✓ | ✓ | ✓ read |
| Manufacturers | Limited | ✓ | ✓ | ✓ read |
| Violations/findings | Own | Team | Global | Read |
| Risk Intelligence | — | ✓ | ✓ | ✓ read |
| Reports | Own | Team | Global | ✓ |
| Rulebook | Read | Read | Manage | Read |
| Rule Updates | — | Propose/review as configured | Approve/activate | Read |
| Audit Logs | — | Limited | ✓ | ✓ |
| Users | — | — | ✓ | — |
| Settings | Personal | Team config where allowed | ✓ | — |

## 3. Dashboard

Widgets:

- inspections today/period;
- completion time;
- findings by status;
- manual review queue;
- pending sync/processing jobs;
- manufacturer trend summary;
- risk indicators with explainability.

Charts use Recharts. Filters are server-aware and respect access scope.

## 4. Inspections

Table columns:

`Inspection ID, Date, Inspector, Product, Manufacturer, Status, Findings, Decision, Updated`

Filters: date range, status, category, manufacturer, inspector, source type.

## 5. Inspection Detail

Layout:

1. Case header.
2. Source/evidence gallery.
3. Declarations.
4. Applicable rules.
5. Findings.
6. Verification history.
7. Inspector decision.
8. Report actions.
9. Audit timeline.

## 6. Products

Searchable product catalog, linked manufacturer, prior inspection count, and latest known structured attributes.

## 7. Manufacturers

Manufacturer overview with inspection volume, confirmed/suspected finding patterns, unresolved cases, and time trend. Avoid framing aggregate risk as proof of legal non-compliance.

## 8. Violations / Findings

Queue of findings with:

- status;
- rule reference;
- product/manufacturer;
- evidence availability;
- review state;
- inspector comments.

## 9. Risk Intelligence

Risk signals are operational prioritization only. Example dimensions:

`repeat observation rate, unresolved findings, source mismatch frequency, processing uncertainty, inspection recency`

Every score must expose contributing dimensions.

## 10. Reports

Search report history, regenerate from an explicit inspection snapshot, and open signed report URLs.

## 11. Rulebook

Read-only browser of approved rule definitions and versions. Every rule page shows source metadata and activation lifecycle.

## 12. Rule Updates

Workflow states:

`PROPOSED → REVIEW → APPROVED → ACTIVE`

UI must show the proposed diff, affected modules, tests, source references, approver, and effective date before activation.

## 13. Audit Logs

Filter by actor, action, entity, inspection, and date. Export only through an authorized path.

## 14. Users

Admin-only. Manage role activation/deactivation, not raw authentication secrets.

## 15. Settings

App-level configuration, environment status, rule-engine status, provider availability, retention configuration where permitted.

## 16. Web UX States

Every major page has:

- loading skeleton;
- error with retry;
- empty state with next action;
- populated state;
- permission denied state.

## 17. Accessibility

Keyboard navigation, visible focus, semantic headings, form labels, accessible dialogs, non-color-only status indicators.
