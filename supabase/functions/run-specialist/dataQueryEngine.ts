// =============================================================================
// Data Query Engine — Resolves query specs from knowledge context or domain fallback
// =============================================================================

import type { QueryContextSpec } from "./types.ts";

interface DataSourceConfig {
  table: string;
  select: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  orderBy?: { field: string; ascending: boolean };
  limit?: number;
  dateField?: string;
  rollingMonths?: number;
}

interface KnowledgeContextLike {
  dataSources?: DataSourceConfig[];
}

/**
 * Resolve query specs from knowledge context, falling back to the domain switch.
 * Returns null if knowledge context provides data sources (caller should use those),
 * or the original domain-based specs if not.
 */
export function resolveQuerySpecsFromContext(
  knowledgeContext: KnowledgeContextLike | null | undefined,
  rollingFloorDate: string,
): QueryContextSpec[] | null {
  if (!knowledgeContext?.dataSources?.length) {
    return null; // caller should use existing getQuerySpecsForDomain()
  }

  return knowledgeContext.dataSources.map((ds) => {
    const spec: QueryContextSpec = {
      table: ds.table,
      select: ds.select,
      limit: ds.limit,
    };

    // Build filters, injecting rolling date window if dateField is specified
    const filters: { field: string; operator: string; value: unknown }[] = [];

    if (ds.dateField) {
      filters.push({
        field: ds.dateField,
        operator: "gte",
        value: rollingFloorDate,
      });
    }

    if (ds.filters) {
      for (const f of ds.filters) {
        filters.push({
          field: f.field,
          operator: f.operator,
          value: f.value,
        });
      }
    }

    if (filters.length > 0) {
      spec.filters = filters;
    }

    if (ds.orderBy) {
      spec.orderBy = ds.orderBy;
    }

    return spec;
  });
}
