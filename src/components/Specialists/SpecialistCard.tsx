 import { memo } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { 
   Package, TrendingUp, Heart, DollarSign, Truck, ShoppingCart, 
   PieChart, Tag, MessageSquare, Calculator, Wallet
 } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { SpecialistTag } from '@/components/ui/specialist-tag';
 import { Specialist } from '@/types/specialist';
 import { useSpecialists } from '@/contexts/SpecialistsContext';
 import { cn } from '@/lib/utils';
 import { usePrefetch } from '@/hooks/usePrefetch';
 import { cacheKeys } from '@/lib/cacheKeys';
 import { 
   getLatestFindings,
   getSpecialistInsights,
   getExecutiveSummary,
   getSpecialistRecommendations,
   getRootCauses,
   getCrossSpecialistSignals,
   getAISummary,
   getSpecialistRunHistory,
 } from '@/services/specialistRunService';
 
 const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
   Package, TrendingUp, Heart, DollarSign, Truck, ShoppingCart,
   PieChart, Tag, MessageSquare, Calculator, Wallet,
 };
 
 // Domain color mapping for large icons
 const DOMAIN_ICON_COLORS: Record<string, string> = {
   'supply-chain': 'bg-blue-600',
   'commercial': 'bg-emerald-600',
   'customer': 'bg-purple-600',
   'finance': 'bg-amber-600',
 };
 
 interface SpecialistCardProps {
   specialist: Specialist;
 }
 
 export const SpecialistCard = memo(function SpecialistCard({ specialist }: SpecialistCardProps) {
   const navigate = useNavigate();
   const { getTemplateById } = useSpecialists();
   const { onHoverStart, onHoverEnd } = usePrefetch();
   
   const template = getTemplateById(specialist.templateId);
   const IconComponent = template?.icon ? ICON_MAP[template.icon] : Package;
   const iconBg = DOMAIN_ICON_COLORS[specialist.domain] || 'bg-primary';
 
   // Truncate description to ~80 chars
   const shortDescription = specialist.description.length > 80 
     ? specialist.description.slice(0, 77) + '...' 
     : specialist.description;
 
   const pendingActions = specialist.performance.actionsRecommended - specialist.performance.actionsApproved;

   // Prefetch specialist run data on hover
   const handleMouseEnter = () => {
     onHoverStart(
       cacheKeys.specialists.runs(specialist.id),
       async () => {
         // Prefetch all specialist run data in parallel
         const [
           findings,
           insights,
           summary,
           recommendations,
           rootCauses,
           correlations,
           aiSummary,
           history,
         ] = await Promise.all([
           getLatestFindings(specialist.id),
           getSpecialistInsights(specialist.id),
           getExecutiveSummary(specialist.id),
           getSpecialistRecommendations(specialist.id),
           getRootCauses(specialist.id),
           getCrossSpecialistSignals(specialist.id),
           getAISummary(specialist.id),
           getSpecialistRunHistory(specialist.id, 20),
         ]);
         
         return {
           findings,
           insights,
           summary,
           recommendations,
           rootCauses,
           correlations,
           aiSummary,
           history,
         };
       }
     );
   };
 
   return (
     <Card 
       className="cursor-pointer hover:shadow-md transition-all group border"
       onClick={() => navigate(`/specialists/${specialist.id}`)}
       onMouseEnter={handleMouseEnter}
       onMouseLeave={onHoverEnd}
     >
       <CardContent className="p-5">
         <div className="flex gap-4">
           {/* Large Icon */}
           <div className={cn(
             "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
             iconBg
           )}>
             <IconComponent className="h-6 w-6 text-white" />
           </div>
 
           {/* Content */}
           <div className="flex-1 min-w-0">
             {/* Name + Handle */}
             <div className="flex items-center gap-2 mb-0.5">
               <h3 className="font-semibold text-foreground truncate">{specialist.name}</h3>
               <SpecialistTag handle={specialist.handle} domain={specialist.domain} size="sm" />
             </div>
 
             {/* Description */}
             <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
               {shortDescription}
             </p>
 
             {/* Footer: Creator + Pending count */}
             <div className="flex items-center gap-3 text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5">
                 <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                   {specialist.createdBy.charAt(0).toUpperCase()}
                 </div>
                 <span className="capitalize">{specialist.createdBy}</span>
               </div>
               {pendingActions > 0 && (
                 <div className="flex items-center gap-1">
                   <span className="text-muted-foreground">⊞</span>
                   <span>{pendingActions}</span>
                 </div>
               )}
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 });
