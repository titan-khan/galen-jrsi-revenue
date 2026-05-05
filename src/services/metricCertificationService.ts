import { supabase } from "@/integrations/supabase/client";
import type { MetricCertification, CertificationLevel } from "@/types/metric";

interface CertificationRow {
  metric_id: string;
  metric_name: string;
  metric_slug: string;
  business_domain: string;
  certification_level: string;
  confidence_score: number | null;
  certified_at: string | null;
  certified_by: string | null;
  last_validated_at: string | null;
  governance_source: string | null;
  owner_team: string | null;
  notes: string | null;
}

const VALID_LEVELS: CertificationLevel[] = ['gold', 'silver', 'bronze'];

function normalize(row: CertificationRow): MetricCertification {
  const level = VALID_LEVELS.includes(row.certification_level as CertificationLevel)
    ? (row.certification_level as CertificationLevel)
    : 'bronze';
  return {
    metricId: row.metric_id,
    metricName: row.metric_name,
    metricSlug: row.metric_slug,
    businessDomain: row.business_domain,
    certificationLevel: level,
    confidenceScore: row.confidence_score,
    certifiedAt: row.certified_at,
    certifiedBy: row.certified_by,
    lastValidatedAt: row.last_validated_at,
    governanceSource: row.governance_source,
    ownerTeam: row.owner_team,
    notes: row.notes,
  };
}

export async function fetchMetricCertifications(): Promise<MetricCertification[]> {
  const { data, error } = await supabase
    .from('v_metric_certifications')
    // @ts-expect-error v_metric_certifications not yet in generated Database types
    .select('metric_id, metric_name, metric_slug, business_domain, certification_level, confidence_score, certified_at, certified_by, last_validated_at, governance_source, owner_team, notes');

  if (error) {
    throw new Error(`Failed to fetch metric certifications: ${error.message}`);
  }
  return (data as unknown as CertificationRow[] ?? []).map(normalize);
}
