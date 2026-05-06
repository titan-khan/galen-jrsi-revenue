import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { runSpecialist } from '@/services/specialistRunService';
import {
  BusinessView,
  MetricConfig,
  MonitoringRule,
  KnowledgeFile,
  NotificationConfig,
} from '@/types/specialist';
import type { MetricDomain } from '@/types/metric';
import { generateHandle } from '@/utils/handle';
import { matchSuggestedMetrics, autoGenerateRulesFromMetrics, BUSINESS_VIEW_TO_DOMAIN } from '@/utils/specialistDefaults';
import { getMetricDomainsForBusinessView } from '@/data/pkbRegistry';
import { WizardLayout } from '@/components/Specialists/CreateWizard/WizardLayout';
import { WizardStep } from '@/components/Specialists/CreateWizard/WizardSidebar';
import { OverviewStep } from '@/components/Specialists/CreateWizard/OverviewStep';
import { MonitoringScopeStep } from '@/components/Specialists/CreateWizard/MonitoringScopeStep';
import { RulesStep } from '@/components/Specialists/CreateWizard/RulesStep';
import { KnowledgeStep } from '@/components/Specialists/CreateWizard/KnowledgeStep';
import { AlertsStep } from '@/components/Specialists/CreateWizard/AlertsStep';

type StepId = 'overview' | 'monitoring' | 'rules' | 'knowledge' | 'alerts';

const STEP_ORDER: StepId[] = ['overview', 'monitoring', 'rules', 'knowledge', 'alerts'];

const DEFAULT_NOTIFICATION: NotificationConfig = {
  channels: { inApp: true, email: false, slack: false },
  frequency: 'daily',
  severityFilter: ['critical', 'high'],
};

