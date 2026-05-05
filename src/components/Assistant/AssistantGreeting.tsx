import { useMemo } from 'react';

export function AssistantGreeting() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">
        {greeting}!
      </h1>
      <p className="text-muted-foreground text-sm">
        Ask anything about your operations, metrics, or get AI-powered recommendations.
      </p>
    </div>
  );
}
