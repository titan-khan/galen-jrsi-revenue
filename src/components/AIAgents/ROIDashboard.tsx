import { useState } from 'react';
import { TrackedRecommendation, RecommendationStatus, RealizedImpact } from '@/types/agent';
import { ROISummaryCard } from './ROISummaryCard';
import { RecommendationDetailPanel } from './RecommendationDetailPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, CheckCircle2, Clock, XCircle, TrendingUp, Search, Filter, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ROIDashboardProps {
  recommendations: TrackedRecommendation[];
  onUpdateStatus: (id: string, status: RecommendationStatus) => void;
  onRecordImpact: (id: string, impact: RealizedImpact) => void;
  onUpdateRecommendation: (id: string, updates: Partial<TrackedRecommendation>) => void;
}

const statusConfig: Record<RecommendationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { label: 'Proposed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: <Target className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', icon: <Clock className="h-3 w-3" /> },
  implemented: { label: 'Implemented', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  measured: { label: 'Measured', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: <TrendingUp className="h-3 w-3" /> },
  dismissed: { label: 'Dismissed', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
};

const priorityConfig = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

type FilterTab = 'all' | 'active' | 'measured' | 'dismissed';

export function ROIDashboard({
  recommendations,
  onUpdateStatus,
  onRecordImpact,
  onUpdateRecommendation,
}: ROIDashboardProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<TrackedRecommendation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const filterRecommendations = (recs: TrackedRecommendation[]) => {
    let filtered = recs;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r => r.title.toLowerCase().includes(query) ||
             r.description.toLowerCase().includes(query) ||
             r.agentName.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    switch (filterTab) {
      case 'active':
        filtered = filtered.filter(r => ['proposed', 'approved', 'in-progress', 'implemented'].includes(r.status));
        break;
      case 'measured':
        filtered = filtered.filter(r => r.status === 'measured');
        break;
      case 'dismissed':
        filtered = filtered.filter(r => r.status === 'dismissed');
        break;
    }

    return filtered;
  };

  const filteredRecommendations = filterRecommendations(recommendations);

  // Group by status for pipeline view
  const pipeline: Record<string, TrackedRecommendation[]> = {
    proposed: [],
    approved: [],
    'in-progress': [],
    implemented: [],
    measured: [],
  };

  recommendations.forEach(rec => {
    if (rec.status !== 'dismissed' && pipeline[rec.status]) {
      pipeline[rec.status].push(rec);
    }
  });

  const handleUpdateStatus = (id: string, status: RecommendationStatus) => {
    onUpdateStatus(id, status);
    if (selectedRecommendation?.id === id) {
      setSelectedRecommendation({ ...selectedRecommendation, status, statusUpdatedAt: new Date().toISOString() });
    }
  };

  const handleRecordImpact = (id: string, impact: RealizedImpact) => {
    onRecordImpact(id, impact);
    onUpdateStatus(id, 'measured');
    if (selectedRecommendation?.id === id) {
      setSelectedRecommendation({
        ...selectedRecommendation,
        status: 'measured',
        realizedImpact: impact,
        statusUpdatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={cn(
        "flex-1 overflow-hidden transition-all duration-300",
        selectedRecommendation ? "mr-[400px]" : ""
      )}>
        <div className="h-full overflow-y-auto p-6 space-y-6">
          {/* ROI Summary */}
          <ROISummaryCard recommendations={recommendations} />

          {/* Pipeline View */}
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Recommendations Pipeline</h3>
              <span className="text-sm text-muted-foreground">
                {recommendations.filter(r => r.status !== 'dismissed').length} active
              </span>
            </div>
            <div className="grid grid-cols-5 gap-px bg-border">
              {Object.entries(pipeline).map(([status, recs]) => (
                <div key={status} className="bg-card p-3 min-h-[120px]">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={cn("text-xs", statusConfig[status as RecommendationStatus].color)}>
                      {statusConfig[status as RecommendationStatus].label}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">{recs.length}</span>
                  </div>
                  <div className="space-y-2">
                    {recs.slice(0, 3).map(rec => (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedRecommendation(rec)}
                        className="w-full text-left p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <p className="text-xs font-medium text-foreground line-clamp-2">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.agentName}</p>
                      </button>
                    ))}
                    {recs.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">+{recs.length - 3} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between gap-4">
                <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">All ({recommendations.length})</TabsTrigger>
                    <TabsTrigger value="active" className="text-xs">Active ({recommendations.filter(r => !['measured', 'dismissed'].includes(r.status)).length})</TabsTrigger>
                    <TabsTrigger value="measured" className="text-xs">Measured ({recommendations.filter(r => r.status === 'measured').length})</TabsTrigger>
                    <TabsTrigger value="dismissed" className="text-xs">Dismissed ({recommendations.filter(r => r.status === 'dismissed').length})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recommendations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Realized</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No recommendations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecommendations.map((rec) => (
                    <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRecommendation(rec)}>
                      <TableCell>
                        <p className="font-medium text-foreground line-clamp-1">{rec.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{rec.description}</p>
                      </TableCell>
                      <TableCell className="text-sm">{rec.agentName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", priorityConfig[rec.priority])}>
                          {rec.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", statusConfig[rec.status].color)}>
                          {statusConfig[rec.status].icon}
                          <span className="ml-1">{statusConfig[rec.status].label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{rec.potentialImpact || '—'}</TableCell>
                      <TableCell className="text-sm font-medium text-emerald-600">
                        {rec.realizedImpact?.actualValue || '—'}
                      </TableCell>
                      <TableCell>
                        {rec.roiPercentage !== undefined ? (
                          <span className={cn(
                            "text-sm font-semibold",
                            rec.roiPercentage >= 100 ? "text-emerald-600" : rec.roiPercentage >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                            {rec.roiPercentage}%
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRecommendation && (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] border-l bg-background shadow-xl z-50">
          <RecommendationDetailPanel
            recommendation={selectedRecommendation}
            onClose={() => setSelectedRecommendation(null)}
            onUpdateStatus={handleUpdateStatus}
            onRecordImpact={handleRecordImpact}
            onUpdateRecommendation={onUpdateRecommendation}
          />
        </div>
      )}
    </div>
  );
}
