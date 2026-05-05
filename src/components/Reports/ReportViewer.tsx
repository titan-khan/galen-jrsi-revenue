import { lazy, Suspense, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BarChart3,
  Database,
  ListChecks,
  BookOpen,
  Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Report, ReportSection, ReportSectionType } from '@/types/insight';

import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';

const VegaLiteChart = lazy(() => import('@/components/ui/VegaLiteChart'));

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportViewerProps {
  report: Report;
}

// ---------------------------------------------------------------------------
// Format badge label
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<string, string> = {
  'full-report': 'Full Report',
  'executive-summary': 'Executive Summary',
  'action-plan': 'Action Plan',
};

// ---------------------------------------------------------------------------
// Section type icons
// ---------------------------------------------------------------------------

const SECTION_ICONS: Record<ReportSectionType, ReactNode> = {
  narrative: <FileText className="h-4 w-4 text-muted-foreground/60" />,
  'kpi-table': <BarChart3 className="h-4 w-4 text-blue-500/70" />,
  analysis: <BarChart3 className="h-4 w-4 text-blue-500/70" />,
  callout: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  recommendations: <Lightbulb className="h-4 w-4 text-emerald-500/70" />,
  methodology: <BookOpen className="h-4 w-4 text-muted-foreground/50" />,
};

// ---------------------------------------------------------------------------
// Status keyword detection for <strong> tags
// ---------------------------------------------------------------------------

const STATUS_KEYWORDS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  GOOD: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  OK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
};

function StatusBadgeStrong({ children }: { children: ReactNode }) {
  const text = typeof children === 'string' ? children.trim() : '';
  const statusClass = STATUS_KEYWORDS[text.toUpperCase()];
  if (statusClass) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide',
          statusClass,
        )}
      >
        {text}
      </span>
    );
  }
  return <strong className="text-foreground font-semibold">{children}</strong>;
}

