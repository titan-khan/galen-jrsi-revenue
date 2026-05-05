import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AlertBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-accent border-b border-border">
      <div className="flex items-center gap-3">
        <Info className="w-5 h-5 text-primary" />
        <p className="text-sm text-foreground">
          Welcome to Galen! Start by following metrics that matter to you, or create your own definitions.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className="text-muted-foreground hover:text-foreground"
      >
        Got it
      </Button>
    </div>
  );
};

export default AlertBanner;
