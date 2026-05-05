#!/usr/bin/env node

import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, PageBreak, ShadingType, VerticalAlign, BorderStyle, AlignmentType } from 'docx';
import fs from 'fs';

// Constants
const BLUE_ACCENT = '1E3A5F';
const WHITE = 'FFFFFF';
const MARGIN_DXA = 1440; // 1 inch
const PAGE_WIDTH_DXA = 12240; // US Letter
const PAGE_HEIGHT_DXA = 15840; // US Letter

// Helper functions
const createHeading = (text, level) => {
  const sizes = { 1: 32, 2: 26, 3: 22, 4: 18 };
  return new Paragraph({
    text: text,
    bold: true,
    color: BLUE_ACCENT,
    size: sizes[level] * 2,
    spacing: { before: 240, after: 120 }
  });
};

const createTableHeading = (text) => {
  return new TableCell({
    children: [new Paragraph({
      text: text,
      bold: true,
      color: 'FFFFFF'
    })],
    shading: { type: ShadingType.CLEAR, fill: BLUE_ACCENT },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 80, right: 80 }
  });
};

const createTableCell = (text, bold = false, fill = WHITE) => {
  return new TableCell({
    children: [new Paragraph({
      text: text,
      bold: bold
    })],
    shading: { type: ShadingType.CLEAR, fill: fill },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER
  });
};

const createBulletPoint = (text) => {
  return new Paragraph({
    text: text,
    spacing: { after: 80, before: 0 },
    bullet: { level: 0 },
    indent: { left: 360, hanging: 360 }
  });
};

const createTable = (columnWidths, rows) => {
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    rows: rows.map(row => new TableRow({
      height: { value: 400, rule: 'atLeast' },
      children: row.map((cell, idx) => {
        cell.width = { size: columnWidths[idx], type: WidthType.DXA };
        return cell;
      })
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' }
    }
  });
};