// ---------------------------------------------------------------------------
// Shared markdown component overrides
// ---------------------------------------------------------------------------

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-lg font-bold mt-5 mb-2 first:mt-0 text-foreground">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-sm font-semibold mt-3 mb-1.5 text-foreground">{children}</h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-sm text-muted-foreground leading-relaxed my-2">{children}</p>
  ),
  strong: StatusBadgeStrong,
  em: ({ children }: { children?: ReactNode }) => (
    <em className="text-foreground/80">{children}</em>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-2 space-y-1 list-disc list-outside pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-2 space-y-1 list-decimal list-outside pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-3 text-muted-foreground/80 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border/50" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto my-3 rounded-md border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-3 py-2 text-left font-medium text-foreground text-xs border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-3 py-2 text-muted-foreground text-sm border-b border-border/50">
      {children}
    </td>
  ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    if (className?.startsWith('language-')) {
      return (
        <pre className="bg-muted rounded-md p-3 overflow-x-auto my-3">
          <code className="text-xs">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
};

// ---------------------------------------------------------------------------
// Section numbering helper
// ---------------------------------------------------------------------------

function buildSectionNumbers(sections: ReportSection[]): Map<string, string> {
  const numbers = new Map<string, string>();
  let h1Count = 0;
  let h2Count = 0;

  for (const section of sections) {
    if (section.level <= 1) {
      h1Count++;
      h2Count = 0;
      numbers.set(section.id, `${h1Count}`);
    } else {
      h2Count++;
      numbers.set(section.id, `${h1Count}.${h2Count}`);
    }
  }

  return numbers;
}

// ---------------------------------------------------------------------------
// Individual section renderer
// ---------------------------------------------------------------------------

function ReportSectionBlock({
  section,
  sectionNumber,
}: {
  section: ReportSection;
  sectionNumber: string;
}) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const icon = SECTION_ICONS[section.type];
  const isHeading1 = section.level <= 1;

  // Methodology: collapsible, collapsed by default
  if (section.type === 'methodology') {
    return (
      <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
        <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-muted/40 transition-colors text-left">
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="text-xs font-mono text-muted-foreground/50 mr-1">
                  {sectionNumber}.
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {section.title}
                </span>
              </div>
              {methodologyOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground/40" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 pt-0 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.markdown}
              </ReactMarkdown>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Callout: amber/warning styled box
  if (section.type === 'callout') {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs font-mono text-amber-600/60 dark:text-amber-400/60 mr-1">
              {sectionNumber}.
            </span>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {section.title}
            </h3>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none pl-[26px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {section.markdown}
            </ReactMarkdown>
          </div>
        </div>
        {section.chartSpec && (
          <div className="px-5 pb-4">
            <ChartErrorBoundary>
              <Suspense
                fallback={
                  <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
                  </div>
                }
              >
                <VegaLiteChart spec={section.chartSpec} height={250} className="mt-3" />
              </Suspense>
            </ChartErrorBoundary>
          </div>
        )}
      </div>
    );
  }

  // KPI-Table / Analysis: bordered with section-number emphasis
  if (section.type === 'kpi-table' || section.type === 'analysis') {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            {icon}
            <span className="text-xs font-mono text-primary/50 mr-1 font-semibold">
              {sectionNumber}.
            </span>
            {isHeading1 ? (
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            ) : (
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            )}
          </div>
        </div>
        <div className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {section.markdown}
          </ReactMarkdown>
        </div>
        {section.chartSpec && (
          <div className="px-5 pb-4">
            <ChartErrorBoundary>
              <Suspense
                fallback={
                  <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
                  </div>
                }
              >
                <VegaLiteChart spec={section.chartSpec} height={300} className="mt-2" />
              </Suspense>
            </ChartErrorBoundary>
          </div>
        )}
      </div>
    );
  }

  // Recommendations: distinct styling with priority feel
  if (section.type === 'recommendations') {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-emerald-600/50 dark:text-emerald-400/50 mr-1 font-semibold">
              {sectionNumber}.
            </span>
            {isHeading1 ? (
              <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                {section.title}
              </h2>
            ) : (
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {section.title}
              </h3>
            )}
          </div>
        </div>
        <div className="px-5 py-4 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {section.markdown}
          </ReactMarkdown>
        </div>
        {section.chartSpec && (
          <div className="px-5 pb-4">
            <ChartErrorBoundary>
              <Suspense
                fallback={
                  <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-lg">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
                  </div>
                }
              >
                <VegaLiteChart spec={section.chartSpec} height={250} className="mt-2" />
              </Suspense>
            </ChartErrorBoundary>
          </div>
        )}
      </div>
    );
  }

  // Narrative (default): standard markdown rendering
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5 mb-2">
        {icon}
        <span className="text-xs font-mono text-muted-foreground/50 mr-1">
          {sectionNumber}.
        </span>
        {isHeading1 ? (
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        ) : (
          <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none pl-[26px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {section.markdown}
        </ReactMarkdown>
      </div>
      {section.chartSpec && (
        <div className="pl-[26px]">
          <ChartErrorBoundary>
            <Suspense
              fallback={
                <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
                </div>
              }
            >
              <VegaLiteChart spec={section.chartSpec} height={300} className="mt-3" />
            </Suspense>
          </ChartErrorBoundary>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ReportViewer({ report }: ReportViewerProps) {
  const content = report.content;

  if (!content) {
    return (
      <div className="text-center py-16">
        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground/60">
          No report content available. Generate the report to view it here.
        </p>
      </div>
    );
  }

  const sectionNumbers = buildSectionNumbers(content.sections);
  const formattedDate = (() => {
    try {
      return format(new Date(content.generatedAt), 'MMMM d, yyyy h:mm a');
    } catch {
      return content.generatedAt;
    }
  })();

  return (
    <article className="max-w-4xl mx-auto space-y-6 print:space-y-4">
      {/* ==================================================================
          REPORT HEADER
          ================================================================== */}
      <header className="space-y-3">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground/70">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          {content.analysisPeriod && (
            <div className="flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              <span>Period: {content.analysisPeriod}</span>
            </div>
          )}
          {content.dataSources.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3" />
              <span>
                {content.dataSources.length} data source{content.dataSources.length !== 1 && 's'}
              </span>
            </div>
          )}
        </div>

        {/* Data sources chips */}
        {content.dataSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.dataSources.map((source, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-[11px] text-muted-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        )}

        <Separator />
      </header>

      {/* ==================================================================
          BOTTOM LINE — Executive one-liner
          ================================================================== */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold block mb-1">
              Bottom Line
            </span>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {content.bottomLine}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================
          REPORT SECTIONS
          ================================================================== */}
      <div className="space-y-5">
        {content.sections.map((section, idx) => {
          const sectionNum = sectionNumbers.get(section.id) || `${idx + 1}`;
          const isTopLevel = section.level <= 1;

          return (
            <div key={section.id}>
              {/* Add a separator before each top-level section (except the first) */}
              {isTopLevel && idx > 0 && (
                <Separator className="mb-5" />
              )}
              <ReportSectionBlock
                section={section}
                sectionNumber={sectionNum}
              />
            </div>
          );
        })}
      </div>

      {/* ==================================================================
          NEXT STEPS TABLE
          ================================================================== */}
      {content.nextSteps.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center gap-2.5">
            <ListChecks className="h-4 w-4 text-primary/60" />
            <h2 className="text-base font-semibold text-foreground">Next Steps</h2>
            <Badge
              variant="outline"
              className="text-[10px] font-medium h-5 px-1.5 text-muted-foreground bg-muted/50 border-transparent"
            >
              {content.nextSteps.length}
            </Badge>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground text-xs border-b border-border w-[50%]">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground text-xs border-b border-border w-[25%]">
                    Owner
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-foreground text-xs border-b border-border w-[25%]">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.nextSteps.map((step, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'transition-colors',
                      idx % 2 === 1 && 'bg-muted/20',
                    )}
                  >
                    <td className="px-4 py-2.5 text-sm text-foreground border-b border-border/50">
                      {step.action}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground border-b border-border/50">
                      {step.owner}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground border-b border-border/50">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.due}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================
          END MARKER
          ================================================================== */}
      <div className="pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground/40 whitespace-nowrap font-medium tracking-wide">
            End of Report
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
    </article>
  );
}
