import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  BarChart3,
  GitBranch,
  Target,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

interface TemplateSuccessModalProps {
  open: boolean;
  onClose: () => void;
  result: {
    totalMetrics: number;
    totalRelationships: number;
    northStarName: string;
  } | null;
}

const TemplateSuccessModal = ({ open, onClose, result }: TemplateSuccessModalProps) => {
  const navigate = useNavigate();

  if (!result) return null;

  const handleGoToMetrics = () => {
    onClose();
    navigate("/metrics");
  };

  const handleGoToCommandCenter = () => {
    onClose();
    navigate("/command-center");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">✓</span>
              </div>
            </div>
          </div>
          <DialogTitle className="text-xl">Dashboard Ready!</DialogTitle>
          <DialogDescription>
            Your logistics dashboard has been configured with industry best practices
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-sm text-muted-foreground">North Star</div>
                  <div className="font-semibold">{result.northStarName}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{result.totalMetrics}</div>
                <div className="text-xs text-muted-foreground">Metrics Created</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <GitBranch className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{result.totalRelationships}</div>
                <div className="text-xs text-muted-foreground">Relationships</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-2">
          <Button className="w-full" onClick={handleGoToCommandCenter}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Go to Command Center
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" className="w-full" onClick={handleGoToMetrics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View All Metrics
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSuccessModal;
