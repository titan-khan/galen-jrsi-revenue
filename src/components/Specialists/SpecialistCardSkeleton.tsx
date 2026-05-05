 import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SpecialistCardSkeleton() {
  return (
     <Card className="border">
       <CardContent className="p-5">
         <div className="flex gap-4">
           {/* Large Icon Skeleton */}
           <Skeleton className="h-12 w-12 rounded-xl shrink-0" />

           {/* Content Skeleton */}
           <div className="flex-1 min-w-0">
             {/* Name + Handle */}
             <div className="flex items-center gap-2 mb-1">
               <Skeleton className="h-5 w-32" />
               <Skeleton className="h-4 w-16" />
            </div>
 
             {/* Description */}
             <Skeleton className="h-4 w-full mb-1" />
             <Skeleton className="h-4 w-3/4 mb-3" />
 
             {/* Footer */}
             <div className="flex items-center gap-3">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-3 w-16" />
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
