import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "lucide-react";

interface DefinitionSectionProps {
  dataSource: string;
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

const DefinitionSection = ({
  dataSource,
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: DefinitionSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Data Source
        </Label>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{dataSource || "Not selected"}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Monthly Sales Revenue"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="transition-all focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Describe what this metric measures..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
};

export default DefinitionSection;
