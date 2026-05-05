import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { 
  CompanyProfile, 
  DEFAULT_COMPANY_PROFILE,
  Industry,
  BusinessModel,
  StrategicGoal,
  CompanyStage,
  CustomerType,
  SalesMotion
} from "@/types/companyProfile";

const STORAGE_KEY = 'lovable_company_profile';

interface OrganizationContextType {
  // Company Profile
  companyProfile: CompanyProfile;
  isOnboarded: boolean;
  
  // Context completeness (0-100)
  contextCompleteness: number;
  
  // Update functions
  updateProfile: (updates: Partial<CompanyProfile>) => void;
  setIndustry: (industry: Industry) => void;
  setBusinessModels: (models: BusinessModel[]) => void;
  setPrimaryGoal: (goal: StrategicGoal) => void;
  setSecondaryGoals: (goals: StrategicGoal[]) => void;
  setCompanyStage: (stage: CompanyStage) => void;
  setCustomerType: (type: CustomerType) => void;
  setSalesMotion: (motion: SalesMotion) => void;
  setNorthStarMetricId: (metricId: string | undefined) => void;
  
  // Onboarding
  completeOnboarding: () => void;
  resetProfile: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Calculate how complete the context is (for progressive context collection)
const calculateCompleteness = (profile: CompanyProfile): number => {
  let score = 0;
  const totalFields = 8;
  
  if (profile.name && profile.name !== 'My Company') score++;
  if (profile.industry !== 'other') score++;
  if (profile.businessModels.length > 0) score++;
  if (profile.stage) score++;
  if (profile.customerType) score++;
  if (profile.primaryGoal) score++;
  if (profile.secondaryGoals.length > 0) score++;
  if (profile.northStarMetricId) score++;
  
  return Math.round((score / totalFields) * 100);
};

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_COMPANY_PROFILE;
      }
    }
    return DEFAULT_COMPANY_PROFILE;
  });
  
  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY}_onboarded`) === 'true';
  });

  // Persist to localStorage whenever profile changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companyProfile));
  }, [companyProfile]);

  const contextCompleteness = calculateCompleteness(companyProfile);

  const updateProfile = useCallback((updates: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setIndustry = useCallback((industry: Industry) => {
    updateProfile({ industry, businessModels: [] }); // Reset models when industry changes
  }, [updateProfile]);

  const setBusinessModels = useCallback((models: BusinessModel[]) => {
    updateProfile({ businessModels: models });
  }, [updateProfile]);

  const setPrimaryGoal = useCallback((goal: StrategicGoal) => {
    updateProfile({ primaryGoal: goal });
  }, [updateProfile]);

  const setSecondaryGoals = useCallback((goals: StrategicGoal[]) => {
    updateProfile({ secondaryGoals: goals });
  }, [updateProfile]);

  const setCompanyStage = useCallback((stage: CompanyStage) => {
    updateProfile({ stage });
  }, [updateProfile]);

  const setCustomerType = useCallback((type: CustomerType) => {
    updateProfile({ customerType: type });
  }, [updateProfile]);

  const setSalesMotion = useCallback((motion: SalesMotion) => {
    updateProfile({ salesMotion: motion });
  }, [updateProfile]);

  const setNorthStarMetricId = useCallback((metricId: string | undefined) => {
    updateProfile({ northStarMetricId: metricId });
  }, [updateProfile]);

  const completeOnboarding = useCallback(() => {
    setIsOnboarded(true);
    localStorage.setItem(`${STORAGE_KEY}_onboarded`, 'true');
  }, []);

  const resetProfile = useCallback(() => {
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    setIsOnboarded(false);
    localStorage.removeItem(`${STORAGE_KEY}_onboarded`);
  }, []);

  return (
    <OrganizationContext.Provider 
      value={{ 
        companyProfile, 
        isOnboarded,
        contextCompleteness,
        updateProfile,
        setIndustry,
        setBusinessModels,
        setPrimaryGoal,
        setSecondaryGoals,
        setCompanyStage,
        setCustomerType,
        setSalesMotion,
        setNorthStarMetricId,
        completeOnboarding,
        resetProfile,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