// Build sections
const sections = [
  // Cover Page
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({
    text: 'Galen v0 — Product State Audit',
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    bold: true,
    size: 56,
    color: BLUE_ACCENT
  }),
  new Paragraph({
    text: 'Comprehensive Technical & Functional Assessment',
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    size: 24,
    color: BLUE_ACCENT
  }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({
    text: 'Date: February 9, 2026',
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    size: 22
  }),
  new Paragraph({
    text: 'Prepared for: Maverick (TransportX)',
    alignment: AlignmentType.CENTER,
    size: 22
  }),

  // Table of Contents
  new PageBreak(),
  createHeading('Table of Contents', 1),
  createBulletPoint('1. Executive Summary'),
  createBulletPoint('2. Architecture Overview'),
  createBulletPoint('3. Functionality Assessment'),
  createBulletPoint('4. Data Engineering'),
  createBulletPoint('5. Data Analysis & AI Processing'),
  createBulletPoint('6. UI/UX Assessment'),
  createBulletPoint('7. Gap Analysis & Risk Matrix'),
  createBulletPoint('8. Recommendations'),

  // Executive Summary
  new PageBreak(),
  createHeading('1. Executive Summary', 1),
  new Paragraph({
    text: 'Overall Status: YELLOW — Functional Prototype, Not Production-Ready',
    bold: true,
    spacing: { after: 240 },
    color: 'FFA500',
    size: 22
  }),
  new Paragraph({
    text: 'Galen v0 is a working proof-of-concept with strong architectural foundations but critical security gaps and missing error handling. The system demonstrates viable data engineering and AI integration patterns but requires hardening before any production deployment.',
    spacing: { after: 240 }
  }),
  createHeading('Key Metrics', 2),
  createBulletPoint('8 active pages with working UIs'),
  createBulletPoint('3 edge functions (2 missing JWT verification)'),
  createBulletPoint('35 database tables in star schema configuration'),
  createBulletPoint('9 AI skills across 4 categories (all active)'),
  createBulletPoint('Approximately 80% feature complete'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('Key Strengths', 2),
  createBulletPoint('Clean React + TypeScript architecture with component organization'),
  createBulletPoint('Well-designed star schema data model with 7 dimension and 8 fact tables'),
  createBulletPoint('Progressive AI skill system with validated intent detection and 13-phase response flow'),
  createBulletPoint('Comprehensive data dictionary (108 entries) and metadata governance'),
  createBulletPoint('Polished UI using Tailwind + shadcn/ui with dark mode support'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('Critical Risks', 2),
  createBulletPoint('NO authentication system — anyone can access all data'),
  createBulletPoint('Two edge functions lack JWT verification — open API endpoints'),
  createBulletPoint('Six SECURITY DEFINER views bypass row-level security'),
  createBulletPoint('16 overly permissive RLS policies allow unrestricted writes'),
  createBulletPoint('No error boundaries — application crashes on unhandled errors'),
  createBulletPoint('Zero accessibility features — unusable with assistive technology'),

  // Architecture Overview
  new PageBreak(),
  createHeading('2. Architecture Overview', 1),
  createHeading('2.1 Technology Stack', 2),
  createTable([1872, 1872, 1872, 1872], [
    [
      createTableHeading('Layer'),
      createTableHeading('Technology'),
      createTableHeading('Version'),
      createTableHeading('Notes')
    ],
    [
      createTableCell('Frontend', true),
      createTableCell('React + TypeScript'),
      createTableCell('18.3 / 5.8'),
      createTableCell('Vite 5.4, Tailwind 3.4')
    ],
    [
      createTableCell('UI Components', true),
      createTableCell('shadcn/ui'),
      createTableCell('Latest'),
      createTableCell('53 Radix components')
    ],
    [
      createTableCell('State Management', true),
      createTableCell('React Context + TanStack Query'),
      createTableCell('5.x'),
      createTableCell('12 providers, optimistic updates')
    ],
    [
      createTableCell('Backend', true),
      createTableCell('Supabase'),
      createTableCell('Latest'),
      createTableCell('PostgreSQL + Edge Functions')
    ],
    [
      createTableCell('AI/LLM', true),
      createTableCell('Anthropic Claude'),
      createTableCell('Latest'),
      createTableCell('via Edge Functions')
    ],
    [
      createTableCell('Charts', true),
      createTableCell('Recharts + Vega-Lite'),
      createTableCell('Latest'),
      createTableCell('Data visualization')
    ],
    [
      createTableCell('Routing', true),
      createTableCell('React Router'),
      createTableCell('v6'),
      createTableCell('Lazy loading, 8 active routes')
    ]
  ]),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('2.2 Project Structure', 2),
  new Paragraph({
    text: 'The src/ directory contains well-organized subdirectories:',
    spacing: { after: 120 }
  }),
  createBulletPoint('components/ — 17 subdirectories (200+ component files)'),
  createBulletPoint('contexts/ — 11 context providers (auth, theme, assistant, metrics, etc.)'),
  createBulletPoint('hooks/ — 8 custom hooks (useAssistant, useMetrics, useLazyQuery, etc.)'),
  createBulletPoint('services/ — 9 service modules (API, database, AI, file operations)'),
  createBulletPoint('types/ — 14 TypeScript definition files'),
  createBulletPoint('pages/ — 8 active + 4 dead (unrouted) pages'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('2.3 Data Flow', 2),
  new Paragraph({
    text: 'User Input → React UI (Components) → State Management (Context/Hooks) → Services Layer → Supabase Client → PostgreSQL Database / Edge Functions → Anthropic Claude API → Response Stream via SSE → Frontend Rendering with Charts',
    spacing: { after: 240 },
    italics: true
  }),

  // Functionality Assessment
  new PageBreak(),
  createHeading('3. Functionality Assessment', 1),
  createHeading('3.1 Pages & Routes', 2),
  createTable([1170, 1170, 1170, 3850], [
    [
      createTableHeading('Route'),
      createTableHeading('Page'),
      createTableHeading('Status'),
      createTableHeading('Issues')
    ],
    [
      createTableCell('/', true),
      createTableCell('Dashboard (Home)'),
      createTableCell('Working'),
      createTableCell('Hardcoded TransportX data, no loading/error states')
    ],
    [
      createTableCell('/assistant', true),
      createTableCell('AI Chat'),
      createTableCell('Working'),
      createTableCell('No error handling on API failure, SSE streaming works')
    ],
    [
      createTableCell('/metrics', true),
      createTableCell('Metrics Dashboard'),
      createTableCell('Working'),
      createTableCell('No error states, drawer animation fragile on resize')
    ],
    [
      createTableCell('/specialists', true),
      createTableCell('Agent List'),
      createTableCell('Working'),
      createTableCell('Client-side search only, no pagination')
    ],
    [
      createTableCell('/specialists/new', true),
      createTableCell('Hire Wizard (5 steps)'),
      createTableCell('Working'),
      createTableCell('11 useState hooks, no unsaved-changes warning')
    ],
    [
      createTableCell('/specialists/:id', true),
      createTableCell('Agent Detail'),
      createTableCell('Working'),
      createTableCell('Right panel not mobile responsive, forces horizontal scroll')
    ],
    [
      createTableCell('/metrics/new', true),
      createTableCell('Metric Editor'),
      createTableCell('Partial'),
      createTableCell('Save logic unclear, no validation feedback')
    ],
    [
      createTableCell('/settings', true),
      createTableCell('Settings (4 tabs)'),
      createTableCell('Partial'),
      createTableCell('Integrations tab is placeholder "coming soon"')
    ]
  ]),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('3.2 Dead Code & Unused Pages', 2),
  new Paragraph({
    text: 'Four pages exist in src/pages but are not routed and have no references:',
    spacing: { after: 120 }
  }),
  createBulletPoint('AIAgents.tsx'),
  createBulletPoint('ActionCenter.tsx'),
  createBulletPoint('CommandCenter.tsx'),
  createBulletPoint('CreateAgent.tsx'),
  new Paragraph({
    text: 'Associated component subdirectories for these pages are also unused, creating maintenance burden.',
    spacing: { after: 240 }
  }),
  createHeading('3.3 Non-Functional UI Elements', 2),
  createBulletPoint('Header search bar — renders but has no onChange handler (dead code)'),
  createBulletPoint('Notification bell button — renders icon only, no interaction or popover'),
  createBulletPoint('Settings Integrations tab — placeholder "coming soon" message'),

  // Data Engineering
  new PageBreak(),
  createHeading('4. Data Engineering', 1),
  createHeading('4.1 Database Schema', 2),
  new Paragraph({
    text: 'Star schema with 35 public tables across 6 categories:',
    spacing: { after: 240 }
  }),
  createBulletPoint('7 Dimension tables: dim_station, dim_route, dim_customer, dim_driver, dim_vehicle, dim_fleet, dim_time'),
  createBulletPoint('8 Fact tables: fact_trip (4160 rows), fact_vehicle_revenue (1980), fact_revenue (1300), fact_nps_response_raw (1000), fact_ticket_sales (740), fact_funnel (200), fact_nps_response (130), fact_driver_log (100)'),
  createBulletPoint('6 Agent/System tables: mostly empty (agents: 0 rows, agent_runs: 0)'),
  createBulletPoint('6 Gold-layer monthly views for aggregated analytics'),
  createBulletPoint('Metadata tables: 108 dictionary entries, 37 business terms'),
  createBulletPoint('Assistant tables: 30 conversations, 111 messages'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('4.2 Edge Functions (3)', 2),
  createTable([1170, 1170, 1170, 2340, 2340], [
    [
      createTableHeading('Function'),
      createTableHeading('Version'),
      createTableHeading('JWT'),
      createTableHeading('Status'),
      createTableHeading('Issues')
    ],
    [
      createTableCell('assistant', true),
      createTableCell('v11'),
      createTableCell('YES'),
      createTableCell('Active'),
      createTableCell('High token overhead in prompt, no timeout')
    ],
    [
      createTableCell('execute-skill', true),
      createTableCell('v3'),
      createTableCell('NO'),
      createTableCell('Active'),
      createTableCell('SECURITY: No JWT verification (open API)')
    ],
    [
      createTableCell('metrics-ai', true),
      createTableCell('v2'),
      createTableCell('NO'),
      createTableCell('Active'),
      createTableCell('SECURITY: No JWT verification (open API)')
    ]
  ]),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('4.3 Security Issues (CRITICAL)', 2),
  new Paragraph({
    text: 'Multiple critical security vulnerabilities identified:',
    spacing: { after: 120 }
  }),
  createBulletPoint('6 SECURITY DEFINER views bypass row-level security (gold views)'),
  createBulletPoint('2 edge functions missing JWT verification (execute-skill, metrics-ai)'),
  createBulletPoint('16 overly permissive RLS policies with WITH CHECK true on agent/assistant tables'),
  createBulletPoint('2 functions with mutable search_path (potential injection vectors)'),
  createBulletPoint('4 unindexed foreign keys (performance risk)'),
  createBulletPoint('10 unused indexes (write overhead)'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('4.4 Data Integrity', 2),
  createBulletPoint('All foreign key constraints valid, zero orphaned rows'),
  createBulletPoint('NPS scores within valid range (1–10)'),
  createBulletPoint('Revenue totals consistent with source data'),
  createBulletPoint('Funnel logic valid and sequenced correctly'),
  createBulletPoint('Data dictionary comprehensive: 108 entries covering 13 tables'),

  // Data Analysis & AI Processing
  new PageBreak(),
  createHeading('5. Data Analysis & AI Processing', 1),
  createHeading('5.1 AI Skill System', 2),
  new Paragraph({
    text: '9 skills organized across 4 categories:',
    spacing: { after: 240 }
  }),
  createTable([1170, 1170, 1170, 3850], [
    [
      createTableHeading('Skill'),
      createTableHeading('Category'),
      createTableHeading('Status'),
      createTableHeading('Description')
    ],
    [
      createTableCell('problem-articulation', true),
      createTableCell('analysis'),
      createTableCell('Active'),
      createTableCell('Transforms vague problems into structured analysis plans')
    ],
    [
      createTableCell('data-warehouse-adapter', true),
      createTableCell('analysis'),
      createTableCell('Active'),
      createTableCell('Joins star schema into flat analysis-ready files')
    ],
    [
      createTableCell('nps-monitoring-agent', true),
      createTableCell('monitoring'),
      createTableCell('Active'),
      createTableCell('NPS trend detection and executive reporting')
    ],
    [
      createTableCell('revenue-monitoring-agent', true),
      createTableCell('monitoring'),
      createTableCell('Active'),
      createTableCell('Revenue anomaly detection with BCG matrix methodology')
    ],
    [
      createTableCell('operational-metrics-agent', true),
      createTableCell('monitoring'),
      createTableCell('Active'),
      createTableCell('OTP, delays, margin KPI calculation')
    ],
    [
      createTableCell('dashboard-generator', true),
      createTableCell('reporting'),
      createTableCell('Active'),
      createTableCell('Creates narrative HTML dashboards from data')
    ],
    [
      createTableCell('executive-briefing', true),
      createTableCell('reporting'),
      createTableCell('Active'),
      createTableCell('9-section executive report generation')
    ],
    [
      createTableCell('data-visualization', true),
      createTableCell('reporting'),
      createTableCell('Active'),
      createTableCell('Vega-Lite chart generation (4 rate-limiting failures)')
    ],
    [
      createTableCell('strategic-recommendations', true),
      createTableCell('strategy'),
      createTableCell('Active'),
      createTableCell('Cross-metric strategic synthesis and recommendations')
    ]
  ]),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('5.2 Pipeline System', 2),
  new Paragraph({
    text: 'One active pipeline: "full-monitoring-report" chains problem-articulation → nps-monitoring-agent → dashboard-generator.',
    spacing: { after: 120 }
  }),
  new Paragraph({
    text: 'CRITICAL ISSUE: The ai_skill_pipeline_steps table is EMPTY — pipeline cannot execute multi-skill chains despite table definitions existing.',
    spacing: { after: 240 },
    bold: true,
    color: 'C00000'
  }),
  createHeading('5.3 AI Flow (End-to-End)', 2),
  new Paragraph({
    text: '13-phase response generation process:',
    spacing: { after: 120 }
  }),
  createBulletPoint('1. User types question with optional @mentions'),
  createBulletPoint('2. Frontend parses @mentions and builds context'),
  createBulletPoint('3. Query context built (metrics, agents, recommendations)'),
  createBulletPoint('4. Edge function (assistant v11) called with JWT token'),
  createBulletPoint('5. Intent detected (8 categories: analyze, summarize, forecast, etc.)'),
  createBulletPoint('6. Query context spec loaded from configuration'),
  createBulletPoint('7. SQL generated from spec or raw query'),
  createBulletPoint('8. Database queried with RLS applied'),
  createBulletPoint('9. Results combined with conversation history'),
  createBulletPoint('10. System prompt with governance rules prepared'),
  createBulletPoint('11. Claude API called via streaming (SSE)'),
  createBulletPoint('12. Response streamed in real-time to client'),
  createBulletPoint('13. Frontend renders text, tables, and charts'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('5.4 Gaps in AI System', 2),
  createBulletPoint('Pipeline steps table empty — blocks multi-skill chaining'),
  createBulletPoint('No SKILL.md body format — 9 skills use legacy format (no standardization)'),
  createBulletPoint('data-visualization has 4 rate-limiting failures — needs timeout handling'),
  createBulletPoint('No output validation on AI responses — unsafe content not filtered'),
  createBulletPoint('Agents table empty — no agent instances created yet'),
  createBulletPoint('Adaptive query config unused — fallback to static specs'),

  // UI/UX Assessment
  new PageBreak(),
  createHeading('6. UI/UX Assessment', 1),
  createHeading('6.1 Design System', 2),
  createBulletPoint('Framework: Tailwind CSS 3.4 + shadcn/ui (53 Radix components)'),
  createBulletPoint('Fonts: Inter (sans), Libre Baskerville (serif), Source Code Pro (mono)'),
  createBulletPoint('Theme: CSS variable-based with dark mode support (class strategy)'),
  createBulletPoint('Layout: Collapsible sidebar + sticky header + scrollable content area'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('6.2 Responsive Design', 2),
  new Paragraph({
    text: 'Breakpoint behavior:',
    spacing: { after: 120 }
  }),
  createBulletPoint('Mobile: Sidebar collapses, grids stack to single column'),
  createBulletPoint('Tablet: 2-column grids, sidebar drawer'),
  createBulletPoint('Desktop: 3–5 column grids with detail panels'),
  new Paragraph({
    text: 'Critical Issues:',
    spacing: { after: 120 },
    bold: true,
    color: 'C00000'
  }),
  createBulletPoint('Specialist Detail right panel DOES NOT collapse on mobile (forces horizontal scroll)'),
  createBulletPoint('Header search bar fixed at 264px width (may overflow small phones)'),
  createBulletPoint('100vh calculations conflict with mobile browser address bars'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('6.3 Accessibility', 2),
  new Paragraph({
    text: 'WCAG Compliance: CRITICAL GAPS',
    spacing: { after: 120 },
    bold: true,
    color: 'C00000'
  }),
  createBulletPoint('Zero aria-labels on key interactive elements (sidebar toggle, notifications, search, back buttons)'),
  createBulletPoint('No keyboard navigation in mention popover'),
  createBulletPoint('No skip-to-content link'),
  createBulletPoint('No ARIA roles on custom components'),
  createBulletPoint('Color contrast ratios not verified'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('6.4 Error Handling', 2),
  new Paragraph({
    text: 'CRITICAL GAPS:',
    spacing: { after: 120 },
    bold: true,
    color: 'C00000'
  }),
  createBulletPoint('No error boundaries (React ErrorBoundary) — app crashes on unhandled errors'),
  createBulletPoint('No error states displayed when API calls fail'),
  createBulletPoint('No network error recovery or retry logic'),
  createBulletPoint('Only Specialists page has loading skeletons; other pages show nothing during load'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('6.5 Consistency Issues', 2),
  createBulletPoint('Typography: Mix of text-3xl, text-xl for page titles (no standardization)'),
  createBulletPoint('Spacing: Inconsistent padding (p-4, p-6, px-6 py-6 used interchangeably)'),
  createBulletPoint('Button sizes: Mix of sm, xs, and custom heights'),
  createBulletPoint('Status colors: Different schemes on different pages'),
  createBulletPoint('Date formatting: Custom getTimeAgo() on Home vs date-fns elsewhere'),

  // Gap Analysis
  new PageBreak(),
  createHeading('7. Gap Analysis & Risk Matrix', 1),
  new Paragraph({
    text: 'Top 15 issues ranked by severity and impact:',
    spacing: { after: 240 }
  }),
  createTable([900, 1400, 1000, 2000, 1000, 1000], [
    [
      createTableHeading('Issue'),
      createTableHeading('Category'),
      createTableHeading('Severity'),
      createTableHeading('Impact'),
      createTableHeading('Effort'),
      createTableHeading('Priority')
    ],
    [
      createTableCell('No authentication', true),
      createTableCell('Security'),
      createTableCell('CRITICAL'),
      createTableCell('Anyone can access all data'),
      createTableCell('16h'),
      createTableCell('P0')
    ],
    [
      createTableCell('Edge functions missing JWT', true),
      createTableCell('Security'),
      createTableCell('CRITICAL'),
      createTableCell('Open API endpoints'),
      createTableCell('2h'),
      createTableCell('P0')
    ],
    [
      createTableCell('SECURITY DEFINER views', true),
      createTableCell('Security'),
      createTableCell('CRITICAL'),
      createTableCell('Bypass RLS'),
      createTableCell('3h'),
      createTableCell('P0')
    ],
    [
      createTableCell('Overly permissive RLS', true),
      createTableCell('Security'),
      createTableCell('HIGH'),
      createTableCell('Unrestricted write access'),
      createTableCell('4h'),
      createTableCell('P0')
    ],
    [
      createTableCell('No error boundaries', true),
      createTableCell('UI/UX'),
      createTableCell('HIGH'),
      createTableCell('App crashes on errors'),
      createTableCell('4h'),
      createTableCell('P1')
    ],
    [
      createTableCell('Pipeline steps empty', true),
      createTableCell('AI/Data'),
      createTableCell('HIGH'),
      createTableCell('Cannot chain skills'),
      createTableCell('2h'),
      createTableCell('P1')
    ],
    [
      createTableCell('Hardcoded sample data', true),
      createTableCell('Architecture'),
      createTableCell('HIGH'),
      createTableCell('Not multi-tenant ready'),
      createTableCell('8h'),
      createTableCell('P2')
    ],
    [
      createTableCell('Non-functional search', true),
      createTableCell('UI/UX'),
      createTableCell('MEDIUM'),
      createTableCell('Misleading UI elements'),
      createTableCell('4h'),
      createTableCell('P2')
    ],
    [
      createTableCell('No mobile responsive panel', true),
      createTableCell('UI/UX'),
      createTableCell('MEDIUM'),
      createTableCell('Broken mobile experience'),
      createTableCell('3h'),
      createTableCell('P2')
    ],
    [
      createTableCell('Zero accessibility', true),
      createTableCell('UI/UX'),
      createTableCell('MEDIUM'),
      createTableCell('Unusable for assistive tech'),
      createTableCell('8h'),
      createTableCell('P2')
    ],
    [
      createTableCell('Missing loading/error states', true),
      createTableCell('UI/UX'),
      createTableCell('MEDIUM'),
      createTableCell('Poor user feedback'),
      createTableCell('6h'),
      createTableCell('P2')
    ],
    [
      createTableCell('Dead/unrouted pages', true),
      createTableCell('Architecture'),
      createTableCell('LOW'),
      createTableCell('Maintenance burden'),
      createTableCell('2h'),
      createTableCell('P3')
    ],
    [
      createTableCell('Unused indexes (10)', true),
      createTableCell('Performance'),
      createTableCell('LOW'),
      createTableCell('Write overhead'),
      createTableCell('1h'),
      createTableCell('P3')
    ],
    [
      createTableCell('Unindexed FKs (4)', true),
      createTableCell('Performance'),
      createTableCell('LOW'),
      createTableCell('Slow joins at scale'),
      createTableCell('1h'),
      createTableCell('P3')
    ],
    [
      createTableCell('TS permissive config', true),
      createTableCell('Code Quality'),
      createTableCell('LOW'),
      createTableCell('Type safety gaps'),
      createTableCell('4h'),
      createTableCell('P3')
    ]
  ]),

  // Recommendations
  new PageBreak(),
  createHeading('8. Recommendations', 1),
  createHeading('8.1 Phase 1: Security Hardening (P0 — 1–2 days)', 2),
  new Paragraph({
    text: 'CRITICAL: Must complete before any external access.',
    spacing: { after: 120 },
    bold: true,
    color: 'C00000'
  }),
  createBulletPoint('Add JWT verification to execute-skill and metrics-ai edge functions'),
  createBulletPoint('Fix SECURITY DEFINER on 6 gold views (convert to regular views or use RLS)'),
  createBulletPoint('Restrict RLS policies on agent/assistant tables (reject WITH CHECK true)'),
  createBulletPoint('Add 4 missing foreign key indexes'),
  createBulletPoint('Fix function search_path on 2 functions to use immutable settings'),
  createBulletPoint('Remove 10 unused indexes to reduce write overhead'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('8.2 Phase 2: Stability & UX (P1 — 1 week)', 2),
  createBulletPoint('Add React ErrorBoundary at page level to catch crashes'),
  createBulletPoint('Implement loading/error states on all pages (skeleton loaders, error cards)'),
  createBulletPoint('Make search bar functional (real search against database) or remove it'),
  createBulletPoint('Add notification system or remove non-functional bell icon'),
  createBulletPoint('Fix mobile responsive layout on specialist detail (collapsible right panel)'),
  createBulletPoint('Add basic accessibility (aria-labels, skip link, keyboard navigation)'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('8.3 Phase 3: AI System Completion (P1 — 1 week)', 2),
  createBulletPoint('Populate ai_skill_pipeline_steps table to enable multi-skill chaining'),
  createBulletPoint('Create agent instances for testing and demo purposes'),
  createBulletPoint('Fix data-visualization rate limiting (add timeout and retry logic)'),
  createBulletPoint('Add output validation to filter unsafe content'),
  createBulletPoint('Test full pipeline chain end-to-end with monitoring'),
  new Paragraph({ text: '', spacing: { after: 240 } }),
  createHeading('8.4 Phase 4: Production Readiness (P2 — 2–3 weeks)', 2),
  createBulletPoint('Implement Supabase Auth + protected routes (block unauthenticated access)'),
  createBulletPoint('Replace hardcoded TransportX data with database-driven content'),
  createBulletPoint('Remove dead code (4 unrouted pages + associated components)'),
  createBulletPoint('Tighten TypeScript config (enable strictNullChecks, noImplicitAny)'),
  createBulletPoint('Add E2E tests for critical flows (chat, metrics, specialist hiring)'),
  createBulletPoint('Create deployment and environment documentation')
];

// Create document
const doc = new Document({
  sections: [{
    margins: {
      top: MARGIN_DXA,
      right: MARGIN_DXA,
      bottom: MARGIN_DXA,
      left: MARGIN_DXA
    },
    size: {
      width: PAGE_WIDTH_DXA,
      height: PAGE_HEIGHT_DXA
    },
    children: sections
  }]
});

// Write file
const outputPath = '/sessions/practical-charming-mendel/mnt/galen-v0/GALEN_V0_PRODUCT_AUDIT.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document created successfully: ${outputPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(2)} KB`);
  console.log(`Pages: ~18 pages`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
