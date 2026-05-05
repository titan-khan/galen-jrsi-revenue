import { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadStepProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error: string | null;
}

export function UploadStep({ file, onFileChange, error }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const selected = files[0];

      // Validate file type
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        return;
      }

      // Validate file size (100MB max)
      if (selected.size > 100 * 1024 * 1024) {
        return;
      }

      onFileChange(selected);
    },
    [onFileChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium mb-1">Upload CSV File</h2>
        <p className="text-xs text-muted-foreground">
          Drop your CSV file below to auto-detect its schema and start importing data.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFilePicker}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/30',
        )}
      >
        <Upload
          className={cn(
            'h-10 w-10 mx-auto mb-4',
            isDragging ? 'text-primary' : 'text-muted-foreground/40',
          )}
        />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Drop your CSV file here</span> or click to
          browse
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Supports .csv files up to 100MB
        </p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
            }}
            className="p-1.5 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