const HireSpecialist = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addSpecialist, businessViewConfigs, specialists } = useSpecialists();
  const { metrics: allSystemMetrics, aiSummary, aiSuggestions } = useMetrics();

  // ── Prefill data from Galen Action CTA (recommendation detail panel) ──
  const prefillData = (location.state as { prefill?: {
    type: string;
    suggestedName: string;
    suggestedBusinessView: string;
    suggestedMetrics: string[];
    suggestedDescription: string;
  } } | null)?.prefill;

  // Current step & visited tracking
  const [currentStep, setCurrentStep] = useState<StepId>('overview');
  const [highestStepReached, setHighestStepReached] = useState(0); // index into STEP_ORDER

  // Step 1: Overview
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [businessView, setBusinessView] = useState<BusinessView | null>(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);

  // Step 2: Monitoring
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [drivers, setDrivers] = useState<MetricConfig[]>([]);

  // Step 3: Rules
  const [monitoringRules, setMonitoringRules] = useState<MonitoringRule[]>([]);

  // Step 4: Knowledge
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [instructions, setInstructions] = useState('');

  // Step 5: Alerts
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATION);
  const [runAfterCreate, setRunAfterCreate] = useState(true);

  // ── Prefill from Galen Action CTA (recommendation detail panel) ──
  useEffect(() => {
    if (!prefillData || prefillData.type !== 'create_specialist') return;
    if (prefillData.suggestedName) setName(prefillData.suggestedName);
    if (prefillData.suggestedDescription) setDescription(prefillData.suggestedDescription);
    const VALID_BV = ['revenue', 'operations', 'customer-experience', 'cost-optimization', 'risk-compliance', 'fleet-assets'];
    if (VALID_BV.includes(prefillData.suggestedBusinessView)) {
      setBusinessView(prefillData.suggestedBusinessView as BusinessView);
    }
    if (prefillData.suggestedMetrics?.length) {
      setMetrics(matchSuggestedMetrics(prefillData.suggestedMetrics, allSystemMetrics));
    }
    window.history.replaceState({}, document.title); // prevent re-prefill on refresh
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── BusinessView → metric domain mapping (matched to actual metric domains) ──
  // Local map removed — single source now lives in pkbRegistry.ts via
  // getMetricDomainsForBusinessView(). See import at top of file.

  // Fully dynamic focus area suggestions based on real metric performance
  const useCaseSuggestions = useMemo(() => {
    if (!businessView) return [];

    // Single source of truth (pkbRegistry.ts). Returns [] for unknown views
    // instead of crashing.
    const domains = getMetricDomainsForBusinessView(businessView);

    // Get domain-relevant metrics; fall back to all metrics if none match
    let domainMetrics = allSystemMetrics.filter(
      (m) => m.domain && domains.includes(m.domain),
    );
    if (domainMetrics.length === 0) {
      domainMetrics = [...allSystemMetrics];
    }

    // AI suggestions for this domain — STRICT filter, no fallback. Falling
    // back to "all aiSuggestions" used to leak unrelated metrics across views
    // (e.g. JRSI accident metrics into Revenue & Arrears), breaking MECE.
    const domainAiSuggestions = aiSuggestions.filter(
      (s) => s.domain && domains.includes(s.domain as MetricDomain),
    );

    type Suggestion = {
      id: string;
      name: string;
      description: string;
      reason?: string;
      accentType?: 'warning' | 'info';
    };

    const suggestions: Suggestion[] = [];
    const usedMetricIds = new Set<string>();

    const addSuggestion = (s: Suggestion, metricId: string) => {
      if (suggestions.length >= 3) return;
      if (usedMetricIds.has(metricId)) return;
      usedMetricIds.add(metricId);
      suggestions.push(s);
    };

    // 1) Critical metrics → "Monitoring" suggestions (highest priority)
    const criticalMetrics = domainMetrics
      .filter((m) => m.displayData.status === 'critical')
      .sort((a, b) => a.displayData.changePercent - b.displayData.changePercent);
    for (const m of criticalMetrics) {
      addSuggestion({
        id: `ai-issue-${m.id}`,
        name: `${m.name} Monitoring`,
        description: `${m.name} sudah masuk zona kritis. Spesialis ini menelusuri kabupaten, segmen kepatuhan, dan kanal yang paling banyak menyumbang, lalu mengusulkan intervensi cepat untuk memutus laju kerugian PKB & SWDKLLJ.`,
        reason: `critical · ${m.displayData.currentValue}`,
        accentType: 'warning',
      }, m.id);
    }

    // 2) Warning metrics → "Monitoring" suggestions
    const warningMetrics = domainMetrics
      .filter((m) => m.displayData.status === 'warning')
      .sort((a, b) => a.displayData.changePercent - b.displayData.changePercent);
    for (const m of warningMetrics) {
      addSuggestion({
        id: `ai-issue-${m.id}`,
        name: `${m.name} Monitoring`,
        description: `${m.name} mulai bergerak ke arah yang merugikan. Spesialis ini menangkap sinyal sejak dini di tiap kabupaten dan segmen kepatuhan, lalu menyiapkan langkah pencegahan sebelum tren berubah jadi lonjakan tunggakan.`,
        reason: `warning · ${m.displayData.currentValue}`,
        accentType: 'warning',
      }, m.id);
    }

    // 3) Declining metrics → "Optimization" suggestions
    const decliningMetrics = domainMetrics
      .filter((m) => m.displayData.changePercent < -3)
      .sort((a, b) => a.displayData.changePercent - b.displayData.changePercent);
    for (const m of decliningMetrics) {
      addSuggestion({
        id: `ai-trend-${m.id}`,
        name: `${m.name} Optimization`,
        description: `Saat ${m.name} bergerak signifikan, spesialis ini mengurai akar masalahnya per kabupaten dan segmen kepatuhan, lalu menyusun rencana perbaikan agar realisasi PKB & SWDKLLJ ke depan tetap terkendali.`,
        reason: `${m.displayData.changePercent.toFixed(1)}% decline`,
        accentType: 'warning',
      }, m.id);
    }

    // 4) AI suggestions → "Specialist" suggestions
    for (const ai of domainAiSuggestions) {
      addSuggestion({
        id: `ai-suggest-${ai.metricId}`,
        name: `${ai.metricName} Specialist`,
        description: `Spesialis ini mengawal ${ai.metricName} secara proaktif — membaca sinyal kepatuhan PKB di tiap segmen dan kabupaten, lalu memberi rekomendasi konkret yang menjaga realisasi pendapatan dan kualitas portofolio kepatuhan.`,
        reason: `${Math.round(ai.confidence * 100)}% confidence`,
        accentType: 'info',
      }, ai.metricId);
    }

    // 5) Healthy metrics with notable positive performance → "Tracking" suggestions
    const healthyMetrics = domainMetrics
      .filter((m) => m.displayData.status === 'healthy' && Math.abs(m.displayData.changePercent) > 2)
      .sort((a, b) => Math.abs(b.displayData.changePercent) - Math.abs(a.displayData.changePercent));
    for (const m of healthyMetrics) {
      addSuggestion({
        id: `ai-track-${m.id}`,
        name: `${m.name} Tracking`,
        description: `Spesialis ini mengikuti pergerakan ${m.name} dari waktu ke waktu — pola musiman, perubahan struktural, dan deviasi dari target framework Piramida Kepatuhan Pajak — supaya indikator ini selaras dengan misi recovery PKB & SWDKLLJ.`,
        reason: `${m.displayData.changePercent > 0 ? '+' : ''}${m.displayData.changePercent.toFixed(1)}%`,
        accentType: 'info',
      }, m.id);
    }

    return suggestions.slice(0, 3);
  }, [businessView, allSystemMetrics, aiSuggestions]);

  // When business view changes, reset dependents
  const handleBusinessViewChange = useCallback((view: BusinessView) => {
    setBusinessView(view);
    setSelectedUseCaseId(null);
    setMetrics([]);
    setDrivers([]);
    setMonitoringRules([]);
  }, []);

  // When a use case suggestion is clicked, prefill name & description
  const handleUseCaseSuggestionClick = useCallback(
    (uc: { id: string; name: string; description: string }) => {
      setSelectedUseCaseId(uc.id);
      setName(uc.name);
      setDescription(uc.description);
    },
    [],
  );

  // ── Duplicate detection ──────────────────────────────────────────────
  const duplicateMatch = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;

    const newHandle = generateHandle(name);

    for (const existing of specialists) {
      const existingName = existing.name.trim().toLowerCase();

      // Exact name match → strong duplicate
      if (existingName === trimmed) {
        return { specialist: existing, level: 'exact' as const, reason: 'name' as const };
      }

      // Handle collision — different names that produce the same @handle
      if (newHandle && existing.handle === newHandle) {
        return { specialist: existing, level: 'exact' as const, reason: 'handle' as const };
      }

      // Same description (non-empty) + significant metric overlap → likely duplicate
      const descTrimmed = description.trim().toLowerCase();
      const existingDesc = existing.description.trim().toLowerCase();
      if (
        descTrimmed &&
        existingDesc === descTrimmed &&
        metrics.length > 0 &&
        existing.metrics &&
        existing.metrics.length > 0
      ) {
        const existingIds = new Set(existing.metrics.map((m) => m.id));
        const overlap = metrics.filter((m) => existingIds.has(m.id)).length;
        const overlapRatio = overlap / Math.max(metrics.length, existing.metrics.length);
        if (overlapRatio >= 0.5) {
          return { specialist: existing, level: 'similar' as const };
        }
      }

      // Same metrics (high overlap) with similar name → likely duplicate
      if (
        metrics.length > 0 &&
        existing.metrics &&
        existing.metrics.length > 0
      ) {
        const existingIds = new Set(existing.metrics.map((m) => m.id));
        const overlap = metrics.filter((m) => existingIds.has(m.id)).length;
        const total = Math.max(metrics.length, existing.metrics.length);
        const overlapRatio = overlap / total;

        // Check name similarity (one contains the other, or share most words)
        const nameWords = new Set(trimmed.split(/\s+/));
        const existingWords = new Set(existingName.split(/\s+/));
        const commonWords = [...nameWords].filter((w) => existingWords.has(w)).length;
        const wordOverlap = commonWords / Math.max(nameWords.size, existingWords.size);

        if (overlapRatio >= 0.8 && wordOverlap >= 0.5) {
          return { specialist: existing, level: 'similar' as const };
        }
      }
    }
    return null;
  }, [name, description, metrics, specialists]);

  // ── Metrics overlap detection (checked on monitoring step) ──────────
  const metricsOverlapMatch = useMemo(() => {
    if (metrics.length === 0) return null;

    const newIds = new Set(metrics.map((m) => m.id));

    for (const existing of specialists) {
      if (!existing.metrics || existing.metrics.length === 0) continue;

      const existingIds = new Set(existing.metrics.map((m) => m.id));

      // 100% overlap: every new metric exists in the existing specialist
      // AND every existing metric exists in the new set (identical sets)
      const newInExisting = metrics.every((m) => existingIds.has(m.id));
      const existingInNew = existing.metrics.every((m) => newIds.has(m.id));

      if (newInExisting && existingInNew) {
        return existing;
      }
    }
    return null;
  }, [metrics, specialists]);

  // Check if a step's required fields are filled
  const isStepValid = useCallback(
    (stepId: StepId): boolean => {
      switch (stepId) {
        case 'overview':
          return name.trim() !== '' && businessView !== null && duplicateMatch?.level !== 'exact';
        case 'monitoring':
          return metrics.length > 0 && !metricsOverlapMatch;
        case 'rules':
          return true; // rules are optional
        case 'knowledge':
          return true; // knowledge is optional
        case 'alerts':
          return true; // always has defaults
        default:
          return false;
      }
    },
    [name, businessView, metrics.length, duplicateMatch, metricsOverlapMatch],
  );

  // A step shows a checkmark only if user has moved past it (visited a later step)
  const isStepComplete = useCallback(
    (stepId: StepId): boolean => {
      const stepIndex = STEP_ORDER.indexOf(stepId);
      return stepIndex < highestStepReached;
    },
    [highestStepReached],
  );

  // Step accessibility: strict sequential — can only access steps up to highestStepReached
  const isStepAccessible = useCallback(
    (stepId: StepId): boolean => {
      const stepIndex = STEP_ORDER.indexOf(stepId);
      return stepIndex <= highestStepReached;
    },
    [highestStepReached],
  );

  // Can proceed to next step? (based on whether required fields are filled)
  const canProceed = isStepValid(currentStep);

  // Build steps array for sidebar
  const steps: WizardStep[] = STEP_ORDER.map((id, index) => ({
    id,
    label: {
      overview: 'Overview',
      monitoring: 'Monitoring',
      rules: 'Rules',
      knowledge: 'Knowledge',
      alerts: 'Alerts',
    }[id],
    number: index + 1,
    isComplete: isStepComplete(id),
    isAccessible: isStepAccessible(id),
  }));

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

  // Auto-generate rules when advancing from monitoring → rules (if none exist)
  const autoGenerateRules = useCallback(() => {
    if (monitoringRules.length > 0) return; // Don't overwrite user edits
    const rules = autoGenerateRulesFromMetrics(metrics, allSystemMetrics);
    if (rules.length > 0) setMonitoringRules(rules);
  }, [metrics, monitoringRules.length, allSystemMetrics]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      // Auto-generate rules when moving from monitoring to rules
      if (currentStep === 'monitoring' && STEP_ORDER[nextIndex] === 'rules') {
        autoGenerateRules();
      }

      setCurrentStep(STEP_ORDER[nextIndex]);
      // Advance the highest step reached so previous steps show checkmarks
      setHighestStepReached((prev) => Math.max(prev, nextIndex));
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    } else {
      navigate('/specialists');
    }
  };

  const handleStepClick = (stepId: string) => {
    if (isStepAccessible(stepId as StepId)) {
      setCurrentStep(stepId as StepId);
    }
  };

  const handleSubmit = async () => {
    if (!businessView) return;

    const newId = await addSpecialist({
      name: name || 'New Specialist',
      handle: generateHandle(name) || 'specialist',
      description: description || '',
      templateId: '',
      domain: BUSINESS_VIEW_TO_DOMAIN[businessView] as any,
      status: 'active',
      createdBy: 'user',
      monitoringScope: {
        dataSources: [],
        refreshRate: notificationConfig.frequency === 'realtime' ? 'realtime' : 'hourly',
        metrics: metrics.map((m) => m.name),
      },
      monitoringRules,
      performance: {
        insightsGenerated: 0,
        actionsRecommended: 0,
        actionsApproved: 0,
        falsePositiveRate: 0,
        valueDelivered: 0,
        approvalRate: 0,
      },
      businessView,
      useCaseId: selectedUseCaseId || undefined,
      metrics,
      drivers,
      knowledgeBase: {
        files: knowledgeFiles,
        instructions,
      },
      notifications: notificationConfig,
    });

    // Trigger first run in background if toggle is on
    if (runAfterCreate && newId) {
      runSpecialist(newId, 'manual').catch((err) =>
        console.error('[HireSpecialist] Auto-run failed:', err),
      );
    }

    navigate(`/specialists/${newId}`, {
      state: { initialRunning: runAfterCreate },
    });
  };

  return (
    <WizardLayout
      currentStep={currentStep}
      steps={steps}
      onStepClick={handleStepClick}
      onBack={handleBack}
      onNext={handleNext}
      canProceed={canProceed}
      isLastStep={isLastStep}
      onSubmit={handleSubmit}
    >
      {currentStep === 'overview' && (
        <OverviewStep
          name={name}
          onNameChange={setName}
          description={description}
          onDescriptionChange={setDescription}
          businessView={businessView}
          onBusinessViewChange={handleBusinessViewChange}
          businessViewConfigs={businessViewConfigs}
          useCaseSuggestions={useCaseSuggestions}
          selectedUseCaseId={selectedUseCaseId}
          onUseCaseSuggestionClick={handleUseCaseSuggestionClick}
          duplicateMatch={duplicateMatch}
        />
      )}

      {currentStep === 'monitoring' && (
        <MonitoringScopeStep
          businessView={businessView}
          metrics={metrics}
          onMetricsChange={setMetrics}
          drivers={drivers}
          onDriversChange={setDrivers}
          aiSuggestions={aiSuggestions}
          aiSummary={aiSummary}
          metricsOverlapMatch={metricsOverlapMatch}
        />
      )}

      {currentStep === 'rules' && (
        <RulesStep
          rules={monitoringRules}
          onChange={setMonitoringRules}
          hasAutoRules={monitoringRules.length > 0}
          availableMetrics={[...metrics, ...drivers]}
        />
      )}

      {currentStep === 'knowledge' && (
        <KnowledgeStep
          files={knowledgeFiles}
          onFilesChange={setKnowledgeFiles}
          instructions={instructions}
          onInstructionsChange={setInstructions}
        />
      )}

      {currentStep === 'alerts' && (
        <AlertsStep
          config={notificationConfig}
          onChange={setNotificationConfig}
          runAfterCreate={runAfterCreate}
          onRunAfterCreateChange={setRunAfterCreate}
        />
      )}
    </WizardLayout>
  );
};

export default HireSpecialist;
