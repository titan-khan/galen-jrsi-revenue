export type ActionCenterTab = 'inbox' | 'pipeline' | 'impact' | 'audit';

export interface Assignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface RecommendationAssignment {
  assignee?: Assignee;
  dueDate?: string;
  sourceType?: 'investigation' | 'agent' | 'manual';
  sourceId?: string;
}

// Status groups for pipeline view
export const PIPELINE_STAGES = [
  { id: 'proposed', label: 'Proposed', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'approved', label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'implemented', label: 'Implemented', color: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { id: 'measured', label: 'Measured', color: 'bg-purple-100 dark:bg-purple-900/30' },
] as const;

// Team members should come from user/auth context in production
// Empty array - no demo data
export const DEMO_TEAM_MEMBERS: Assignee[] = [];
