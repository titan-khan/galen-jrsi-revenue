import { useState } from 'react';
import { AgentList } from '@/components/AIAgents/AgentList';
import { FleetDashboard } from '@/components/AIAgents/FleetDashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List } from 'lucide-react';

const AIAgents = () => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'list'>('fleet');

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Agents</h1>
            <p className="text-muted-foreground">
              Monitor and manage your AI-powered metric agents
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="h-10">
            <TabsTrigger value="fleet" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Fleet Overview
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              Agent List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'fleet' ? <FleetDashboard /> : <AgentList />}
      </div>
    </div>
  );
};

export default AIAgents;
