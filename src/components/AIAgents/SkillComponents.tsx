import { useState, useMemo, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';
import { SkillFrontmatter } from '@/types/skill';
import { useSkills } from '@/contexts/SkillsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VegaLiteBlock } from '@/utils/streamingParser';

const InlineChart = lazy(() => import('@/components/Assistant/InlineChart'));
import {
  FileText,
  DollarSign,
  HeartPulse,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  BarChart3,
  Brain,
  Database,
  Layout,
  MessageSquare,
  Settings,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic icon map — covers both seeded and uploaded skills
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  DollarSign,
  HeartPulse,
  Clock,
  Search,
  BarChart3,
  Brain,
  Database,
  Layout,
  MessageSquare,
  Settings,
  Target,
  Zap,
};

const categoryColors: Record<string, string> = {
  reporting: 'bg-blue-500/10 text-blue-600 border-blue-200',
  analysis: 'bg-purple-500/10 text-purple-600 border-purple-200',
  monitoring: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  strategy: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

// --- Skill Selector ---

interface SkillSelectorProps {
  selectedSkillIds: string[];
  onSelectionChange: (skillIds: string[]) => void;
  maxSelections?: number;
  mode?: 'select' | 'chain';
}

export function SkillSelector({
  selectedSkillIds,
  onSelectionChange,
  maxSelections = 3,
  mode = 'select',
}: SkillSelectorProps) {
  const { skills, isLoading } = useSkills();
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      onSelectionChange(selectedSkillIds.filter((id) => id !== skillId));
    } else if (selectedSkillIds.length < maxSelections) {
      onSelectionChange([...selectedSkillIds, skillId]);
    }
  };

  // Filter skills by search query (matches trigger phrases, name, description)
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const lower = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.displayName.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.triggerPhrases.some((tp) => tp.toLowerCase().includes(lower))
    );
  }, [skills, searchQuery]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Group skills by category
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      const category = skill.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, SkillFrontmatter[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">
          {selectedSkillIds.length} / {maxSelections} selected
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {category}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {categorySkills.map((skill) => {
                  const Icon = iconMap[skill.icon] || FileText;
                  const isSelected = selectedSkillIds.includes(skill.id);
                  const isDisabled = !isSelected && selectedSkillIds.length >= maxSelections;

                  return (
                    <Card
                      key={skill.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isSelected && 'ring-2 ring-primary border-primary',
                        isDisabled && 'opacity-50 cursor-not-allowed',
                        !isDisabled && !isSelected && 'hover:border-primary/50'
                      )}
                      onClick={() => !isDisabled && handleToggleSkill(skill.id)}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0',
                            categoryColors[skill.category] || 'bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm text-foreground truncate">
                              {skill.displayName}
                            </h5>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {skill.description}
                          </p>
                          {skill.sourceType === 'uploaded' && (
                            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                              uploaded
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(groupedSkills).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No skills found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedSkillIds.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">
            {mode === 'chain' ? 'Execution Chain' : 'Selected Skills'}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {selectedSkillIds.map((id, index) => {
              const skill = skills.find((s) => s.id === id);
              if (!skill) return null;
              return (
                <div key={id} className="flex items-center gap-1">
                  {mode === 'chain' && index > 0 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <span className="text-xs opacity-50">{index + 1}.</span>
                    {skill.displayName}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Skill Output Renderer (Safe — no dangerouslySetInnerHTML) ---

interface SkillOutputRendererProps {
  output: string;
  isLoading?: boolean;
  skill?: SkillFrontmatter;
}

export function SkillOutputRenderer({ output, isLoading, skill }: SkillOutputRendererProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!output) return null;

  return (
    <Card>
      {skill && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className={categoryColors[skill.category]}>
              {skill.displayName}
            </Badge>
            {skill.sourceType === 'uploaded' && (
              <Badge variant="outline" className="text-[10px]">uploaded</Badge>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/50">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 text-muted-foreground border-b border-border">
                {children}
              </td>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">{children}</h3>
            ),
            hr: () => <hr className="my-4 border-border" />,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-2">
                {children}
              </blockquote>
            ),
            li: ({ children }) => (
              <li className="text-sm text-muted-foreground">{children}</li>
            ),
            p: ({ children }) => (
              <p className="text-sm text-muted-foreground my-1">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-foreground font-semibold">{children}</strong>
            ),
            code: ({ children, className }) => {
              // Render vega-lite fenced blocks as interactive charts
              if (className === 'language-vega-lite' || className === 'language-vlite') {
                const rawJson = String(children).replace(/\n$/, '');
                const block: VegaLiteBlock = {
                  id: `skill-chart-${rawJson.length}`,
                  rawJson,
                  isComplete: true,
                  position: 0,
                };
                return (
                  <ChartErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg border border-border/50 my-3">
                          <Skeleton className="h-32 w-full mx-4" />
                        </div>
                      }
                    >
                      <InlineChart block={block} />
                    </Suspense>
                  </ChartErrorBoundary>
                );
              }
              if (className?.startsWith('language-')) {
                return (
                  <pre className="bg-muted rounded-md p-3 overflow-x-auto my-3">
                    <code className="text-xs">{children}</code>
                  </pre>
                );
              }
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{children}</code>
              );
            },
          }}
        >
          {output}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}
