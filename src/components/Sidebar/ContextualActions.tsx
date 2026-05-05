import { useLocation } from "react-router-dom";
import { 
  RefreshCw, 
  Download, 
  CheckCheck, 
  Filter, 
  Plus, 
  Play, 
  Settings2, 
  Pin,
  Upload,
  Bell
} from "lucide-react";
import { useSidebar as useUISidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface ContextAction {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'outline';
  primary?: boolean;
}

const routeActions: Record<string, ContextAction[]> = {
  '/command-center': [
    { label: 'Refresh Data', icon: RefreshCw, primary: true },
    { label: 'Export Report', icon: Download },
  ],
  '/action-center': [
    { label: 'Approve All', icon: CheckCheck, primary: true },
    { label: 'Filter', icon: Filter },
  ],
  '/ai-agents': [
    { label: 'Create Agent', icon: Plus, primary: true },
    { label: 'Run All', icon: Play },
  ],
  '/metrics': [
    { label: 'Add Metric', icon: Plus, primary: true },
    { label: 'Import', icon: Upload },
  ],
  '/settings': [
    { label: 'Save Changes', icon: CheckCheck, primary: true },
  ],
};

// Agent detail page actions
const agentDetailActions: ContextAction[] = [
  { label: 'Run Now', icon: Play, primary: true },
  { label: 'Configure', icon: Settings2 },
  { label: 'Pin Agent', icon: Pin },
];

// Metric detail page actions
const metricDetailActions: ContextAction[] = [
  { label: 'Pin Metric', icon: Pin, primary: true },
  { label: 'Set Alert', icon: Bell },
];

export function ContextualActions() {
  const location = useLocation();
  const { state } = useUISidebar();
  const collapsed = state === "collapsed";
  
  // Determine actions based on current route
  let actions: ContextAction[] = [];
  
  if (location.pathname.startsWith('/ai-agents/') && location.pathname !== '/ai-agents/new') {
    actions = agentDetailActions;
  } else if (location.pathname.startsWith('/metrics/edit/')) {
    actions = metricDetailActions;
  } else {
    // Find matching route
    const matchingRoute = Object.keys(routeActions).find(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );
    actions = matchingRoute ? routeActions[matchingRoute] : [];
  }

  if (actions.length === 0) {
    return null;
  }

  const primaryAction = actions.find(a => a.primary);
  const secondaryActions = actions.filter(a => !a.primary);

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {primaryAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8"
                onClick={primaryAction.onClick}
              >
                <primaryAction.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{primaryAction.label}</TooltipContent>
          </Tooltip>
        )}
        
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">More actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start">
              {secondaryActions.map((action) => (
                <DropdownMenuItem key={action.label} onClick={action.onClick}>
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <div className="px-2 space-y-2">
      {primaryAction && (
        <Button
          variant="default"
          size="sm"
          className="w-full justify-start"
          onClick={primaryAction.onClick}
        >
          <primaryAction.icon className="h-4 w-4 mr-2" />
          {primaryAction.label}
        </Button>
      )}
      
      {secondaryActions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={action.onClick}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
