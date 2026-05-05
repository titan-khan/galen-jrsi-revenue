import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { ChangeImpactPreview } from "@/components/MetricHub/Relationships/ChangeImpactPreview";
import { 
  INDUSTRY_LABELS, 
  STAGE_LABELS, 
  CUSTOMER_TYPE_LABELS,
  Industry,
  CompanyStage,
  CustomerType,
  SalesMotion
} from "@/types/companyProfile";

const SALES_MOTION_LABELS: Record<SalesMotion, string> = {
  plg: 'Product-Led Growth',
  'sales-led': 'Sales-Led',
  hybrid: 'Hybrid',
  'partner-led': 'Partner-Led',
};

// Business model options per industry
const BUSINESS_MODEL_OPTIONS: Record<Industry, Array<{ value: string; label: string }>> = {
  saas: [
    { value: 'subscription', label: 'Subscription' },
    { value: 'usage-based', label: 'Usage-Based' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'freemium', label: 'Freemium' },
  ],
  retail: [
    { value: 'online', label: 'Online / E-commerce' },
    { value: 'omnichannel', label: 'Omnichannel' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'd2c', label: 'Direct-to-Consumer' },
    { value: 'b2b-wholesale', label: 'B2B Wholesale' },
  ],
  bfsi: [
    { value: 'retail-banking', label: 'Retail Banking' },
    { value: 'lending', label: 'Lending' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'wealth-management', label: 'Wealth Management' },
    { value: 'payments', label: 'Payments' },
  ],
  logistics: [
    { value: '3pl', label: '3PL' },
    { value: 'last-mile', label: 'Last-Mile Delivery' },
    { value: 'freight', label: 'Freight' },
    { value: 'warehousing', label: 'Warehousing' },
    { value: 'courier', label: 'Courier' },
  ],
  healthcare: [
    { value: 'provider', label: 'Healthcare Provider' },
    { value: 'payer', label: 'Payer / Insurance' },
    { value: 'pharma', label: 'Pharmaceutical' },
    { value: 'digital-health', label: 'Digital Health' },
    { value: 'medical-devices', label: 'Medical Devices' },
  ],
  manufacturing: [
    { value: 'discrete', label: 'Discrete Manufacturing' },
    { value: 'process', label: 'Process Manufacturing' },
    { value: 'mixed-mode', label: 'Mixed Mode' },
    { value: 'make-to-order', label: 'Make-to-Order' },
    { value: 'make-to-stock', label: 'Make-to-Stock' },
  ],
  other: [
    { value: 'custom', label: 'Custom' },
  ],
};

export const BusinessProfileSection = () => {
  const { 
    companyProfile, 
    updateProfile,
    setIndustry,
    setBusinessModels,
    setCompanyStage,
    setCustomerType,
    setSalesMotion,
    contextCompleteness,
  } = useOrganization();

  // State for change impact preview
  const [pendingIndustryChange, setPendingIndustryChange] = useState<Industry | null>(null);

  const toggleBusinessModel = (model: string) => {
    const current = companyProfile.businessModels;
    if (current.includes(model)) {
      setBusinessModels(current.filter(m => m !== model));
    } else {
      setBusinessModels([...current, model]);
    }
  };

  const handleIndustryChange = (newIndustry: Industry) => {
    // If there's an existing industry, show impact preview
    if (companyProfile.industry && companyProfile.industry !== newIndustry) {
      setPendingIndustryChange(newIndustry);
    } else {
      setIndustry(newIndustry);
    }
  };

  const confirmIndustryChange = () => {
    if (pendingIndustryChange) {
      setIndustry(pendingIndustryChange);
      setPendingIndustryChange(null);
    }
  };

  const businessModelOptions = BUSINESS_MODEL_OPTIONS[companyProfile.industry] || [];
  const showSalesMotion = companyProfile.industry === 'saas' || companyProfile.customerType === 'b2b';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Define your company's industry and business model
              </CardDescription>
            </div>
            <Badge variant={contextCompleteness >= 75 ? "default" : "secondary"}>
              {contextCompleteness}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={companyProfile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            placeholder="Enter company name"
          />
        </div>

        {/* Industry Selection */}
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select 
            value={companyProfile.industry} 
            onValueChange={(value: Industry) => handleIndustryChange(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(INDUSTRY_LABELS) as [Industry, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Changing industry will update metric recommendations
          </p>
        </div>

        {/* Business Models (Multi-select) */}
        <div className="space-y-2">
          <Label>Business Model(s)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select all that apply - hybrid models are supported
          </p>
          <div className="flex flex-wrap gap-2">
            {businessModelOptions.map(option => (
              <Badge
                key={option.value}
                variant={companyProfile.businessModels.includes(option.value) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleBusinessModel(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Company Stage */}
        <div className="space-y-2">
          <Label>Company Stage</Label>
          <Select 
            value={companyProfile.stage} 
            onValueChange={(value: CompanyStage) => setCompanyStage(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STAGE_LABELS) as [CompanyStage, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Type */}
        <div className="space-y-2">
          <Label>Customer Type</Label>
          <Select 
            value={companyProfile.customerType} 
            onValueChange={(value: CustomerType) => setCustomerType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CUSTOMER_TYPE_LABELS) as [CustomerType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sales Motion (conditional) */}
        {showSalesMotion && (
          <div className="space-y-2">
            <Label>Sales Motion</Label>
            <Select 
              value={companyProfile.salesMotion || 'hybrid'} 
              onValueChange={(value: SalesMotion) => setSalesMotion(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sales motion" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SALES_MOTION_LABELS) as [SalesMotion, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Change Impact Preview Modal */}
    <ChangeImpactPreview
      open={!!pendingIndustryChange}
      onOpenChange={(open) => !open && setPendingIndustryChange(null)}
      changeType="industry"
      currentValue={companyProfile.industry}
      newValue={pendingIndustryChange || ''}
      currentLabel={INDUSTRY_LABELS[companyProfile.industry]}
      newLabel={pendingIndustryChange ? INDUSTRY_LABELS[pendingIndustryChange] : ''}
      onConfirm={confirmIndustryChange}
    />
  </>
  );
};
