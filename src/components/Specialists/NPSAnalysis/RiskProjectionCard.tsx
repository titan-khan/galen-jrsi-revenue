 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { AlertTriangle, TrendingDown, Clock, Users, DollarSign, Megaphone } from 'lucide-react';
 import type { NPSRiskProjections } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface RiskProjectionCardProps {
   projections: NPSRiskProjections;
   currentNps: number;
   routeId?: string;
 }
 
 export const RiskProjectionCard = memo(function RiskProjectionCard({ 
   projections, 
   currentNps,
   routeId = 'R002' 
 }: RiskProjectionCardProps) {
   return (
     <Card className="border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent">
       <CardHeader className="pb-2">
         <div className="flex items-center gap-2">
           <AlertTriangle className="h-4 w-4 text-red-500" />
           <CardTitle className="text-base">Risk of Inaction</CardTitle>
           <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
             Urgent
           </Badge>
         </div>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* 30-Day Projection */}
           <div className="p-4 rounded-lg bg-background border">
             <div className="flex items-center gap-2 mb-3">
               <Clock className="h-4 w-4 text-amber-500" />
               <span className="text-sm font-semibold text-foreground">30-Day Projection</span>
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <TrendingDown className="h-4 w-4 text-red-500" />
                   <span className="text-xs text-muted-foreground">{routeId} NPS Forecast</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <span className="text-sm font-bold text-red-600">{projections.thirtyDay.npsforecast}</span>
                   <span className="text-xs text-muted-foreground">
                     ({(projections.thirtyDay.npsforecast - currentNps).toFixed(1)})
                   </span>
                 </div>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Users className="h-4 w-4 text-amber-500" />
                   <span className="text-xs text-muted-foreground">Customer Loss Risk</span>
                 </div>
                 <span className="text-sm font-bold text-amber-600">{projections.thirtyDay.customerLoss} customers</span>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <DollarSign className="h-4 w-4 text-red-500" />
                   <span className="text-xs text-muted-foreground">Revenue Impact</span>
                 </div>
                 <span className="text-sm font-bold text-red-600">{projections.thirtyDay.revenueImpact}</span>
               </div>
             </div>
           </div>
 
           {/* 90-Day Projection */}
           <div className={cn(
             "p-4 rounded-lg border",
             projections.ninetyDay.netNegativeRisk ? "bg-red-500/10 border-red-500/30" : "bg-background"
           )}>
             <div className="flex items-center gap-2 mb-3">
               <Clock className="h-4 w-4 text-red-500" />
               <span className="text-sm font-semibold text-foreground">90-Day Projection</span>
               {projections.ninetyDay.netNegativeRisk && (
                 <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                   Critical
                 </Badge>
               )}
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <TrendingDown className="h-4 w-4 text-red-500" />
                   <span className="text-xs text-muted-foreground">{routeId} NPS Forecast</span>
                 </div>
                 <span className="text-sm font-bold text-red-600">{projections.ninetyDay.npsForecast}</span>
               </div>
               {projections.ninetyDay.netNegativeRisk && (
                 <div className="p-2 rounded bg-red-500/10 text-xs text-red-600 font-medium">
                   ⚠️ Route may become net negative (more detractors than promoters)
                 </div>
               )}
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Megaphone className="h-4 w-4 text-red-500" />
                   <span className="text-xs text-muted-foreground">Brand Damage</span>
                 </div>
                 <span className="text-xs font-medium text-red-600 text-right max-w-[150px]">
                   {projections.ninetyDay.brandDamage}
                 </span>
               </div>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 });