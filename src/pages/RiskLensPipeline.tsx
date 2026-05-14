import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { HealthDot } from '@/components/RiskLens/HealthDot';
import { RiskLensShell } from '@/components/RiskLens/RiskLensShell';
import { SOURCE_HEALTH_ROWS } from '@/data/pipelineData';

const RiskLensPipeline = () => {
  const degraded = SOURCE_HEALTH_ROWS.filter((s) => s.status !== 'Healthy');

  return (
    <RiskLensShell>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            External sources
          </h2>
          {degraded.length > 0 && (
            <Badge variant="outline" className="border-amber-500/60 text-amber-700">
              {degraded.length} degraded
            </Badge>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The connectors feeding the monitor. Click a source to see its query construction, cadence,
          and per-source monthly budget.
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Throughput</th>
                <th className="px-3 py-2 text-left">Errors 24h</th>
                <th className="px-3 py-2 text-left">Last fetch</th>
                <th className="px-3 py-2 text-left">Cost / mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SOURCE_HEALTH_ROWS.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2.5">
                    {row.connectorId ? (
                      <Link
                        to={`/research/risk-lens/pipeline/connector/${row.connectorId}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{row.name}</span>
                    )}
                    <div className="text-[11px] text-muted-foreground">{row.kind}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <HealthDot status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs">{row.throughput}</td>
                  <td
                    className={
                      row.errors === '0' || row.errors === '—'
                        ? 'px-3 py-2.5 text-xs text-muted-foreground'
                        : 'px-3 py-2.5 text-xs text-amber-700'
                    }
                  >
                    {row.errors}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.lastFetch}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.costMonthly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RiskLensShell>
  );
};

export default RiskLensPipeline;
