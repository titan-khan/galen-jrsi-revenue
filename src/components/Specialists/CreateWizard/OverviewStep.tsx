import { Check, AlertTriangle, Sparkles, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BusinessView, BusinessViewConfig, SpecialistDomain, Specialist } from '@/types/specialist';
import { BusinessViewPicker } from './BusinessViewPicker';
import { SpecialistTag } from '@/components/ui/specialist-tag';
import { generateHandle } from '@/utils/handle';
import { cn } from '@/lib/utils';

const BUSINESS_VIEW_TO_DOMAIN: Record<BusinessView, SpecialistDomain> = {
  revenue: 'commercial',
  operations: 'supply-chain',
  'customer-experience': 'customer',
  'cost-optimization': 'finance',
  'risk-compliance': 'supply-chain',
  'fleet-assets': 'supply-chain',
};

interface UseCaseSuggestion {
  id: string;
  name: string;
  description: string;
  reason?: string;
  accentType?: 'warning' | 'info';
}

interface DuplicateMatch {
  specialist: Specialist;
  level: 'exact' | 'similar';
  reason?: 'name' | 'handle';
}

interface OverviewStepProps {
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  businessView: BusinessView | null;
  onBusinessViewChange: (view: BusinessView) => void;
  businessViewConfigs: BusinessViewConfig[];
  useCaseSuggestions?: UseCaseSuggestion[];
  selectedUseCaseId?: string | null;
  onUseCaseSuggestionClick?: (useCase: UseCaseSuggestion) => void;
  duplicateMatch?: DuplicateMatch | null;
}

export const OverviewStep = ({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  businessView,
  onBusinessViewChange,
  businessViewConfigs,
  useCaseSuggestions = [],
  selectedUseCaseId = null,
  onUseCaseSuggestionClick,
  duplicateMatch = null,
}: OverviewStepProps) => {
  const previewHandle = generateHandle(name);
  const previewDomain = businessView ? BUSINESS_VIEW_TO_DOMAIN[businessView] : 'supply-chain';

  return (
    <div className="space-y-8">
      {/* 1) Business View */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Business View</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the business area to monitor
          </p>
        </div>
        <BusinessViewPicker
          views={businessViewConfigs}
          selected={businessView}
          onSelect={onBusinessViewChange}
        />
      </div>

      {/* 2) Suggested Focus Areas — shown after selecting a business view */}
      {businessView && useCaseSuggestions.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Suggested Focus Areas</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a starting point or customize the name and description below
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {useCaseSuggestions.map((uc) => {
              const isSelected = selectedUseCaseId === uc.id;
              return (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => onUseCaseSuggestionClick?.(uc)}
                  className={cn(
                    'relative text-left rounded-lg border p-3.5 transition-all duration-150',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <p className={cn(
                    'text-sm font-medium mb-1 pr-6',
                    isSelected ? 'text-primary' : 'text-foreground',
                  )}>
                    {uc.name}
                  </p>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">
                    {uc.description}
                  </p>
                  {uc.reason && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {uc.accentType === 'warning' ? (
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-blue-500 shrink-0" />
                      )}
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          uc.accentType === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-blue-600 dark:text-blue-400',
                        )}
                      >
                        {uc.reason}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3) Specialist Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Specialist Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Revenue Monitor"
          className="h-10"
        />
        {previewHandle && !duplicateMatch && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Handle:</span>
            <SpecialistTag handle={previewHandle} domain={previewDomain} size="sm" />
          </div>
        )}
        {duplicateMatch && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border p-3 mt-2',
              duplicateMatch.level === 'exact'
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20'
                : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/40 dark:bg-yellow-950/10',
            )}
          >
            <Copy className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                {duplicateMatch.level === 'exact'
                  ? duplicateMatch.reason === 'handle'
                    ? `Handle @${duplicateMatch.specialist.handle} is already taken`
                    : 'A specialist with this name already exists'
                  : 'A similar specialist already exists'}
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                <span className="font-medium">{duplicateMatch.specialist.name}</span>
                {duplicateMatch.reason === 'handle' && (
                  <span> (@{duplicateMatch.specialist.handle})</span>
                )}
                {duplicateMatch.specialist.description && (
                  <span> — {duplicateMatch.specialist.description.slice(0, 80)}{duplicateMatch.specialist.description.length > 80 ? '…' : ''}</span>
                )}
              </p>
              {duplicateMatch.level === 'exact' && (
                <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mt-1">
                  {duplicateMatch.reason === 'handle'
                    ? 'Choose a different name to generate a unique handle.'
                    : 'Choose a different name or modify the existing specialist instead.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4) Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What should this specialist focus on?"
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
};
