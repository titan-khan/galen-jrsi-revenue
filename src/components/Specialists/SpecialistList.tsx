import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpecialistCard } from './SpecialistCard';
import { SpecialistCardSkeleton } from './SpecialistCardSkeleton';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { QueryStateWrapper } from '@/components/ui/QueryStateWrapper';
import { cacheKeys } from '@/lib/cacheKeys';

export function SpecialistList() {
  const navigate = useNavigate();
  const { specialists, isLoading, isValidating } = useSpecialists();

  return (
    <QueryStateWrapper queryKey={cacheKeys.specialists.list()}>
      <div className="space-y-4">
        {/* Background Refresh Indicator - Requirement 2.2 */}
        {isValidating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Refreshing specialists in background...</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All Specialists</h2>
            <p className="text-sm text-muted-foreground">
              {specialists.length} specialists monitoring your operations
            </p>
          </div>
          <Button onClick={() => navigate('/specialists/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        {/* Specialist Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SpecialistCardSkeleton key={i} />
            ))}
          </div>
        ) : specialists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialists.map((specialist) => (
              <SpecialistCard key={specialist.id} specialist={specialist} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                No specialists found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first specialist to get started.
              </p>
              <Button onClick={() => navigate('/specialists/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Specialist
              </Button>
            </div>
          </div>
        )}
      </div>
    </QueryStateWrapper>
  );
}
