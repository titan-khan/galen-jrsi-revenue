import { Download, FileText, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAttribution } from "@/contexts/AttributionContext";
import { toast } from "@/hooks/use-toast";

export function MonthlyReportExport() {
  const { performanceSummary, externalFactors, formatCurrency } = useAttribution();

  const generateTextReport = () => {
    if (!performanceSummary) return '';

    const { period, metricName, startValue, endValue, totalChange, totalChangePercentage, galenPercentage, externalPercentage, unexplainedPercentage, attributions, overallConfidence } = performanceSummary;

    let report = `# ${period.label} Performance Report\n\n`;
    report += `## Executive Summary\n\n`;
    report += `${metricName} grew by ${totalChangePercentage.toFixed(1)}% (${formatCurrency(totalChange)}) from ${formatCurrency(startValue)} to ${formatCurrency(endValue)}.\n\n`;
    report += `**Attribution Breakdown:**\n`;
    report += `- Galen-Driven: ${galenPercentage.toFixed(1)}%\n`;
    report += `- External Factors: ${externalPercentage.toFixed(1)}%\n`;
    if (unexplainedPercentage > 0) {
      report += `- Unexplained: ${unexplainedPercentage.toFixed(1)}%\n`;
    }
    report += `\nOverall Confidence: ${overallConfidence.toUpperCase()}\n\n`;

    report += `## Galen-Driven Impact\n\n`;
    const galenItems = attributions.filter(a => a.category.startsWith('galen'));
    galenItems.forEach(item => {
      report += `### ${item.label}\n`;
      report += `- Impact: ${formatCurrency(item.value)} (${item.percentage.toFixed(1)}%)\n`;
      report += `- Confidence: ${item.confidence}\n`;
      if (item.description) report += `- ${item.description}\n`;
      report += '\n';
    });

    report += `## External Factors\n\n`;
    const includedFactors = externalFactors.filter(f => f.isIncluded);
    includedFactors.forEach(factor => {
      report += `### ${factor.name}\n`;
      report += `- Estimated Impact: ${formatCurrency(factor.estimatedImpact)}\n`;
      report += `- Confidence: ${factor.confidence}\n`;
      report += `- Source: ${factor.source}\n\n`;
    });

    report += `---\n`;
    report += `Report generated: ${new Date().toISOString()}\n`;

    return report;
  };

  const generateCSV = () => {
    if (!performanceSummary) return '';

    const { attributions } = performanceSummary;
    
    let csv = 'Category,Label,Value,Percentage,Confidence,Description\n';
    attributions.forEach(attr => {
      csv += `"${attr.category}","${attr.label}",${attr.value},${attr.percentage.toFixed(2)},"${attr.confidence}","${attr.description || ''}"\n`;
    });

    return csv;
  };

  const handleExport = (format: 'text' | 'csv') => {
    const content = format === 'text' ? generateTextReport() : generateCSV();
    const mimeType = format === 'text' ? 'text/markdown' : 'text/csv';
    const extension = format === 'text' ? 'md' : 'csv';
    const filename = `performance-report-${performanceSummary?.period.label.toLowerCase().replace(' ', '-')}.${extension}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: `${filename} has been downloaded.`,
    });
  };

  if (!performanceSummary) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('text')}>
          <FileText className="h-4 w-4 mr-2" />
          Markdown Report (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Table className="h-4 w-4 mr-2" />
          Raw Data (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
