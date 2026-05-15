import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { cacheManager } from "@/lib/cacheManager";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import { DevOnly } from "@/components/Debug/DevOnly";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SpecialistsProvider } from "@/contexts/SpecialistsContext";
import { MetricsProvider } from "@/contexts/MetricsContext";
import { AgentsProvider } from "@/contexts/AgentsContext";
import { TrackedRecommendationsProvider } from "@/contexts/TrackedRecommendationsContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { AttributionProvider } from "@/contexts/AttributionContext";
import { RelationshipProvider } from "@/contexts/RelationshipContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { SkillsProvider } from "@/contexts/SkillsContext";
import { DataConnectorProvider } from "@/contexts/DataConnectorContext";
import { InsightPanelProvider } from "@/contexts/InsightPanelContext";
import { AppLayout } from "@/components/AppLayout";

// Route-level code splitting — each page loads only when navigated to
const Home = lazy(() => import("./pages/Home"));
const Metrics = lazy(() => import("./pages/Metrics"));
const Specialists = lazy(() => import("./pages/Specialists"));
const Assistant = lazy(() => import("./pages/Assistant"));
const HireSpecialist = lazy(() => import("./pages/HireSpecialist"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const MetricDefinitionPage = lazy(() => import("./components/MetricHub/MetricDefinition/MetricDefinitionPage"));
const Settings = lazy(() => import("./pages/Settings"));
const DataConnector = lazy(() => import("./pages/DataConnector"));
const CsvUpload = lazy(() => import("./pages/CsvUpload"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Research = lazy(() => import("./pages/Research"));
const RiskLensWorklist = lazy(() => import("./pages/RiskLensWorklist"));
const RiskLensDetail = lazy(() => import("./pages/RiskLensDetail"));
const RiskLensEvidence = lazy(() => import("./pages/RiskLensEvidence"));
const RiskLensPipeline = lazy(() => import("./pages/RiskLensPipeline"));
const RiskLensSignalTrace = lazy(() => import("./pages/RiskLensSignalTrace"));
const RiskLensSourceConnector = lazy(() => import("./pages/RiskLensSourceConnector"));
const RiskLensCostDashboard = lazy(() => import("./pages/RiskLensCostDashboard"));
const RiskLensActiveDiscovery = lazy(() => import("./pages/RiskLensActiveDiscovery"));
const BriefStep1Intent = lazy(() => import("./pages/BriefStep1Intent"));
const BriefStep2Sources = lazy(() => import("./pages/BriefStep2Sources"));
const BriefStep3Readiness = lazy(() => import("./pages/BriefStep3Readiness"));
const ResearchMethodology = lazy(() => import("./pages/ResearchMethodology"));
const RiskLensApprovals = lazy(() => import("./pages/RiskLensApprovals"));
const RiskLensOverview = lazy(() => import("./pages/RiskLensOverview"));
const RisetLanding = lazy(() => import("./pages/RisetLanding"));
const BriefingDetail = lazy(() => import("./pages/BriefingDetail"));
const PolaDetail = lazy(() => import("./pages/PolaDetail"));
const MulaiSesi = lazy(() => import("./pages/MulaiSesi"));
const TinjauRencana = lazy(() => import("./pages/TinjauRencana"));
const SesiRunning = lazy(() => import("./pages/SesiRunning"));
const MentionFeed = lazy(() => import("./pages/MentionFeed"));
const CacheDashboard = lazy(() => import("./components/Debug/CacheDashboard").then(m => ({ default: m.CacheDashboard })));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const EmailSent = lazy(() => import("./pages/EmailSent"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Loading fallback for route transitions
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  // Initialize CacheManager on app startup
  useEffect(() => {
    cacheManager.init().catch((error) => {
      console.error('[App] Failed to initialize CacheManager:', error);
    });
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes - redirect to home if already logged in */}
              <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
              <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
              <Route path="/forgot-password" element={<AuthRedirect><ForgotPassword /></AuthRedirect>} />
              <Route path="/email-sent" element={<EmailSent />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              
              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>

                    <OrganizationProvider>
                      <SpecialistsProvider>
                        <MetricsProvider>
                          <RelationshipProvider>
                            <AgentsProvider>
                              <SkillsProvider>
                                <TrackedRecommendationsProvider>
                                  <DataConnectorProvider>
                                    <SidebarProvider>
                                      <AuditProvider>
                                        <AttributionProvider>
                                          <InsightPanelProvider>
                                            <Toaster />
                                            <Sonner />
                                            <AppLayout />
                                          </InsightPanelProvider>
                                        </AttributionProvider>
                                      </AuditProvider>
                                    </SidebarProvider>
                                  </DataConnectorProvider>
                                </TrackedRecommendationsProvider>
                              </SkillsProvider>
                            </AgentsProvider>
                          </RelationshipProvider>
                        </MetricsProvider>
                      </SpecialistsProvider>
                    </OrganizationProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Home />} />
                <Route path="/metrics" element={<Metrics />} />
                <Route path="/specialists" element={<Specialists />} />
                <Route path="/specialists/new" element={<HireSpecialist />} />
                <Route path="/specialists/:id" element={<AgentDetail />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/assistant/:conversationId" element={<Assistant />} />
                <Route path="/metrics/new" element={<MetricDefinitionPage />} />
                <Route path="/metrics/edit/:id" element={<MetricDefinitionPage />} />
                <Route path="/data-connector" element={<DataConnector />} />
                <Route path="/data-connector/csv-upload" element={<CsvUpload />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/research" element={<RisetLanding />} />
                <Route path="/research/new" element={<MulaiSesi />} />
                <Route path="/research/new/plan" element={<TinjauRencana />} />
                <Route path="/research/mentions" element={<MentionFeed />} />
                <Route path="/research/sesi/:sesiId" element={<BriefingDetail />} />
                <Route path="/research/sesi/:sesiId/running" element={<SesiRunning />} />
                <Route path="/research/sesi/:sesiId/pola/:polaId" element={<PolaDetail />} />
                {/* Legacy Risk Lens routes — kept for deep-links, hidden from primary nav */}
                <Route path="/research/legacy" element={<Research />} />
                <Route path="/research/risk-lens" element={<RiskLensOverview />} />
                <Route path="/research/risk-lens/worklist" element={<RiskLensWorklist />} />
                <Route path="/research/risk-lens/:eventId" element={<RiskLensDetail />} />
                <Route path="/research/risk-lens/:eventId/evidence" element={<RiskLensEvidence />} />
                <Route path="/research/risk-lens/pipeline" element={<RiskLensPipeline />} />
                <Route path="/research/risk-lens/pipeline/signal-trace" element={<RiskLensSignalTrace />} />
                <Route path="/research/risk-lens/pipeline/connector/:sourceId" element={<RiskLensSourceConnector />} />
                <Route path="/research/risk-lens/pipeline/cost" element={<RiskLensCostDashboard />} />
                <Route path="/research/risk-lens/pipeline/discovery" element={<RiskLensActiveDiscovery />} />
                <Route path="/research/monitor/new" element={<BriefStep1Intent />} />
                <Route path="/research/monitor/new/sources" element={<BriefStep2Sources />} />
                <Route path="/research/monitor/new/readiness" element={<BriefStep3Readiness />} />
                <Route path="/research/methodology" element={<ResearchMethodology />} />
                <Route path="/research/risk-lens/approvals" element={<RiskLensApprovals />} />
                {/* Investigation is handled by /assistant — see Research hub */}
                <Route path="/research/investigate" element={<Navigate to="/assistant" replace />} />
                <Route path="/research/investigate/*" element={<Navigate to="/assistant" replace />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/debug/cache" element={<DevOnly><CacheDashboard /></DevOnly>} />
                {/* Redirects from old routes */}
                <Route path="/ai-agents" element={<Navigate to="/specialists" replace />} />
                <Route path="/ai-agents/new" element={<Navigate to="/specialists/new" replace />} />
                <Route path="/ai-agents/:id" element={<Navigate to="/specialists/:id" replace />} />
                <Route path="/agent-insights" element={<Navigate to="/specialists" replace />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
