import type { IndustryTemplate } from "@/types/commandCenter";

// Industry templates - kpiIds reference database-backed metrics when available
export const industryTemplates: IndustryTemplate[] = [
  {
    id: "logistics",
    name: "Logistics & Transportation",
    industry: "Transportation",
    description: "Metrics for transportation and logistics operations",
    icon: "Truck",
    kpiIds: ["metric-econ-revenue", "metric-econ-order-count", "metric-econ-transacting-users"],
    northStarId: "metric-econ-revenue",
  },
];

export const getTemplateById = (id: string) => industryTemplates.find((t) => t.id === id);
