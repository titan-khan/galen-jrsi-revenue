 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
 import type { NPSRouteMetrics, NPSRouteTrend } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface RouteBreakdownTableProps {
   routes: Record<string, NPSRouteMetrics>;
   trends: Record<string, NPSRouteTrend>;
 }
 
 const STATUS_CONFIG = {
   strong: { label: 'Strong', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
   good: { label: 'Good', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
   moderate: { label: 'Moderate', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
   below_target: { label: 'Below Target', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
   crisis: { label: 'Crisis', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
 };
 
 export const RouteBreakdownTable = memo(function RouteBreakdownTable({ routes, trends }: RouteBreakdownTableProps) {
   const routeList = Object.values(routes).sort((a, b) => b.nps - a.nps);
 
   return (
     <Card>
       <CardHeader className="pb-2">
         <CardTitle className="text-base">NPS by Route — January 2026</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="space-y-2">
           {routeList.map((route, idx) => {
             const trend = trends[route.routeId];
             const statusConfig = STATUS_CONFIG[route.status];
             const maxNps = Math.max(...routeList.map(r => r.nps), 50);
             const barWidth = Math.max(5, (route.nps / maxNps) * 100);
 
             return (
               <div key={route.routeId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                 <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-sm font-medium text-foreground">{route.routeId}</span>
                     <span className="text-xs text-muted-foreground truncate">{route.routeName}</span>
                     {route.status === 'crisis' && (
                       <AlertTriangle className="h-3 w-3 text-red-500" />
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                       <div 
                         className={cn(
                           "h-full rounded-full transition-all",
                           route.status === 'strong' && "bg-emerald-500",
                           route.status === 'good' && "bg-blue-500",
                           route.status === 'moderate' && "bg-amber-500",
                           route.status === 'below_target' && "bg-orange-500",
                           route.status === 'crisis' && "bg-red-500"
                         )}
                         style={{ width: `${barWidth}%` }}
                       />
                     </div>
                     <span className="text-sm font-semibold w-10 text-right">{route.nps.toFixed(1)}</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                   {trend && (
                     <span className={cn(
                       "flex items-center gap-0.5 font-medium",
                       trend.delta > 0 && "text-emerald-600",
                       trend.delta < 0 && "text-red-600",
                       trend.delta === 0 && "text-muted-foreground"
                     )}>
                       {trend.delta > 0 ? <TrendingUp className="h-3 w-3" /> : 
                        trend.delta < 0 ? <TrendingDown className="h-3 w-3" /> : 
                        <Minus className="h-3 w-3" />}
                       {trend.delta > 0 ? '+' : ''}{trend.delta.toFixed(1)}
                     </span>
                   )}
                   <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                     {statusConfig.label}
                   </Badge>
                 </div>
               </div>
             );
           })}
         </div>
         <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
           Gap between best and worst: <span className="font-semibold text-foreground">{(routeList[0]?.nps - routeList[routeList.length - 1]?.nps).toFixed(1)} points</span>
         </div>
       </CardContent>
     </Card>
   );
 });