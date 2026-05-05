 import { memo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { MessageSquare, ThumbsDown, ThumbsUp, Quote, Link2 } from 'lucide-react';
 import type { VoiceOfCustomer, ThemeWithVerbatims } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface VoiceOfCustomerCardProps {
   data: VoiceOfCustomer;
 }
 
 const ThemeCard = memo(function ThemeCard({ 
   theme, 
   type 
 }: { 
   theme: ThemeWithVerbatims; 
   type: 'detractor' | 'promoter';
 }) {
   return (
     <div className={cn(
       "p-3 rounded-lg border",
       type === 'detractor' && "bg-red-500/5 border-red-500/20",
       type === 'promoter' && "bg-emerald-500/5 border-emerald-500/20"
     )}>
       <div className="flex items-center justify-between mb-2">
         <span className="text-sm font-medium text-foreground">{theme.theme}</span>
         <div className="flex items-center gap-2">
           <Badge variant="outline" className="text-xs">
             {theme.frequency} mentions
           </Badge>
           {theme.percentage && (
             <Badge variant="outline" className={cn(
               "text-xs",
               type === 'detractor' && "bg-red-500/10 text-red-600 border-red-500/30",
               type === 'promoter' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
             )}>
               {theme.percentage}%
             </Badge>
           )}
         </div>
       </div>
       <div className="space-y-1.5">
         {theme.sampleVerbatims.slice(0, 2).map((verbatim, idx) => (
           <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
             <Quote className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-50" />
             <span className="italic">"{verbatim}"</span>
           </div>
         ))}
       </div>
       {theme.correlation && (
         <div className="flex items-center gap-1 text-xs text-primary mt-2 pt-2 border-t border-dashed">
           <Link2 className="h-3 w-3" />
           {theme.correlation}
         </div>
       )}
     </div>
   );
 });
 
 export const VoiceOfCustomerCard = memo(function VoiceOfCustomerCard({ data }: VoiceOfCustomerCardProps) {
   return (
     <Card>
       <CardHeader className="pb-2">
         <div className="flex items-center gap-2">
           <MessageSquare className="h-4 w-4 text-primary" />
           <CardTitle className="text-base">Voice of Customer</CardTitle>
         </div>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {/* Detractor Themes */}
           <div>
             <div className="flex items-center gap-2 mb-3">
               <ThumbsDown className="h-4 w-4 text-red-500" />
               <span className="text-sm font-medium text-foreground">Detractor Themes</span>
               <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                 {data.detractorThemes.reduce((sum, t) => sum + t.frequency, 0)} total mentions
               </Badge>
             </div>
             <div className="space-y-2">
               {data.detractorThemes.map((theme, idx) => (
                 <ThemeCard key={idx} theme={theme} type="detractor" />
               ))}
             </div>
           </div>
 
           {/* Promoter Themes */}
           <div>
             <div className="flex items-center gap-2 mb-3">
               <ThumbsUp className="h-4 w-4 text-emerald-500" />
               <span className="text-sm font-medium text-foreground">Promoter Themes</span>
               <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                 {data.promoterThemes.reduce((sum, t) => sum + t.frequency, 0)} total mentions
               </Badge>
             </div>
             <div className="space-y-2">
               {data.promoterThemes.map((theme, idx) => (
                 <ThemeCard key={idx} theme={theme} type="promoter" />
               ))}
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 });