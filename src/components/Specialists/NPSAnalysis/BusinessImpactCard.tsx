 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { DollarSign, Users, Headphones, TrendingDown, Megaphone } from 'lucide-react';
 import type { NPSDetailedBusinessImpact } from '@/types/specialist';
 
 interface BusinessImpactCardProps {
   impact: NPSDetailedBusinessImpact;
   valueAtStake?: number;
 }
 
 export const BusinessImpactCard = memo(function BusinessImpactCard({ 
   impact, 
   valueAtStake = 2_000_000_000 
 }: BusinessImpactCardProps) {
   /** Format IDR using Indonesian units: Jt (Juta), M (Miliar), T (Triliun) */
   const formatIDR = (value: number) => {
     if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(1)}T`;
     if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
     if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}Jt`;
     return `Rp ${value}`;
   };
 
   return (
     <Card>
       <CardHeader className="pb-2">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <DollarSign className="h-4 w-4 text-primary" />
             <CardTitle className="text-base">Business Impact Assessment</CardTitle>
           </div>
           <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
             {formatIDR(valueAtStake)}/year at risk
           </Badge>
         </div>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Customer Impact */}
           <div className="p-4 rounded-lg bg-muted/50 border">
             <div className="flex items-center gap-2 mb-3">
               <Users className="h-4 w-4 text-purple-500" />
               <span className="text-sm font-semibold text-foreground">Customer Impact</span>
             </div>
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Total Detractors</span>
                 <span className="text-sm font-bold text-foreground">{impact.customerImpact.totalDetractors}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">At-Risk Revenue</span>
                 <span className="text-sm font-bold text-red-600">{impact.customerImpact.atRiskRevenue}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Negative WOM Reach</span>
                 <span className="text-sm font-bold text-amber-600">{impact.customerImpact.negativeWomReach.toLocaleString()}</span>
               </div>
             </div>
           </div>
 
           {/* Operational Impact */}
           <div className="p-4 rounded-lg bg-muted/50 border">
             <div className="flex items-center gap-2 mb-3">
               <Headphones className="h-4 w-4 text-blue-500" />
               <span className="text-sm font-semibold text-foreground">Operational Impact</span>
             </div>
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Complaint Handling</span>
                 <span className="text-sm font-bold text-foreground">{impact.operationalImpact.complaintHandlingCost}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Service Recovery</span>
                 <span className="text-sm font-bold text-foreground">{impact.operationalImpact.serviceRecoveryCost}</span>
               </div>
             </div>
           </div>
 
           {/* Commercial Impact */}
           <div className="p-4 rounded-lg bg-muted/50 border">
             <div className="flex items-center gap-2 mb-3">
               <TrendingDown className="h-4 w-4 text-red-500" />
               <span className="text-sm font-semibold text-foreground">Commercial Impact</span>
             </div>
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Route Revenue at Risk</span>
                 <span className="text-sm font-bold text-red-600">{impact.commercialImpact.routeRevenueAtRisk}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-muted-foreground">Churn Risk</span>
                 <span className="text-sm font-bold text-amber-600">{impact.commercialImpact.overallChurnRisk}</span>
               </div>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 });