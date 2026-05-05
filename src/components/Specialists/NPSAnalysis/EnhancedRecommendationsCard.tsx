 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { CheckCircle2, Clock, User, DollarSign, Zap, ArrowRight } from 'lucide-react';
 import type { NPSEnhancedRecommendation } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface EnhancedRecommendationsCardProps {
   recommendations: NPSEnhancedRecommendation[];
 }
 
 const TIMING_CONFIG = {
   immediate: { label: '24-48 Hours', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
   short_term: { label: '1-2 Weeks', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
   medium_term: { label: '2-4 Weeks', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
 };
 
 const EFFORT_CONFIG = {
   low: { label: 'Low', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
   medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
   high: { label: 'High', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
 };
 
 export const EnhancedRecommendationsCard = memo(function EnhancedRecommendationsCard({ 
   recommendations 
 }: EnhancedRecommendationsCardProps) {
   const immediateRecs = recommendations.filter(r => r.timing === 'immediate');
   const shortTermRecs = recommendations.filter(r => r.timing === 'short_term');
   const mediumTermRecs = recommendations.filter(r => r.timing === 'medium_term');
 
   const RecItem = ({ rec }: { rec: NPSEnhancedRecommendation }) => {
     const effortConfig = EFFORT_CONFIG[rec.effort];
     
     return (
       <div className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
         <div className="flex items-start justify-between gap-2 mb-2">
           <div className="flex items-start gap-2 flex-1">
             <span className="text-xs font-bold text-primary">#{rec.priority}</span>
             <span className="text-sm font-medium text-foreground">{rec.action}</span>
           </div>
           <Badge variant="outline" className={cn("text-xs shrink-0", effortConfig.className)}>
             {effortConfig.label} effort
           </Badge>
         </div>
         <div className="flex items-center gap-4 text-xs text-muted-foreground">
           <div className="flex items-center gap-1">
             <User className="h-3 w-3" />
             {rec.owner}
           </div>
           <div className="flex items-center gap-1">
             <Clock className="h-3 w-3" />
             {rec.timingLabel}
           </div>
           <div className="flex items-center gap-1">
             <DollarSign className="h-3 w-3" />
             {rec.cost}
           </div>
         </div>
         <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
           <Zap className="h-3 w-3" />
           Expected: {rec.expectedImpact}
         </div>
       </div>
     );
   };
 
   return (
     <Card>
       <CardHeader className="pb-2">
         <div className="flex items-center gap-2">
           <CheckCircle2 className="h-4 w-4 text-primary" />
           <CardTitle className="text-base">Recommended Actions</CardTitle>
           <Badge variant="outline">{recommendations.length} actions</Badge>
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Immediate Actions */}
         {immediateRecs.length > 0 && (
           <div>
             <div className="flex items-center gap-2 mb-2">
               <Badge variant="outline" className={TIMING_CONFIG.immediate.className}>
                 Immediate
               </Badge>
               <span className="text-xs text-muted-foreground">{immediateRecs.length} actions</span>
             </div>
             <div className="space-y-2">
               {immediateRecs.map(rec => <RecItem key={rec.priority} rec={rec} />)}
             </div>
           </div>
         )}
 
         {/* Short-term Actions */}
         {shortTermRecs.length > 0 && (
           <div>
             <div className="flex items-center gap-2 mb-2">
               <Badge variant="outline" className={TIMING_CONFIG.short_term.className}>
                 Short-term
               </Badge>
               <span className="text-xs text-muted-foreground">{shortTermRecs.length} actions</span>
             </div>
             <div className="space-y-2">
               {shortTermRecs.map(rec => <RecItem key={rec.priority} rec={rec} />)}
             </div>
           </div>
         )}
 
         {/* Medium-term Actions */}
         {mediumTermRecs.length > 0 && (
           <div>
             <div className="flex items-center gap-2 mb-2">
               <Badge variant="outline" className={TIMING_CONFIG.medium_term.className}>
                 Medium-term
               </Badge>
               <span className="text-xs text-muted-foreground">{mediumTermRecs.length} actions</span>
             </div>
             <div className="space-y-2">
               {mediumTermRecs.map(rec => <RecItem key={rec.priority} rec={rec} />)}
             </div>
           </div>
         )}
 
         {/* Expected Impact Path */}
         <div className="mt-4 pt-4 border-t">
           <h4 className="text-sm font-medium text-foreground mb-3">Expected Impact Path for R002</h4>
           <div className="flex items-center justify-center flex-wrap gap-2">
             {[
               { label: 'Current', value: '9.1' },
               { label: 'After Recovery', value: '12-14', delta: '+3-5' },
               { label: 'After OTP Fix', value: '20-24', delta: '+8-10' },
               { label: 'After Training', value: '25-31', delta: '+5-7' },
               { label: 'Target', value: '30+', delta: '' },
             ].map((step, idx, arr) => (
               <div key={idx} className="flex items-center gap-2">
                 <div className={cn(
                   "px-3 py-2 rounded-lg text-center border",
                   idx === 0 && "bg-red-500/10 border-red-500/30",
                   idx === arr.length - 1 && "bg-emerald-500/10 border-emerald-500/30",
                   idx > 0 && idx < arr.length - 1 && "bg-muted/50"
                 )}>
                   <p className="text-xs text-muted-foreground">{step.label}</p>
                   <p className="text-sm font-bold text-foreground">{step.value}</p>
                   {step.delta && <p className="text-xs text-emerald-600">{step.delta}</p>}
                 </div>
                 {idx < arr.length - 1 && (
                   <ArrowRight className="h-4 w-4 text-muted-foreground" />
                 )}
               </div>
             ))}
           </div>
           <p className="text-xs text-muted-foreground text-center mt-2">Timeline: 3-4 months</p>
         </div>
       </CardContent>
     </Card>
   );
 });