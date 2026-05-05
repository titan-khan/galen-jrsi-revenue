import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { KnowledgeFile } from '@/types/specialist';

interface KnowledgeStepProps {
  files: KnowledgeFile[];
  onFilesChange: (files: KnowledgeFile[]) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const KnowledgeStep = ({
  files,
  onFilesChange,
  instructions,
  onInstructionsChange,
}: KnowledgeStepProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: KnowledgeFile[] = Array.from(selectedFiles).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }));
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-sm font-medium">Knowledge Base</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add context to help your specialist understand your business better. <span className="italic">Optional</span>
        </p>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/30',
        )}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.pdf,.csv,.txt,.doc,.docx,.xls,.xlsx';
          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
          input.click();
        }}
      >
        <Upload className={cn(
          'h-8 w-8 mx-auto mb-3',
          isDragging ? 'text-primary' : 'text-muted-foreground/50',
        )} />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Drop files here</span> or click to upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, CSV, TXT, Excel (max 10MB each)
        </p>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Uploaded Files</p>
          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-2">
        <Label htmlFor="instructions" className="text-sm font-medium">
          Additional Instructions
        </Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder='e.g., "Focus on R002 route performance. Flag any month where OTP drops below 40%. Compare contract vs full-time driver performance."'
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
};
