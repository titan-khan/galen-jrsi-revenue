import { Sparkles } from 'lucide-react';
import { MonitoringRulesEditor } from '@/components/Specialists/MonitoringRulesEditor';
import { MonitoringRule, MetricConfig } from '@/types/specialist';

interface RulesStepProps {
  rules: MonitoringRule[];
  onChange: (rules: MonitoringRule[]) => void;
  hasAutoRules?: boolean;
  availableMetrics?: MetricConfig[];
}

export const RulesStep = ({ rules, onChange, hasAutoRules, availableMetrics }: RulesStepProps) => {
  return (
    <div className="space-y-4">
      {/* Info banner */}
      {hasAutoRules && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200/50 dark:border-purple-800/50">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
              AI-Recommended Rules
            </p>
            <p className="text-xs text-purple-700/80 dark:text-purple-300/80 leading-relaxed">
              These monitoring rules are intelligently generated based on your metrics' current performance and historical patterns. Review the recommendations and adjust thresholds to match your needs.
            </p>
          </div>
        </div>
      )}

      <MonitoringRulesEditor
        rules={rules}
        onChange={onChange}
        availableMetrics={availableMetrics}
      />
    </div>
  );
};
