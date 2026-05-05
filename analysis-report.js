const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak, TableOfContents } = require('docx');
const fs = require('fs');

// Colors
const C = {
  primary: "1A365D",
  accent: "2B6CB0",
  success: "276749",
  warning: "C05621",
  danger: "C53030",
  light: "EDF2F7",
  lightBlue: "EBF8FF",
  lightGreen: "F0FFF4",
  lightOrange: "FFFAF0",
  lightRed: "FFF5F5",
  gray: "718096",
  darkGray: "4A5568",
  border: "CBD5E0",
  white: "FFFFFF"
};

const border = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

function para(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ ...opts, text })];
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

function bold(text) {
  return new TextRun({ text, bold: true });
}

function colorText(text, color, bold_ = false) {
  return new TextRun({ text, color, bold: bold_ });
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function statusCell(text, bgColor, textColor = C.primary) {
  return new TableCell({
    borders, width: { size: 1560, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    margins: cellMargins, verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text, bold: true, size: 18, color: textColor, font: "Arial" })
    ]})]
  });
}

function makeCell(text, width, opts = {}) {
  const { bg, bold: b, align, size: sz, color } = opts;
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins, verticalAlign: "center",
    children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children: [
      new TextRun({ text: String(text), bold: b, size: sz || 20, color: color || C.darkGray, font: "Arial" })
    ]})]
  });
}

function headerCell(text, width) {
  return makeCell(text, width, { bg: C.primary, bold: true, color: C.white, align: AlignmentType.CENTER });
}

