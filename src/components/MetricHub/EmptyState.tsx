import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Truck, Sparkles, ArrowRight } from "lucide-react";
import { IndustryTemplateWizard } from "@/components/IndustryTemplate";

const EmptyState = () => {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Illustration */}
      <div className="relative w-64 h-48 mb-8">
        {/* Background shapes */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Chart illustration */}
          <svg viewBox="0 0 200 150" className="w-full h-full">
            {/* Background card */}
            <rect x="30" y="20" width="140" height="110" rx="8" fill="hsl(var(--muted))" />
            
            {/* Chart bars */}
            <rect x="50" y="80" width="20" height="30" rx="2" fill="hsl(var(--primary) / 0.3)" />
            <rect x="80" y="60" width="20" height="50" rx="2" fill="hsl(var(--primary) / 0.5)" />
            <rect x="110" y="40" width="20" height="70" rx="2" fill="hsl(var(--primary) / 0.7)" />
            <rect x="140" y="50" width="20" height="60" rx="2" fill="hsl(var(--primary))" />
            
            {/* Trend line */}
            <path
              d="M50 75 Q80 45, 110 55 T170 35"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            
            {/* Decorative dots */}
            <circle cx="50" cy="75" r="4" fill="hsl(var(--primary))" />
            <circle cx="110" cy="55" r="4" fill="hsl(var(--primary))" />
            <circle cx="170" cy="35" r="4" fill="hsl(var(--primary))" />
          </svg>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-full animate-pulse" />
        <div className="absolute bottom-4 left-0 w-8 h-8 bg-primary/20 rounded-full animate-pulse delay-300" />
      </div>

      {/* Text content */}
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        The best is yet to come
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Follow metrics that matter to you and receive personalized insights. 
        Browse available metrics or create new definitions to get started.
      </p>

      {/* Quick Start CTA */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={() => setWizardOpen(true)}
          className="gap-2"
        >
          <Truck className="h-5 w-5" />
          Set Up Logistics Dashboard
          <Sparkles className="h-4 w-4 ml-1" />
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          Pre-configured metrics & relationships in 1 click
        </p>
      </div>

      <IndustryTemplateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
};

export default EmptyState;
