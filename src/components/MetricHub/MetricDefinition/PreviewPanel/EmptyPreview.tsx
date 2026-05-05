import { BarChart3, TrendingUp, Sparkles } from "lucide-react";

const EmptyPreview = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-accent flex items-center justify-center animate-pulse">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="absolute -bottom-1 -left-3 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Start Creating Your Definition
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Select a measure and a time dimension to see a live preview of your metric
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
        <span>Waiting for configuration...</span>
      </div>
    </div>
  );
};

export default EmptyPreview;
