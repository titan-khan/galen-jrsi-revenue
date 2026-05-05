import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useSkills } from '@/contexts/SkillsContext';
import { useSkillExecution } from '@/hooks/useSkillExecution';
import { SkillOutputRenderer } from '@/components/AIAgents/SkillComponents';
import { SkillFrontmatter } from '@/types/skill';
import {
  Play,
  Loader2,
  RotateCw,
  Zap,
  FileText,
  DollarSign,
  HeartPulse,
  Clock,
  BarChart3,
  Brain,
  Database,
  Layout,
  Target,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, DollarSign, HeartPulse, Clock, BarChart3, Brain, Database, Layout, Target, Zap,
};

const categoryColors: Record<string, string> = {
  reporting: 'bg-blue-500/10 text-blue-600 border-blue-200',
  analysis: 'bg-purple-500/10 text-purple-600 border-purple-200',
  monitoring: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  strategy: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

// Map specialist domains to relevant skill categories/names
const DOMAIN_SKILL_RELEVANCE: Record<string, string[]> = {
  'supply-chain': ['operational-excellence', 'root-cause-analysis', 'executive-briefing'],
  'commercial': ['revenue-analysis', 'root-cause-analysis', 'executive-briefing'],
  'customer': ['nps-analysis', 'root-cause-analysis', 'executive-briefing'],
  'finance': ['revenue-analysis', 'root-cause-analysis', 'executive-briefing'],
};

interface SkillExecutionPanelProps {
  specialistId: string;
  specialistDomain: string;
  specialistName: string;
}

export function SkillExecutionPanel({
  specialistId,
  specialistDomain,
  specialistName,
}: SkillExecutionPanelProps) {
  const { skills, isLoading: skillsLoading } = useSkills();
  const { isExecuting, output, executionId, error, execute, reset } = useSkillExecution();
  const [selectedSkill, setSelectedSkill] = useState<SkillFrontmatter | null>(null);

  // Filter and sort skills by relevance to this specialist's domain
  const relevantSkills = useMemo(() => {
    const relevantNames = DOMAIN_SKILL_RELEVANCE[specialistDomain] || [];

    // Sort: domain-relevant first, then the rest
    return [...skills].sort((a, b) => {
      const aRelevant = relevantNames.includes(a.name);
      const bRelevant = relevantNames.includes(b.name);
      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [skills, specialistDomain]);

  const handleRunSkill = async (skill: SkillFrontmatter) => {
    setSelectedSkill(skill);
    await execute({
      skillId: skill.id,
      agentId: specialistId,
      inputData: {
        specialist_name: specialistName,
        specialist_domain: specialistDomain,
        triggered_from: 'specialist_detail',
      },
      queryContext: {
        timeRange: 'last_30_days',
      },
    });
  };

  const handleReset = () => {
    reset();
    setSelectedSkill(null);
  };

  // Show output view if we have output or are executing
  if (isExecuting || output || error) {
    return (
      <div className="space-y-4">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              {selectedSkill?.displayName || 'Skill Execution'}
            </h3>
            {isExecuting && (
              <Badge variant="outline" className="gap-1 text-blue-600 bg-blue-500/10 border-transparent">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </Badge>
            )}
            {!isExecuting && output && !error && (
              <Badge variant="outline" className="gap-1 text-emerald-600 bg-emerald-500/10 border-transparent">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Badge>
            )}
            {error && (
              <Badge variant="outline" className="gap-1 text-red-600 bg-red-500/10 border-transparent">
                <AlertCircle className="h-3 w-3" />
                Error
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {executionId && (
              <span className="text-xs text-muted-foreground/50 font-mono">
                {executionId.slice(0, 8)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleReset}
            >
              <RotateCw className="h-3 w-3 mr-1" />
              New Skill
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Execution Failed</p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streaming output */}
        {(output || isExecuting) && (
          <SkillOutputRenderer
            output={output}
            isLoading={isExecuting && !output}
            skill={selectedSkill || undefined}
          />
        )}
      </div>
    );
  }

  // Skill selection view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Run Analysis Skill</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {relevantSkills.length} skills available
        </span>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Run a standalone analysis skill using {specialistName}'s data context.
        Skills use specialized methodologies for deeper analysis.
      </p>

      {skillsLoading ? (
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[320px] pr-2">
          <div className="space-y-2">
            {relevantSkills.map((skill) => {
              const Icon = iconMap[skill.icon] || FileText;
              const isRelevant = (DOMAIN_SKILL_RELEVANCE[specialistDomain] || []).includes(skill.name);

              return (
                <Card
                  key={skill.id}
                  className={cn(
                    'group cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                    isRelevant && 'border-primary/20'
                  )}
                  onClick={() => handleRunSkill(skill)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
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
                        {isRelevant && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 text-primary border-primary/30"
                          >
                            recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {skill.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
