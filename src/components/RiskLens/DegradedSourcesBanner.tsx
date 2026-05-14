import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEGRADED_SOURCES } from '@/data/riskLensData';

export function DegradedSourcesBanner() {
  return (
    <Alert className="border-amber-500/60 bg-amber-500/10 text-foreground">
      <AlertTriangle className="h-4 w-4 text-amber-700" />
      <AlertDescription className="text-sm">
        <span className="font-semibold">{DEGRADED_SOURCES.count} sources degraded.</span>{' '}
        {DEGRADED_SOURCES.detail}
      </AlertDescription>
    </Alert>
  );
}
