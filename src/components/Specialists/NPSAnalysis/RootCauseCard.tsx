 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { AlertTriangle, Link2, ChevronRight } from 'lucide-react';
 import type { NPSRootCauseItem } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface RootCauseCardProps {
   title: string;
   causes: NPSRootCauseItem[];
   severity?: 'critical' | 'high' | 'medium';
 }
 
 export const RootCauseCard = memo(function RootCauseCard({ title, causes, severity = 'high' }: RootCauseCardProps) {
   return (
     <Card className={cn(
       "border-l-4",
       severity === 'critical' && "border-l-red-500",
       severity === 'high' && "border-l-amber-500",
       severity === 'medium' && "border-l-blue-500"
     )}>
       <CardHeader className="pb-2">
         <div className="flex items-center gap-2">
           <AlertTriangle className={cn(
             "h-4 w-4",
             severity === 'critical' && "text-red-500",
             severity === 'high' && "text-amber-500",
             severity === 'medium' && "text-blue-500"
           )} />
           <CardTitle className="text-base">{title}</CardTitle>
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {causes.map((cause) => (
           <div key={cause.rank} className="space-y-2">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-medium text-muted-foreground">#{cause.rank}</span>
                 <span className="text-sm font-semibold text-foreground">{cause.cause}</span>
                 <Badge variant="outline" className="text-xs">
                   {cause.contributionPct}% contribution
                 </Badge>
               </div>
               <span className="text-xs text-muted-foreground">
                 {cause.confidence}% confidence
               </span>
             </div>
             
             {/* Contribution bar */}
             <div className="h-2 bg-muted rounded-full overflow-hidden">
               <div 
                 className={cn(
                   "h-full rounded-full transition-all",
                   cause.rank === 1 && "bg-red-500",
                   cause.rank === 2 && "bg-amber-500",
                   cause.rank === 3 && "bg-blue-500",
                   cause.rank >= 4 && "bg-muted-foreground"
                 )}
                 style={{ width: `${cause.contributionPct}%` }}
               />
             </div>
 
             {/* Evidence bullets */}
             <ul className="space-y-1 pl-4">
               {cause.evidence.map((evidence, idx) => (
                 <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                   <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                   {evidence}
                 </li>
               ))}
             </ul>
 
             {/* Cross-specialist link */}
             {cause.crossSpecialist && (
               <div className="flex items-center gap-1 text-xs text-primary mt-1">
                 <Link2 className="h-3 w-3" />
                 {cause.crossSpecialist}
               </div>
             )}
           </div>
         ))}
       </CardContent>
     </Card>
   );
 });