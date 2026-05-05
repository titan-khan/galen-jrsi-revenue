 import { memo } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { 
   AlertTriangle, ArrowRight, 
   Package, TrendingUp, Heart, DollarSign, Link2, Plus
 } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { useSpecialists } from '@/contexts/SpecialistsContext';
 import { SpecialistCard } from './SpecialistCard';
 import { 
   TRANSPORTX_EXECUTIVE_SUMMARIES,
   TRANSPORTX_RECOMMENDATIONS,
   TOTAL_VALUE_AT_STAKE,
   formatIDR
 } from '@/data/transportXSpecialists';
 import { cn } from '@/lib/utils';
 
 const DOMAIN_ICONS = {
   'supply-chain': Package,
   'commercial': TrendingUp,
   'customer': Heart,
   'finance': DollarSign,
 };
 
 export const ExecutiveDashboard = memo(function ExecutiveDashboard() {
   const navigate = useNavigate();
   const { specialists } = useSpecialists();
 
   const criticalSpecialists = specialists.filter(s => {
     const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[s.id];
     return summary?.severity === 'critical';
   });
 
   const highPrioritySpecialists = specialists.filter(s => {
     const summary = TRANSPORTX_EXECUTIVE_SUMMARIES[s.id];
     return summary?.severity === 'high';
   });
 
   const pendingActions = TRANSPORTX_RECOMMENDATIONS.filter(r => r.status === 'proposed');
   const immediate24h = pendingActions.filter(r => r.deadline?.includes('24') || r.deadline?.includes('48'));
   const immediateWeek = pendingActions.filter(r => r.deadline?.includes('week'));
 
   // Sort specialists: critical first, then high, then others
   const sortedSpecialists = [...specialists].sort((a, b) => {
     const summaryA = TRANSPORTX_EXECUTIVE_SUMMARIES[a.id];
     const summaryB = TRANSPORTX_EXECUTIVE_SUMMARIES[b.id];
     const priorityA = summaryA?.severity === 'critical' ? 0 : summaryA?.severity === 'high' ? 1 : 2;
     const priorityB = summaryB?.severity === 'critical' ? 0 : summaryB?.severity === 'high' ? 1 : 2;
     return priorityA - priorityB;
   });
 
   return (
     <div className="space-y-6">
       {/* Hero Sentence - The "Why" */}
       <div className="text-center py-4 px-6 rounded-lg bg-muted/30 border">
         <p className="text-base text-foreground">
           <span className="font-semibold">Route R002</span> is your operational epicenter. 
           Fixing OTP there will improve NPS and recover{' '}
           <span className="text-red-600 font-bold">{formatIDR(4_000_000_000)}/year</span>.
         </p>
       </div>
 
       {/* Causal Chain - Above the fold */}
       <Card>
         <CardHeader className="pb-2">
           <CardTitle className="text-sm font-medium flex items-center gap-2">
             <Link2 className="h-4 w-4" />
             Root Cause Chain
           </CardTitle>
         </CardHeader>
         <CardContent className="pt-2">
           <div className="flex items-center justify-center gap-3 py-3">
             {['Poor OTP\n(40.6%)', 'Low NPS\n(19.8)', 'High Cancellations\n(38%)', 'Revenue Loss\n(Rp 4B/year)'].map((step, idx, arr) => (
               <div key={idx} className="flex items-center gap-3">
                 <div className={cn(
                   "px-3 py-2 rounded-lg text-center border min-w-[100px]",
                   idx === 0 && "border-blue-500/50 bg-blue-500/10",
                   idx === 1 && "border-purple-500/50 bg-purple-500/10",
                   idx === 2 && "border-amber-500/50 bg-amber-500/10",
                   idx === 3 && "border-red-500/50 bg-red-500/10"
                 )}>
                   <p className="text-xs font-medium text-foreground whitespace-pre-line">{step}</p>
                 </div>
                 {idx < arr.length - 1 && (
                   <ArrowRight className="h-4 w-4 text-muted-foreground" />
                 )}
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
 
       {/* Quick Stats Row */}
       <div className="grid grid-cols-4 gap-3">
         <Card>
           <CardContent className="pt-4 pb-3 px-4">
             <p className="text-xs text-muted-foreground mb-1">Value at Stake</p>
             <p className="text-xl font-bold text-red-600">{formatIDR(TOTAL_VALUE_AT_STAKE.idr)}</p>
             <p className="text-[10px] text-muted-foreground">/year</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4 pb-3 px-4">
             <p className="text-xs text-muted-foreground mb-1">Critical</p>
             <p className="text-xl font-bold text-red-600">{criticalSpecialists.length}</p>
             <p className="text-[10px] text-muted-foreground">specialists</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4 pb-3 px-4">
             <p className="text-xs text-muted-foreground mb-1">High Priority</p>
             <p className="text-xl font-bold text-amber-600">{highPrioritySpecialists.length}</p>
             <p className="text-[10px] text-muted-foreground">specialists</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4 pb-3 px-4">
             <p className="text-xs text-muted-foreground mb-1">Pending Actions</p>
             <p className="text-xl font-bold text-primary">{pendingActions.length}</p>
             <p className="text-[10px] text-muted-foreground">to review</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Specialist Cards Grid */}
       <div>
         <div className="flex items-center justify-between mb-3">
           <h3 className="text-sm font-semibold text-foreground">Your Specialists</h3>
           <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => navigate('/specialists/new')}>
             <Plus className="h-3 w-3" />
             Hire
           </Button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
           {sortedSpecialists.map(specialist => (
             <SpecialistCard key={specialist.id} specialist={specialist} />
           ))}
         </div>
       </div>
 
       {/* Immediate Action Plan */}
       <Card>
         <CardHeader className="pb-2">
           <div className="flex items-center justify-between">
             <CardTitle className="text-sm font-medium">Immediate Actions</CardTitle>
             <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
               View All
               <ArrowRight className="h-3 w-3" />
             </Button>
           </div>
         </CardHeader>
         <CardContent className="pt-2">
           <div className="grid grid-cols-2 gap-4">
             {/* 24-48 Hours */}
             <div>
               <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
                 <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">
                   24-48h
                 </Badge>
                 {immediate24h.length} actions
               </h4>
               <div className="space-y-1.5">
                 {immediate24h.slice(0, 3).map(action => (
                   <div key={action.id} className="flex items-center justify-between p-2 rounded bg-muted/50 border">
                     <p className="text-xs font-medium text-foreground truncate flex-1">{action.title}</p>
                     <Badge variant="outline" className="ml-2 text-[10px]">
                       {formatIDR(action.impact.value)}
                     </Badge>
                   </div>
                 ))}
               </div>
             </div>
 
             {/* 1 Week */}
             <div>
               <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
                 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                   1 Week
                 </Badge>
                 {immediateWeek.length} actions
               </h4>
               <div className="space-y-1.5">
                 {immediateWeek.slice(0, 3).map(action => (
                   <div key={action.id} className="flex items-center justify-between p-2 rounded bg-muted/50 border">
                     <p className="text-xs font-medium text-foreground truncate flex-1">{action.title}</p>
                     <Badge variant="outline" className="ml-2 text-[10px]">
                       {formatIDR(action.impact.value)}
                     </Badge>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 });
