import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  getDimensionsForBusinessView,
  PKB_DIMENSIONS_BY_ID,
  type DimensionDefinition,
} from '@/data/pkbRegistry';
import type { BusinessView, MonitoringFilter } from '@/types/specialist';

interface FilterRowsProps {
  label: string;
  sublabel?: string;
  businessView: BusinessView | null;
  filters: MonitoringFilter[];
  onChange: (filters: MonitoringFilter[]) => void;
}

type Operator = MonitoringFilter['operator'];

const OPERATORS_BY_TYPE: Record<DimensionDefinition['dataType'], Operator[]> = {
  categorical: ['eq', 'in', 'neq'],
  numeric: ['eq', 'gte', 'lte', 'between'],
  date: ['eq', 'gte', 'lte', 'between'],
};

const OPERATOR_LABEL: Record<Operator, string> = {
  eq: '=',
  neq: '≠',
  in: 'is one of',
  gte: '≥',
  lte: '≤',
  between: 'between',
};

function generateId() {
  return `flt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultValueForOperator(
  dim: DimensionDefinition,
  op: Operator,
): MonitoringFilter['value'] {
  if (op === 'in') return [];
  if (op === 'between') return { min: '', max: '' };
  return '';
}

function CategoricalValuePicker({
  dim,
  operator,
  value,
  onChange,
}: {
  dim: DimensionDefinition;
  operator: Operator;
  value: MonitoringFilter['value'];
  onChange: (v: MonitoringFilter['value']) => void;
}) {
  const options =
    dim.valuesSource?.kind === 'static' ? dim.valuesSource.values : [];

  // Every categorical dimension in the catalog ships static values, so all
  // three operator branches render a real picker (no free-text fallback).
  if (operator === 'in') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1 min-w-[200px] max-w-[360px] p-1.5 border rounded-md bg-background min-h-9">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((v) => v !== opt.id)
                    : [...selected, opt.id],
                )
              }
              className={[
                'px-2 py-0.5 rounded-full text-xs transition-colors',
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // eq / neq → single Select dropdown
  const scalar = typeof value === 'string' ? value : '';
  return (
    <Select value={scalar} onValueChange={(v) => onChange(v)}>
      <SelectTrigger className="h-9 min-w-[200px]">
        <SelectValue placeholder="Pilih value" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NumericOrDateValueInput({
  dim,
  operator,
  value,
  onChange,
}: {
  dim: DimensionDefinition;
  operator: Operator;
  value: MonitoringFilter['value'];
  onChange: (v: MonitoringFilter['value']) => void;
}) {
  const inputType = dim.dataType === 'date' ? 'date' : 'number';

  if (operator === 'between') {
    const range =
      value && typeof value === 'object' && 'min' in value
        ? value
        : { min: '', max: '' };
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type={inputType}
          value={String(range.min)}
          onChange={(e) => onChange({ ...range, min: e.target.value })}
          placeholder="min"
          className="h-9 w-32"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type={inputType}
          value={String(range.max)}
          onChange={(e) => onChange({ ...range, max: e.target.value })}
          placeholder="max"
          className="h-9 w-32"
        />
      </div>
    );
  }

  const scalar = typeof value === 'string' ? value : '';
  return (
    <Input
      type={inputType}
      value={scalar}
      onChange={(e) => onChange(e.target.value)}
      placeholder={dim.dataType === 'date' ? 'YYYY-MM-DD' : '0'}
      className="h-9 w-40"
    />
  );
}

export const FilterRows = ({
  label,
  sublabel,
  businessView,
  filters,
  onChange,
}: FilterRowsProps) => {
  const available = useMemo(
    () => getDimensionsForBusinessView(businessView),
    [businessView],
  );

  const handleAdd = () => {
    if (available.length === 0) return;
    const dim = available[0];
    const op: Operator = OPERATORS_BY_TYPE[dim.dataType][0];
    onChange([
      ...filters,
      {
        id: generateId(),
        dimension: dim.id,
        operator: op,
        value: defaultValueForOperator(dim, op),
      },
    ]);
  };

  const update = (id: string, patch: Partial<MonitoringFilter>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const remove = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>

      {filters.length > 0 && (
        <div className="space-y-2">
          {filters.map((f) => {
            const dim = PKB_DIMENSIONS_BY_ID[f.dimension] ?? available[0];
            if (!dim) return null;
            const allowedOps = OPERATORS_BY_TYPE[dim.dataType];
            return (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border bg-muted/20"
              >
                {/* Dimension selector */}
                <Select
                  value={f.dimension}
                  onValueChange={(newDimId) => {
                    const newDim = PKB_DIMENSIONS_BY_ID[newDimId] ?? dim;
                    const newOp = OPERATORS_BY_TYPE[newDim.dataType][0];
                    update(f.id, {
                      dimension: newDimId,
                      operator: newOp,
                      value: defaultValueForOperator(newDim, newOp),
                    });
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[160px] max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator selector */}
                <Select
                  value={f.operator}
                  onValueChange={(op) =>
                    update(f.id, {
                      operator: op as Operator,
                      value: defaultValueForOperator(dim, op as Operator),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOps.map((op) => (
                      <SelectItem key={op} value={op}>
                        {OPERATOR_LABEL[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value control — varies by type */}
                {dim.dataType === 'categorical' ? (
                  <CategoricalValuePicker
                    dim={dim}
                    operator={f.operator}
                    value={f.value}
                    onChange={(v) => update(f.id, { value: v })}
                  />
                ) : (
                  <NumericOrDateValueInput
                    dim={dim}
                    operator={f.operator}
                    value={f.value}
                    onChange={(v) => update(f.id, { value: v })}
                  />
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="ml-auto p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove filter"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={available.length === 0}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add filter
      </Button>
    </div>
  );
};
