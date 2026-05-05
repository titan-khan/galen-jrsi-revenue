import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentCard } from './AgentCard';
import { AgentCardSkeleton } from './AgentCardSkeleton';
import { useAgents } from '@/contexts/AgentsContext';
import { AgentCategory } from '@/types/agent';

const CATEGORY_TABS: { value: AgentCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Agents' },
  { value: 'product', label: 'Product' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'operations', label: 'Operations' },
  { value: 'risk', label: 'Risk' },
];

export function AgentList() {
  const navigate = useNavigate();
  const { agents, getTemplateById, isLoading } = useAgents();
  const [activeCategory, setActiveCategory] = useState<AgentCategory | 'all'>('all');

  const filteredAgents =
    activeCategory === 'all'
      ? agents
      : agents.filter((agent) => agent.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as AgentCategory | 'all')}>
          <TabsList>
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button onClick={() => navigate('/ai-agents/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const template = getTemplateById(agent.templateId);
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                templateIcon={template?.icon}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No agents found
            </h3>
            <p className="text-muted-foreground mb-4">
              {activeCategory === 'all'
                ? "Create your first AI agent to get started."
                : `No ${activeCategory} agents yet.`}
            </p>
            <Button onClick={() => navigate('/ai-agents/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
