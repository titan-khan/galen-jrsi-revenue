import { createContext, useContext, useRef, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Operations Center context - manages specialists state
import {
  Specialist,
  SpecialistTemplate,
  DomainConfig,
  TeamPerformance,
  BusinessViewConfig,
  UseCase,
} from '@/types/specialist';
import {
  fetchSpecialists as fetchSpecialistsFromDb,
  createSpecialist as createSpecialistInDb,
  updateSpecialistDb,
  deleteAgentDb,
} from '@/services/agentsService';
import { cacheKeys } from '@/lib/cacheKeys';
import { QUERY_CONFIGS } from '@/lib/queryClient';
import { ContextErrorBoundary } from '@/components/ErrorBoundaries';

// Domain configurations for UI
export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    id: 'road-safety',
    name: 'Keselamatan Jalan',
    icon: 'ShieldAlert',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-l-red-500',
  },
  {
    id: 'insurance',
    name: 'Santunan & Klaim',
    icon: 'Wallet',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-l-emerald-500',
  },
  {
    id: 'data-ops',
    name: 'Operasional Data',
    icon: 'CheckCircle',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-l-slate-500',
  },
];

// Specialist templates based on PRD Section 4
export const SPECIALIST_TEMPLATES: SpecialistTemplate[] = [
  // JRSI — ROAD SAFETY SPECIALISTS
  {
    id: 'template-accident-overview',
    name: 'Accident Overview Specialist',
    handle: 'accident-overview',
    description: 'Monitors kecelakaan trends, fatalitas rate, dan distribusi kejadian per wilayah dan waktu.',
    icon: 'ShieldAlert',
    domain: 'road-safety',
    monitors: ['Total kecelakaan', 'Korban MD & LL', 'Fatalitas rate', 'Distribusi per kabupaten'],
    detects: ['Spike kejadian bulanan', 'Fatalitas rate tinggi', 'Hotspot kabupaten', 'Weekend pattern anomaly'],
    recommends: ['Fokus patrol di hotspot', 'Intervensi waktu puncak', 'Kampanye safety targeted', 'Koordinasi lintas kabupaten'],
    defaultRules: [
      {
        id: 'acc-spike',
        name: 'Monthly Accident Spike',
        whenCondition: 'Kejadian bulanan meningkat',
        whenValue: 20,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        forOptions: ['Semua kabupaten', 'Top 5 kabupaten', 'Kota Palangka Raya'],
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'acc-fatality',
        name: 'Fatalitas Rate Alert',
        whenCondition: 'Fatalitas rate melebihi',
        whenValue: 25,
        whenUnit: '%',
        forScope: 'Semua wilayah',
        severity: 'critical',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-trl-risk',
    name: 'TRL Risk Specialist',
    handle: 'trl-risk',
    description: 'Menganalisis Traffic Risk Level per cluster lokasi untuk identifikasi blackspot.',
    icon: 'MapPin',
    domain: 'road-safety',
    monitors: ['TRL composite score', 'Cluster frequency', 'Severity score', 'Blackspot ranking'],
    detects: ['Cluster baru high-risk', 'Score escalation', 'Repeat-location pattern', 'Infrastructure-related clusters'],
    recommends: ['Blackspot remediation', 'Engineering countermeasures', 'Traffic calming measures', 'Speed management'],
    defaultRules: [
      {
        id: 'trl-high',
        name: 'High TRL Score Alert',
        whenCondition: 'TRL composite score melebihi',
        whenValue: 60,
        whenUnit: 'points',
        forScope: 'Semua cluster',
        severity: 'critical',
        enabled: true,
      },
      {
        id: 'trl-new-cluster',
        name: 'New Blackspot Detection',
        whenCondition: 'Cluster baru dengan kejadian lebih dari',
        whenValue: 3,
        whenUnit: 'kejadian',
        forScope: 'Semua lokasi',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-vehicle-analysis',
    name: 'Vehicle Analysis Specialist',
    handle: 'vehicle',
    description: 'Menganalisis distribusi kendaraan terlibat, merk dominan, dan pola kendaraan.',
    icon: 'Car',
    domain: 'road-safety',
    monitors: ['Jenis kendaraan terlibat', '% sepeda motor', 'Top brand/model', 'Vehicle count consistency'],
    detects: ['Dominasi tipe kendaraan', 'Brand-specific patterns', 'Mismatch data kendaraan', 'Trend perubahan komposisi'],
    recommends: ['Safety riding program', 'Target brand-specific campaign', 'Helmet enforcement', 'Vehicle inspection focus'],
    defaultRules: [
      {
        id: 'veh-motor',
        name: 'Sepeda Motor Dominance Alert',
        whenCondition: '% sepeda motor melebihi',
        whenValue: 70,
        whenUnit: '%',
        forScope: 'Semua wilayah',
        severity: 'high',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-santunan',
    name: 'Santunan Financial Specialist',
    handle: 'santunan',
    description: 'Monitors penyaluran santunan Jasa Raharja untuk korban kecelakaan.',
    icon: 'Wallet',
    domain: 'insurance',
    monitors: ['Total klaim A (MD)', 'Total klaim B (LL)', 'Total santunan tersalurkan', 'Avg klaim per korban'],
    detects: ['Santunan spike', 'Klaim anomali', 'Tabrak lari rate tinggi', 'Unprocessed claims'],
    recommends: ['Fraud investigation trigger', 'Claims processing audit', 'Budget reallocation', 'Tabrak lari follow-up'],
    defaultRules: [
      {
        id: 'fin-tabrak-lari',
        name: 'Tabrak Lari Rate Alert',
        whenCondition: 'Tabrak lari rate melebihi',
        whenValue: 10,
        whenUnit: '%',
        forScope: 'Semua wilayah',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'fin-santunan-spike',
        name: 'Santunan Monthly Spike',
        whenCondition: 'Total santunan bulanan meningkat',
        whenValue: 30,
        whenUnit: '%',
        forScope: 'Semua kabupaten',
        severity: 'medium',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-cause-analysis',
    name: 'Cause Analysis Specialist (4M)',
    handle: 'cause-4m',
    description: 'Menganalisis faktor penyebab kecelakaan menggunakan framework 4M (Man/Machine/Medium/Method).',
    icon: 'Search',
    domain: 'road-safety',
    monitors: ['Distribusi faktor 4M', 'Cause detection coverage', 'NLP extraction quality', 'Root cause patterns'],
    detects: ['Dominasi faktor Man', 'Infrastructure-related causes (Medium)', 'Vehicle defect patterns (Machine)', 'Low cause detection'],
    recommends: ['Targeted education programs', 'Infrastructure improvement requests', 'Vehicle inspection campaigns', 'NLP model improvement'],
    defaultRules: [
      {
        id: 'cause-coverage',
        name: 'Low Cause Detection Alert',
        whenCondition: 'Cause detection coverage di bawah',
        whenValue: 30,
        whenUnit: '%',
        forScope: 'Per batch',
        severity: 'medium',
        enabled: true,
      },
    ],
  },
  {
    id: 'template-data-quality',
    name: 'Data Quality Specialist',
    handle: 'data-quality',
    description: 'Monitors kualitas data IRSMS: completeness, GPS validity, duplicates, dan NLP extraction.',
    icon: 'CheckCircle',
    domain: 'data-ops',
    monitors: ['Field completeness', 'GPS validity', 'Duplicate rate', 'Vehicle consistency', 'NLP quality'],
    detects: ['Missing required fields', 'Invalid GPS coordinates', 'Duplicate records', 'Data entry anomalies'],
    recommends: ['Data entry training', 'GPS device calibration', 'Deduplication rules', 'NLP model retraining'],
    defaultRules: [
      {
        id: 'dq-completeness',
        name: 'Completeness Drop Alert',
        whenCondition: 'Required field completeness di bawah',
        whenValue: 95,
        whenUnit: '%',
        forScope: 'Per batch',
        severity: 'high',
        enabled: true,
      },
      {
        id: 'dq-gps',
        name: 'GPS Validity Alert',
        whenCondition: 'GPS validity rate di bawah',
        whenValue: 98,
        whenUnit: '%',
        forScope: 'Per batch',
        severity: 'high',
        enabled: true,
      },
    ],
  },
];

// ============================================
// BUSINESS VIEW CONFIGS (New Creation Wizard)
// ============================================
export const BUSINESS_VIEW_CONFIGS: BusinessViewConfig[] = [
  {
    id: 'accident-monitoring',
    name: 'Accident Monitoring',
    icon: 'ShieldAlert',
    description: 'Kecelakaan trends, severity, distribusi wilayah dan waktu',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-l-red-500',
  },
  {
    id: 'risk-mapping',
    name: 'Risk Mapping',
    icon: 'MapPin',
    description: 'TRL scoring, blackspot identification, GPS cluster analysis',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-l-orange-500',
  },
  {
    id: 'vehicle-intelligence',
    name: 'Vehicle Intelligence',
    icon: 'Car',
    description: 'Kendaraan terlibat, merk dominan, tipe analysis',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-l-blue-500',
  },
  {
    id: 'santunan-claims',
    name: 'Santunan & Claims',
    icon: 'Wallet',
    description: 'Penyaluran santunan Jasa Raharja, klaim A & B, fraud signal',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-l-emerald-500',
  },
  {
    id: 'cause-analysis',
    name: 'Cause Analysis (4M)',
    icon: 'Search',
    description: 'Faktor penyebab Man/Machine/Medium/Method, NLP extraction',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-l-purple-500',
  },
  {
    id: 'data-quality',
    name: 'Data Quality',
    icon: 'CheckCircle',
    description: 'Completeness, GPS validity, duplicates, NLP quality',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-l-slate-500',
  },
];

// ============================================
// USE CASE CATALOG (18 use cases, 3 per view)
// ============================================
export const USE_CASE_CATALOG: UseCase[] = [
  // ACCIDENT MONITORING
  { id: 'uc-accident-trend', name: 'Accident Trend Monitoring', description: 'Monitor tren kecelakaan bulanan, deteksi spike, dan analisis distribusi per wilayah.', businessView: 'accident-monitoring', defaultMetrics: [{ id: 'M-D1-01', name: 'Total Kecelakaan' }, { id: 'M-D1-07', name: 'Tren Bulanan' }], defaultDrivers: [{ id: 'kabupaten', name: 'Kabupaten/Kota' }, { id: 'hour-bucket', name: 'Waktu Kejadian' }, { id: 'hari', name: 'Hari' }], defaultRules: [{ id: 'uc-acc-spike', name: 'Monthly Spike Alert', whenCondition: 'Kejadian bulanan meningkat', whenValue: 20, whenUnit: '%', forScope: 'Semua kabupaten', severity: 'critical', enabled: true }] },
  { id: 'uc-severity-analysis', name: 'Severity Analysis', description: 'Analisis severity kecelakaan: rasio MD vs LL, fatalitas rate per wilayah dan waktu.', businessView: 'accident-monitoring', defaultMetrics: [{ id: 'M-D1-02', name: 'Total MD' }, { id: 'M-D1-04', name: 'Fatalitas Rate' }], defaultDrivers: [{ id: 'kasus-laka', name: 'Jenis Kecelakaan' }, { id: 'road-geometry', name: 'Geometri Jalan' }, { id: 'road-light', name: 'Kondisi Penerangan' }], defaultRules: [{ id: 'uc-fatal-high', name: 'High Fatality Rate', whenCondition: 'Fatalitas rate melebihi', whenValue: 25, whenUnit: '%', forScope: 'Semua wilayah', severity: 'critical', enabled: true }] },
  { id: 'uc-time-pattern', name: 'Time Pattern Analysis', description: 'Identifikasi pola waktu kejadian: peak hours, weekend vs weekday, distribusi per hari.', businessView: 'accident-monitoring', defaultMetrics: [{ id: 'M-TIME-02', name: 'Hour Bucket Distribution' }, { id: 'M-TIME-03', name: 'Weekend Rate' }], defaultDrivers: [{ id: 'hour-bucket', name: 'Periode Waktu' }, { id: 'is-weekend', name: 'Weekend/Weekday' }, { id: 'hari', name: 'Hari dalam Minggu' }], defaultRules: [{ id: 'uc-peak-alert', name: 'Peak Hour Alert', whenCondition: 'Kejadian di jam puncak melebihi', whenValue: 35, whenUnit: '%', forScope: 'Semua wilayah', severity: 'high', enabled: true }] },
  // RISK MAPPING
  { id: 'uc-blackspot', name: 'Blackspot Identification', description: 'Identifikasi lokasi blackspot berdasarkan GPS clustering dan TRL scoring.', businessView: 'risk-mapping', defaultMetrics: [{ id: 'M-TRL-01', name: 'Cluster Aggregations' }, { id: 'M-TRL-02', name: 'TRL Composite Score' }], defaultDrivers: [{ id: 'cluster-id', name: 'Cluster ID' }, { id: 'road-geometry', name: 'Geometri Jalan' }, { id: 'fungsi-jalan', name: 'Fungsi Jalan' }], defaultRules: [{ id: 'uc-trl-high', name: 'High TRL Score', whenCondition: 'TRL score melebihi', whenValue: 60, whenUnit: 'points', forScope: 'Semua cluster', severity: 'critical', enabled: true }] },
  { id: 'uc-road-infra', name: 'Road Infrastructure Risk', description: 'Analisis risiko berdasarkan kondisi jalan: status, fungsi, geometri, dan surface condition.', businessView: 'risk-mapping', defaultMetrics: [{ id: 'M-TRL-04', name: 'TRL Severity Score' }], defaultDrivers: [{ id: 'status-jalan', name: 'Status Jalan' }, { id: 'surface-cond', name: 'Kondisi Permukaan' }, { id: 'road-geometry', name: 'Geometri' }], defaultRules: [{ id: 'uc-infra-risk', name: 'Infrastructure Risk Alert', whenCondition: 'Kejadian di jalan berlubang melebihi', whenValue: 15, whenUnit: '%', forScope: 'Semua ruas', severity: 'high', enabled: true }] },
  // VEHICLE INTELLIGENCE
  { id: 'uc-vehicle-profile', name: 'Vehicle Profile Analysis', description: 'Analisis profil kendaraan terlibat: dominasi sepeda motor, brand analysis, tipe kendaraan.', businessView: 'vehicle-intelligence', defaultMetrics: [{ id: 'M-D5-03', name: '% Sepeda Motor' }, { id: 'M-D5-04', name: 'Top 10 Brand' }], defaultDrivers: [{ id: 'vehicle-type', name: 'Jenis Kendaraan' }, { id: 'brand', name: 'Brand' }, { id: 'model', name: 'Model' }], defaultRules: [{ id: 'uc-motor-dom', name: 'Motor Dominance Alert', whenCondition: '% sepeda motor melebihi', whenValue: 70, whenUnit: '%', forScope: 'Semua wilayah', severity: 'high', enabled: true }] },
  // SANTUNAN & CLAIMS
  { id: 'uc-claims-monitoring', name: 'Claims Monitoring', description: 'Monitor penyaluran santunan Jasa Raharja: klaim MD, klaim LL, total tersalurkan.', businessView: 'santunan-claims', defaultMetrics: [{ id: 'M-FIN-03', name: 'Total Santunan' }, { id: 'M-FIN-01', name: 'Klaim A (MD)' }], defaultDrivers: [{ id: 'kabupaten', name: 'Kabupaten' }, { id: 'month-year', name: 'Bulan' }, { id: 'severity', name: 'Severity' }], defaultRules: [{ id: 'uc-santunan-spike', name: 'Santunan Spike', whenCondition: 'Total santunan bulanan meningkat', whenValue: 30, whenUnit: '%', forScope: 'Semua kabupaten', severity: 'medium', enabled: true }] },
  { id: 'uc-fraud-signal', name: 'Fraud Signal Detection', description: 'Deteksi sinyal fraud: tabrak lari rate, klaim anomali, pola mencurigakan.', businessView: 'santunan-claims', defaultMetrics: [{ id: 'M-D1-05', name: 'Tabrak Lari Rate' }], defaultDrivers: [{ id: 'sifat-kecelakaan', name: 'Sifat Kecelakaan' }, { id: 'kabupaten', name: 'Kabupaten' }], defaultRules: [{ id: 'uc-tabrak-lari', name: 'Tabrak Lari Alert', whenCondition: 'Tabrak lari rate melebihi', whenValue: 10, whenUnit: '%', forScope: 'Semua wilayah', severity: 'high', enabled: true }] },
  // CAUSE ANALYSIS
  { id: 'uc-4m-analysis', name: '4M Factor Analysis', description: 'Analisis faktor penyebab kecelakaan menggunakan framework 4M.', businessView: 'cause-analysis', defaultMetrics: [{ id: 'M-4M-01', name: 'Distribusi 4M' }, { id: 'M-4M-02', name: 'Cause Coverage' }], defaultDrivers: [{ id: '4m-category', name: 'Kategori 4M' }, { id: 'cause-keyword', name: 'Cause Keyword' }], defaultRules: [{ id: 'uc-cause-low', name: 'Low Detection Coverage', whenCondition: 'Cause detection di bawah', whenValue: 30, whenUnit: '%', forScope: 'Per batch', severity: 'medium', enabled: true }] },
  // DATA QUALITY
  { id: 'uc-dq-monitoring', name: 'Data Quality Monitoring', description: 'Monitor kualitas data IRSMS: completeness, GPS validity, consistency.', businessView: 'data-quality', defaultMetrics: [{ id: 'M-DQ-01', name: 'Completeness Rate' }, { id: 'M-DQ-05', name: 'NLP Quality' }], defaultDrivers: [{ id: 'batch', name: 'Batch' }, { id: 'field', name: 'Field' }], defaultRules: [{ id: 'uc-dq-drop', name: 'Quality Drop Alert', whenCondition: 'Completeness rate di bawah', whenValue: 95, whenUnit: '%', forScope: 'Per batch', severity: 'high', enabled: true }] },
];

interface SpecialistsContextType {
  specialists: Specialist[];
  templates: SpecialistTemplate[];
  domainConfigs: DomainConfig[];
  businessViewConfigs: BusinessViewConfig[];
  useCaseCatalog: UseCase[];
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  addSpecialist: (specialist: Omit<Specialist, 'id' | 'createdAt'>) => Promise<string>;
  updateSpecialist: (id: string, updates: Partial<Specialist>) => Promise<void>;
  deleteSpecialist: (id: string) => Promise<void>;
  getSpecialistById: (id: string) => Specialist | undefined;
  getTemplateById: (id: string) => SpecialistTemplate | undefined;
  getDomainConfig: (domain: string) => DomainConfig | undefined;
  getTeamPerformance: () => TeamPerformance;
  refetch: () => Promise<void>;
}

const SpecialistsContext = createContext<SpecialistsContextType | undefined>(undefined);

export function SpecialistsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pendingSpecialistsRef = useRef<Specialist[]>([]);

  // Use React Query for fetching specialists
  const {
    data: specialists = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: cacheKeys.specialists.list(),
    queryFn: fetchSpecialistsFromDb,
    ...QUERY_CONFIGS.specialists.list,
    // Keep previous data while fetching new data (SWR pattern - Requirement 2.1, 2.2)
    placeholderData: (previousData) => previousData,
  });

  // Track if background revalidation is happening (SWR pattern)
  const isValidating = isFetching && !isLoading;

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load specialists') : null;

  // Mutation for adding a specialist
  const addMutation = useMutation({
    mutationFn: async (specialistData: Omit<Specialist, 'id' | 'createdAt'>) => {
      const newId = await createSpecialistInDb(specialistData);
      return {
        ...specialistData,
        id: newId,
        createdAt: new Date().toISOString(),
      } as Specialist;
    },
    onMutate: async (specialistData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });

      // Snapshot previous value
      const previousSpecialists = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());

      // Optimistically update with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticSpecialist: Specialist = {
        ...specialistData,
        id: tempId,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => [optimisticSpecialist, ...old]
      );

      pendingSpecialistsRef.current = [...pendingSpecialistsRef.current, optimisticSpecialist];

      return { previousSpecialists, tempId };
    },
    onSuccess: (newSpecialist, _variables, context) => {
      // Replace temp specialist with real one
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.map(s => s.id === context?.tempId ? newSpecialist : s)
      );

      // Update pending ref
      pendingSpecialistsRef.current = pendingSpecialistsRef.current.filter(
        s => s.id !== context?.tempId
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousSpecialists) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousSpecialists);
      }
      pendingSpecialistsRef.current = pendingSpecialistsRef.current.filter(
        s => s.id !== context?.tempId
      );
    },
  });

  // Mutation for updating a specialist
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Specialist> }) => {
      await updateSpecialistDb(id, updates);
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.detail(id) });

      // Snapshot previous values
      const previousList = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());
      const previousDetail = queryClient.getQueryData<Specialist>(cacheKeys.specialists.detail(id));

      // Optimistically update list
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.map(s => s.id === id ? { ...s, ...updates } : s)
      );

      // Optimistically update detail if cached
      if (previousDetail) {
        queryClient.setQueryData(
          cacheKeys.specialists.detail(id),
          { ...previousDetail, ...updates }
        );
      }

      return { previousList, previousDetail, id };
    },
    onSuccess: (_data, { id }) => {
      // Invalidate related queries to refetch fresh data
      // Use wildcard pattern to invalidate all specialist-related caches
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
      
      // Also invalidate home data cache as it may depend on specialist data
      queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousList);
      }
      if (context?.previousDetail && context?.id) {
        queryClient.setQueryData(cacheKeys.specialists.detail(context.id), context.previousDetail);
      }
    },
  });

  // Mutation for deleting a specialist
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteAgentDb(id);
      return id;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.specialists.list() });

      // Snapshot previous value
      const previousSpecialists = queryClient.getQueryData<Specialist[]>(cacheKeys.specialists.list());

      // Optimistically remove from list
      queryClient.setQueryData<Specialist[]>(
        cacheKeys.specialists.list(),
        (old = []) => old.filter(s => s.id !== id)
      );

      return { previousSpecialists, id };
    },
    onSuccess: (_data, id) => {
      // Invalidate related queries using wildcard pattern
      // This invalidates all specialist caches (list, detail, runs)
      queryClient.invalidateQueries({ queryKey: cacheKeys.specialists.all });
      
      // Also invalidate home data cache as it may depend on specialist data
      queryClient.invalidateQueries({ queryKey: cacheKeys.home.all });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousSpecialists) {
        queryClient.setQueryData(cacheKeys.specialists.list(), context.previousSpecialists);
      }
    },
  });

  // Wrapper functions to maintain existing API
  const addSpecialist = async (specialistData: Omit<Specialist, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const newSpecialist = await addMutation.mutateAsync(specialistData);
      return newSpecialist.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create specialist';
      console.error('[SpecialistsContext] Failed to create specialist:', err);
      throw new Error(message);
    }
  };

  const updateSpecialist = async (id: string, updates: Partial<Specialist>): Promise<void> => {
    try {
      await updateMutation.mutateAsync({ id, updates });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update specialist';
      console.error('[SpecialistsContext] Failed to update specialist:', err);
      throw new Error(message);
    }
  };

  const deleteSpecialist = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('[SpecialistsContext] Failed to delete specialist:', err);
      throw err;
    }
  };

  const getSpecialistById = (id: string) => {
    const fromState = specialists.find((s) => s.id === id);
    if (fromState) return fromState;
    return pendingSpecialistsRef.current.find((s) => s.id === id);
  };

  const getTemplateById = (id: string) => SPECIALIST_TEMPLATES.find((t) => t.id === id);

  const getDomainConfig = (domain: string) => DOMAIN_CONFIGS.find((d) => d.id === domain);

  const getTeamPerformance = (): TeamPerformance => {
    if (specialists.length === 0) {
      return { totalSpecialists: 0, activeSpecialists: 0, insightsGenerated: 0, actionsRecommended: 0, approvalRate: 0, valueDelivered: 0, pendingApprovals: 0 };
    }
    const active = specialists.filter(s => s.status === 'active');

    return {
      totalSpecialists: specialists.length,
      activeSpecialists: active.length,
      insightsGenerated: specialists.reduce((sum, s) => sum + s.performance.insightsGenerated, 0),
      actionsRecommended: specialists.reduce((sum, s) => sum + s.performance.actionsRecommended, 0),
      approvalRate: specialists.length > 0 ? Math.round(specialists.reduce((sum, s) => sum + s.performance.approvalRate, 0) / specialists.length) : 0,
      valueDelivered: specialists.reduce((sum, s) => sum + s.performance.valueDelivered, 0),
      pendingApprovals: 0, // Now tracked via agent_recommendations table
    };
  };

  // Wrapper for refetch to maintain existing API
  const handleRefetch = async () => {
    await refetch();
  };

  return (
    <ContextErrorBoundary
      contextName="Specialists"
      onReset={handleRefetch}
      fallbackRoute="/"
    >
      <SpecialistsContext.Provider
        value={{
          specialists,
          templates: SPECIALIST_TEMPLATES,
          domainConfigs: DOMAIN_CONFIGS,
          businessViewConfigs: BUSINESS_VIEW_CONFIGS,
          useCaseCatalog: USE_CASE_CATALOG,
          isLoading,
          isValidating,
          error,
          addSpecialist,
          updateSpecialist,
          deleteSpecialist,
          getSpecialistById,
          getTemplateById,
          getDomainConfig,
          getTeamPerformance,
          refetch: handleRefetch,
        }}
      >
        {children}
      </SpecialistsContext.Provider>
    </ContextErrorBoundary>
  );
}

export function useSpecialists() {
  const context = useContext(SpecialistsContext);
  if (!context) {
    throw new Error('useSpecialists must be used within a SpecialistsProvider');
  }
  return context;
}