// Build document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.primary },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.accent },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.darkGray },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "strengths", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "issues", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "recs", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
    ]
  },
  sections: [
    // ========== TITLE PAGE ==========
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
          new TextRun({ text: "GALEN V0", size: 56, bold: true, color: C.primary, font: "Arial" })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
          new TextRun({ text: "Full Project Review & Analysis", size: 36, color: C.accent, font: "Arial" })
        ]}),
        spacer(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
          new TextRun({ text: "Prepared for Maverick", size: 24, color: C.gray, font: "Arial" })
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
          new TextRun({ text: "February 7, 2026", size: 24, color: C.gray, font: "Arial" })
        ]}),
        spacer(), spacer(),
        new Table({
          width: { size: 5000, type: WidthType.DXA },
          columnWidths: [5000],
          rows: [new TableRow({ children: [
            new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 3, color: C.accent }, bottom: noBorder, left: noBorder, right: noBorder },
              width: { size: 5000, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
                new TextRun({ text: "React + TypeScript + Supabase + AI Agent Platform", size: 20, color: C.gray, font: "Arial", italics: true })
              ]})]
            })
          ]})]
        }),
      ]
    },
    // ========== TABLE OF CONTENTS ==========
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: "Galen v0 \u2014 Full Project Review", size: 16, color: C.gray, font: "Arial", italics: true })
        ]})] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "Page ", size: 16, color: C.gray, font: "Arial" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.gray, font: "Arial" })
        ]})] })
      },
      children: [
        heading("Table of Contents"),
        new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ========== 1. EXECUTIVE SUMMARY ==========
        heading("Executive Summary"),
        para("Galen v0 is a sophisticated enterprise-grade AI analytics and agent management platform built with React 18+, TypeScript, Vite 5, and Supabase. The application provides autonomous business intelligence agents that monitor metrics, detect anomalies, generate analysis plans, and produce actionable recommendations with full ROI tracking."),
        para("The platform features a rich ecosystem of 11 pages, 250+ components, 11 React context providers, and deep integration with Supabase for persistence, authentication, and edge function execution. The architecture follows modern best practices including type-safe development, progressive context collection, streaming skill execution, and MECE attribution frameworks."),

        // Tech Stack Summary Table
        spacer(),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [
              headerCell("Category", 2340),
              headerCell("Technologies", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Frontend", 2340, { bold: true, bg: C.light }),
              makeCell("React 18+, TypeScript, Vite 5.4.19 (SWC)", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Styling", 2340, { bold: true, bg: C.light }),
              makeCell("Tailwind CSS, Radix UI, shadcn/ui, class-variance-authority", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("State", 2340, { bold: true, bg: C.light }),
              makeCell("React Context API (11 providers), TanStack React Query, localStorage", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Backend", 2340, { bold: true, bg: C.light }),
              makeCell("Supabase (PostgreSQL, Auth, Realtime, Edge Functions, Storage)", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Data Viz", 2340, { bold: true, bg: C.light }),
              makeCell("Recharts, D3.js ecosystem", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Forms", 2340, { bold: true, bg: C.light }),
              makeCell("react-hook-form, Zod schema validation", 7020),
            ]}),
            new TableRow({ children: [
              makeCell("Build", 2340, { bold: true, bg: C.light }),
              makeCell("Vite + SWC, ESLint, PostCSS + Autoprefixer", 7020),
            ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 2. ARCHITECTURE OVERVIEW ==========
        heading("Architecture Overview"),

        heading("System Layers", HeadingLevel.HEADING_2),
        para("The application follows a clean layered architecture with unidirectional data flow. Each layer has a distinct responsibility and communicates through well-defined interfaces."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 3680, 3680],
          rows: [
            new TableRow({ children: [
              headerCell("Layer", 2000),
              headerCell("Components", 3680),
              headerCell("Responsibility", 3680),
            ]}),
            new TableRow({ children: [
              makeCell("Pages", 2000, { bold: true, bg: C.lightBlue }),
              makeCell("11 route-level pages (Home, Metrics, Specialists, Assistant, ActionCenter, CommandCenter, etc.)", 3680),
              makeCell("Route handling, page-level composition, layout orchestration", 3680),
            ]}),
            new TableRow({ children: [
              makeCell("Context", 2000, { bold: true, bg: C.lightBlue }),
              makeCell("11 React Context providers (Agents, Metrics, Skills, Specialists, Organization, etc.)", 3680),
              makeCell("Global state management, cross-component data sharing, localStorage persistence", 3680),
            ]}),
            new TableRow({ children: [
              makeCell("Components", 2000, { bold: true, bg: C.lightBlue }),
              makeCell("250+ components organized in 10 major groups (AIAgents, MetricHub, CommandCenter, etc.)", 3680),
              makeCell("UI rendering, user interaction, domain-specific displays", 3680),
            ]}),
            new TableRow({ children: [
              makeCell("Services", 2000, { bold: true, bg: C.lightBlue }),
              makeCell("metricService, assistantContext, conflictDetection, templateService", 3680),
              makeCell("Data fetching from Supabase, business logic, template management", 3680),
            ]}),
            new TableRow({ children: [
              makeCell("Supabase", 2000, { bold: true, bg: C.lightBlue }),
              makeCell("PostgreSQL tables, Auth, Edge Functions, Realtime subscriptions", 3680),
              makeCell("Persistent storage, authentication, serverless execution, real-time sync", 3680),
            ]}),
          ]
        }),

        spacer(),
        heading("Core Domain Entities", HeadingLevel.HEADING_2),
        para("The type system defines 11 core domain entity groups, each with rich interfaces supporting the full agent lifecycle from metric monitoring through impact attribution."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 1200, 6360],
          rows: [
            new TableRow({ children: [
              headerCell("Entity", 1800),
              headerCell("Lines", 1200),
              headerCell("Purpose & Key Features", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Agent", 1800, { bold: true }),
              makeCell("265", 1200, { align: AlignmentType.CENTER }),
              makeCell("Autonomous AI agents with lifecycle phases (idle \u2192 planning \u2192 executing \u2192 completed), analysis plans, scheduling, trust scores, and autonomy levels (read-only, supervised, autonomous)", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Specialist", 1800, { bold: true }),
              makeCell("384", 1200, { align: AlignmentType.CENTER }),
              makeCell("Domain-specific agents (supply-chain, commercial, customer, finance) with monitoring rules, condition-based triggers, severity levels, and performance tracking", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Skill", 1800, { bold: true }),
              makeCell("114", 1200, { align: AlignmentType.CENTER }),
              makeCell("Reusable execution modules with input requirements, hard rules, section logic, confidence scoring, and output templates. Loaded from Supabase and executed via edge functions", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Metric", 1800, { bold: true }),
              makeCell("66", 1200, { align: AlignmentType.CENTER }),
              makeCell("Metric definitions with data sources, aggregation types, targets, sparkline data, and status indicators (healthy, warning, critical)", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Attribution", 1800, { bold: true }),
              makeCell("160", 1200, { align: AlignmentType.CENTER }),
              makeCell("MECE performance attribution framework separating vortex-growth, vortex-risk, external-seasonal, external-market, and unexplained factors with confidence scoring", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Company Profile", 1800, { bold: true }),
              makeCell("177", 1200, { align: AlignmentType.CENTER }),
              makeCell("Business context with industry, stage, customer type, sales motion, strategic goals, north star metric, and fiscal year configuration", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("Assistant", 1800, { bold: true }),
              makeCell("71", 1200, { align: AlignmentType.CENTER }),
              makeCell("Chat interface with conversations, agent finding synthesis, and conflict detection between agents", 6360),
            ]}),
            new TableRow({ children: [
              makeCell("CommandCenter", 1800, { bold: true }),
              makeCell("135", 1200, { align: AlignmentType.CENTER }),
              makeCell("Dashboard configuration with preset templates (executive, CFO, CMO), KPI selection, date ranges, comparison periods, and progressive disclosure", 6360),
            ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 3. AGENT & SKILL SYSTEM ==========
        heading("Agent & Skill System"),

        heading("Agent Lifecycle", HeadingLevel.HEADING_2),
        para("Agents follow a well-defined lifecycle from creation through impact measurement. Each phase transition is tracked and auditable."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [900, 1800, 6660],
          rows: [
            new TableRow({ children: [
              headerCell("Phase", 900),
              headerCell("Status", 1800),
              headerCell("Description", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("1", 900, { align: AlignmentType.CENTER }),
              statusCell("IDLE", C.light),
              makeCell("Agent created from template, assigned metrics to monitor. Waiting for trigger (manual, scheduled, or anomaly-detected).", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("2", 900, { align: AlignmentType.CENTER }),
              statusCell("PLANNING", C.lightBlue),
              makeCell("Analysis plan generated with structured steps, framework selection (VRIO, BCG, Porter, SWOT), scope definition, and expected deliverables.", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("3", 900, { align: AlignmentType.CENTER }),
              statusCell("PLAN READY", C.lightBlue),
              makeCell("Plan presented to user for review. User can approve, modify, or reject the proposed analysis approach.", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("4", 900, { align: AlignmentType.CENTER }),
              statusCell("EXECUTING", C.lightOrange),
              makeCell("Skills executed via Supabase edge functions with streaming output. Real-time thinking/response/summary sections parsed and displayed.", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("5", 900, { align: AlignmentType.CENTER }),
              statusCell("RECOMMENDATIONS", C.lightGreen),
              makeCell("Action recommendations generated with priority, potential impact, and estimated effort. Tracked through pipeline stages.", 6660),
            ]}),
            new TableRow({ children: [
              makeCell("6", 900, { align: AlignmentType.CENTER }),
              statusCell("COMPLETED", C.lightGreen, C.success),
              makeCell("Recommendations tracked through lifecycle: proposed \u2192 approved \u2192 in-progress \u2192 implemented \u2192 measured. ROI calculated against predictions.", 6660),
            ]}),
          ]
        }),

        spacer(),
        heading("Skill Execution Pipeline", HeadingLevel.HEADING_2),
        para("Skills are loaded from Supabase and executed via edge functions with streaming Server-Sent Events (SSE) for real-time output display."),

        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [
          bold("Load: "), new TextRun("SkillsContext fetches active skills from Supabase agent_skills table with full definitions including input requirements, hard rules, and section logic.")
        ]}),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [
          bold("Input: "), new TextRun("Agent or user provides structured input matching SkillInputRequirement specifications, including metric IDs, time ranges, and dimension filters.")
        ]}),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [
          bold("Execute: "), new TextRun("useSkillExecution hook calls /functions/v1/execute-skill edge function. Response streamed as SSE with [THINKING], [RESPONSE], and [SUMMARY] markers.")
        ]}),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [
          bold("Parse: "), new TextRun("parseStreamingContent() in streamingParser.ts extracts sections in real-time, enabling progressive UI updates as analysis proceeds.")
        ]}),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 }, children: [
          bold("Display: "), new TextRun("ThinkingStream and SkillComponents render output with collapsible thinking sections, formatted response content, and confidence scores.")
        ]}),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 4. UPLOADED SKILLS ANALYSIS ==========
        heading("Uploaded Skills Analysis"),
        para("Five monitoring and analysis skills were provided for review. These skills form an integrated pipeline from data preparation through executive reporting."),

        heading("Skills Pipeline Overview", HeadingLevel.HEADING_2),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 2800, 2200, 2160],
          rows: [
            new TableRow({ children: [
              headerCell("Skill", 2200),
              headerCell("Purpose", 2800),
              headerCell("Input", 2200),
              headerCell("Output", 2160),
            ]}),
            new TableRow({ children: [
              makeCell("Problem Articulation Agent", 2200, { bold: true }),
              makeCell("Transforms vague business problems into structured analysis plans with hypothesis trees", 2800),
              makeCell("Natural language problem statement", 2200),
              makeCell("Detected use case, hypothesis tree, recommended metrics, analysis plan", 2160),
            ]}),
            new TableRow({ children: [
              makeCell("Data Warehouse Adapter", 2200, { bold: true }),
              makeCell("Converts star schema warehouse exports to flat CSVs for analytics agents", 2800),
              makeCell("Fact tables + dimension tables (CSV/YAML)", 2200),
              makeCell("Period-split flat CSVs + metadata JSON", 2160),
            ]}),
            new TableRow({ children: [
              makeCell("NPS Monitoring Agent", 2200, { bold: true }),
              makeCell("Analyzes NPS trends, detects anomalies, identifies root causes with verbatim clustering", 2800),
              makeCell("NPS CSVs (current/previous), segments, verbatims", 2200),
              makeCell("9-section executive report (MD/JSON)", 2160),
            ]}),
            new TableRow({ children: [
              makeCell("Revenue Monitoring Agent", 2200, { bold: true }),
              makeCell("BCG-style driver tree analysis detecting counterintuitive revenue patterns", 2800),
              makeCell("Revenue JSON (current/previous periods)", 2200),
              makeCell("9-section executive report (MD/JSON)", 2160),
            ]}),
            new TableRow({ children: [
              makeCell("Dashboard Generator", 2200, { bold: true }),
              makeCell("Converts analysis JSON into cognitive-load-optimized executive briefing HTML dashboards", 2800),
              makeCell("Analysis JSON from any monitoring agent", 2200),
              makeCell("Responsive HTML dashboard (90-second read)", 2160),
            ]}),
          ]
        }),

        spacer(),
        heading("Data Flow Between Skills", HeadingLevel.HEADING_2),
        para("The skills form a coherent pipeline where each skill\u2019s output feeds into the next stage of analysis:"),

        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
          bold("Problem Articulation Agent "), new TextRun("serves as the entry point, receiving natural language questions and routing them to the appropriate monitoring agent with structured inputs.")
        ]}),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
          bold("Data Warehouse Adapter "), new TextRun("sits between raw data and monitoring agents, auto-detecting schemas, joining dimensions, and splitting time periods to produce analysis-ready flat files.")
        ]}),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
          bold("NPS and Revenue Monitoring Agents "), new TextRun("consume prepared data and produce structured analysis with anomaly detection, root cause hypotheses (ranked by confidence), and prioritized action recommendations.")
        ]}),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
          bold("Dashboard Generator "), new TextRun("receives JSON output from any monitoring agent and renders it as an executive-friendly HTML dashboard optimized for 90-second read time.")
        ]}),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 5. STRENGTHS ==========
        heading("Strengths"),

        heading("Architecture & Design", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Type-safe throughout. "), new TextRun("Full TypeScript coverage with auto-generated Supabase types ensures compile-time safety across the entire stack. The 11 type definition files cover every domain entity with detailed interfaces.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Clean separation of concerns. "), new TextRun("The Types \u2192 Contexts \u2192 Services \u2192 Components layered pattern keeps domain logic isolated from presentation. Each context provider manages a single domain entity group.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Extensible agent framework. "), new TextRun("The skill system is framework-agnostic\u2014new analysis capabilities can be added by defining skill definitions in Supabase without modifying frontend code. The streaming execution pipeline supports real-time output display.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Sophisticated attribution framework. "), new TextRun("The MECE performance attribution system (vortex-growth + vortex-risk + external + unexplained = 100%) with confidence scoring provides genuine business value for measuring AI-driven impact.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Progressive context collection. "), new TextRun("The organizational context system calculates completeness (0-100%) and progressively collects business context to improve AI suggestions over time\u2014a sophisticated pattern for enterprise SaaS.")
        ]}),

        heading("Technology Choices", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Modern build tooling. "), new TextRun("Vite 5 with SWC compilation provides fast HMR and optimized builds. Path aliases (@/...) keep imports clean.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Accessible UI foundation. "), new TextRun("Radix UI primitives with shadcn/ui composition provides accessible, customizable components. The 40+ base UI components ensure consistent design.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Strategic Supabase integration. "), new TextRun("Using Supabase for auth, database, edge functions, and real-time subscriptions eliminates backend infrastructure complexity while providing enterprise-grade capabilities.")
        ]}),

        heading("Uploaded Skills Quality", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Well-structured pipeline design. "), new TextRun("The five skills form a coherent data processing pipeline from raw data through executive reporting, with clear input/output contracts between stages.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Industry-grade analysis methods. "), new TextRun("Revenue analysis uses BCG driver tree methodology (volume, mix, price, margin effects). NPS analysis includes verbatim clustering into 5 auto-detected themes. Both produce ranked root cause hypotheses with confidence scores.")
        ]}),
        new Paragraph({ numbering: { reference: "strengths", level: 0 }, spacing: { after: 100 }, children: [
          bold("Modular Python scripts. "), new TextRun("Each skill\u2019s scripts are importable as modules, enabling both standalone execution and integration into larger workflows. The data warehouse adapter\u2019s 6 modular components can be used independently.")
        ]}),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 6. ISSUES & CONCERNS ==========
        heading("Issues & Concerns"),

        heading("Critical Issues", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Heavy client-side state with no server sync strategy. "), new TextRun("Most contexts (Agents, Specialists, Recommendations, Audit, Attribution, Relationships) use localStorage for persistence but lack a clear sync strategy with Supabase. This creates risk of data loss and prevents multi-device/multi-user scenarios.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Demo data mixed with production code. "), new TextRun("Hardcoded demo data (TRANSPORTX_SPECIALISTS, metricsData arrays, pre-built agent templates) is embedded directly in context providers and components. This makes it difficult to distinguish between production logic and sample data, and complicates deployment.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold(".env file committed to repository. "), new TextRun("The .env file containing Supabase credentials is present in the repository root and not listed in .gitignore. This is a security risk that should be addressed immediately.")
        ]}),

        heading("Architectural Concerns", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Context provider proliferation. "), new TextRun("11 nested context providers in App.tsx creates deep component nesting and potential performance issues from cascading re-renders. Consider consolidating related contexts or migrating to a more scalable state management solution (Zustand, Jotai) for domains with frequent updates.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("No error boundary implementation. "), new TextRun("The application lacks React Error Boundaries, meaning any component error could crash the entire application. This is particularly risky given the streaming skill execution pipeline where parsing errors could propagate.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Missing loading and error states. "), new TextRun("While skeleton loaders exist in some components, many data-dependent components don\u2019t handle loading and error states consistently, leading to potential blank screens or unhandled promise rejections.")
        ]}),

        heading("Performance Concerns", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Large dependency footprint. "), new TextRun("340+ packages in node_modules including the full D3.js and Radix UI suites. Many of these may not be actively used. Bundle analysis should determine which can be tree-shaken or removed.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("No code splitting or lazy loading. "), new TextRun("All 11 pages and their component trees appear to be eagerly loaded. Implementing React.lazy() with Suspense for route-level splitting would significantly improve initial load time.")
        ]}),

        heading("Skill Integration Gaps", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("Skills are Python-based, platform is JavaScript. "), new TextRun("The uploaded skills use Python scripts (pandas, numpy expected) but the platform executes skills via Supabase Edge Functions (Deno/TypeScript). Integration requires either porting Python logic to TypeScript, wrapping Python in a separate service, or running Python in Supabase\u2019s infrastructure.")
        ]}),
        new Paragraph({ numbering: { reference: "issues", level: 0 }, spacing: { after: 100 }, children: [
          bold("File upload workflow missing. "), new TextRun("The Data Warehouse Adapter and NPS Monitoring Agent expect file inputs (CSVs, JSONs) but the platform lacks a file upload interface for feeding data to skills. The Assistant chat interface would need to support file attachments.")
        ]}),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 7. RECOMMENDATIONS ==========
        heading("Recommendations"),

        heading("Immediate Actions (Priority 1)", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Secure the .env file. "), new TextRun("Add .env to .gitignore, rotate exposed Supabase credentials, and ensure environment variables are injected through CI/CD rather than committed to the repository.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Add Error Boundaries. "), new TextRun("Implement React Error Boundaries at the page level and around the skill execution pipeline. Create a graceful fallback UI for component crashes rather than white-screening the entire application.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Separate demo data from production code. "), new TextRun("Extract all hardcoded demo data into seed files or a development fixtures system. Use environment flags to conditionally load demo data in development mode only.")
        ]}),

        heading("Short-term Improvements (Priority 2)", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Implement route-level code splitting. "), new TextRun("Use React.lazy() and Suspense for each of the 11 pages to reduce initial bundle size. This is especially impactful given the 340+ dependencies.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Consolidate or optimize context providers. "), new TextRun("Group related contexts (e.g., Agent + TrackedRecommendations + Audit) or migrate high-frequency update domains to Zustand stores to reduce re-render cascades.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Add comprehensive error handling. "), new TextRun("Implement consistent loading/error/empty states across all data-dependent components. Add retry logic for Supabase calls and toast notifications for user-facing errors.")
        ]}),

        heading("Skill Integration Strategy (Priority 3)", HeadingLevel.HEADING_2),
        para("To integrate the uploaded monitoring skills into the Galen platform, consider this three-phase approach:"),

        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Phase 1 \u2013 Backend Service Layer. "), new TextRun("Deploy Python skill scripts as a separate microservice (FastAPI or Flask) that the Supabase Edge Functions can invoke. This avoids the complexity of porting Python pandas/numpy logic to TypeScript while maintaining the existing edge function architecture.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Phase 2 \u2013 Frontend Integration Points. "), new TextRun("Add file upload support to the Assistant chat interface for CSV/JSON data ingestion. Create dedicated skill result renderers for the 9-section executive report format and the dashboard generator HTML output. Wire the Problem Articulation Agent into the existing specialist/agent creation flow.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Phase 3 \u2013 Automated Pipeline. "), new TextRun("Connect the Data Warehouse Adapter to Supabase tables for automatic data extraction. Schedule monitoring agents via the existing AgentSchedule system. Auto-generate dashboards when analysis completes and display in the CommandCenter.")
        ]}),

        heading("Long-term Architecture (Priority 4)", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Server-side state sync. "), new TextRun("Migrate localStorage-persisted contexts to Supabase tables with real-time subscriptions. This enables multi-device access, team collaboration, and data persistence across sessions.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Testing infrastructure. "), new TextRun("No test files were found in the codebase. Establish unit testing (Vitest), integration testing for Supabase interactions, and component testing (React Testing Library) before the codebase grows further.")
        ]}),
        new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 100 }, children: [
          bold("Bundle optimization. "), new TextRun("Run a bundle analysis to identify unused dependencies. The full D3 ecosystem and Radix UI suite may include many unused modules. Configure tree-shaking and consider replacing heavy libraries with lighter alternatives where possible.")
        ]}),

        new Paragraph({ children: [new PageBreak()] }),

        // ========== 8. SCORECARD ==========
        heading("Overall Assessment Scorecard"),
        para("The following scorecard rates each dimension of the codebase on a scale from 1 (needs significant work) to 5 (excellent)."),
        spacer(),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3200, 1160, 5000],
          rows: [
            new TableRow({ children: [
              headerCell("Dimension", 3200),
              headerCell("Rating", 1160),
              headerCell("Notes", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Architecture & Design", 3200, { bold: true }),
              makeCell("4.0 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.success }),
              makeCell("Clean layered design with excellent type safety. Context proliferation is the main concern.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Code Quality", 3200, { bold: true }),
              makeCell("3.5 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.success }),
              makeCell("Well-typed with consistent patterns. Demo data mixed into production code reduces maintainability.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Type System", 3200, { bold: true }),
              makeCell("4.5 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.success }),
              makeCell("Comprehensive TypeScript coverage with auto-generated Supabase types. Sophisticated domain modeling.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Security", 3200, { bold: true }),
              makeCell("2.5 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.warning }),
              makeCell("Exposed .env file is a significant concern. No evidence of input sanitization or RBAC implementation.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Performance", 3200, { bold: true }),
              makeCell("3.0 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.warning }),
              makeCell("Good build tooling but missing code splitting, lazy loading, and bundle optimization.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Error Handling", 3200, { bold: true }),
              makeCell("2.5 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.warning }),
              makeCell("No Error Boundaries. Inconsistent loading/error states. Streaming parser lacks robust error recovery.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Testing", 3200, { bold: true }),
              makeCell("1.0 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.danger }),
              makeCell("No test files found. Critical gap for a codebase of this complexity and size.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Documentation", 3200, { bold: true }),
              makeCell("2.5 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.warning }),
              makeCell("README exists but inline documentation is sparse. Types serve as implicit documentation.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Data Persistence", 3200, { bold: true }),
              makeCell("3.0 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.warning }),
              makeCell("Supabase integration exists for some entities but most state lives in localStorage without sync.", 5000),
            ]}),
            new TableRow({ children: [
              makeCell("Uploaded Skills", 3200, { bold: true }),
              makeCell("4.0 / 5", 1160, { align: AlignmentType.CENTER, bold: true, color: C.success }),
              makeCell("Well-designed pipeline with BCG-grade analysis. Integration path to the platform needs definition.", 5000),
            ]}),
            // Overall row
            new TableRow({ children: [
              makeCell("OVERALL", 3200, { bold: true, bg: C.primary, color: C.white }),
              makeCell("3.2 / 5", 1160, { align: AlignmentType.CENTER, bold: true, bg: C.primary, color: C.white }),
              makeCell("Strong architectural foundation with significant room for improvement in testing, security, and error handling.", 5000, { bg: C.primary, color: C.white }),
            ]}),
          ]
        }),

        spacer(), spacer(),
        para([
          new TextRun({ text: "Conclusion: ", bold: true, color: C.primary }),
          new TextRun("Galen v0 demonstrates ambitious and well-structured architecture for an AI-powered business analytics platform. The type system and agent lifecycle design are particularly impressive, providing a solid foundation for the complex domain. The uploaded monitoring skills represent genuinely valuable analytical capabilities (BCG-style driver trees, NPS verbatim clustering, MECE attribution) that would significantly enhance the platform\u2019s value proposition. The primary areas requiring attention are security hardening, testing infrastructure, and defining a clear integration strategy for the Python-based skills with the TypeScript/Supabase frontend. With these improvements, the platform is well-positioned for production readiness.")
        ]),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/practical-charming-mendel/mnt/galen-v0/Galen_v0_Full_Project_Review.docx", buffer);
  console.log("Report generated successfully!");
});
