import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardLayout } from '@/components/Specialists/CreateWizard/WizardLayout';
import type { WizardStep } from '@/components/Specialists/CreateWizard/WizardSidebar';
import { UploadStep } from '@/components/DataConnector/CsvUploadWizard/UploadStep';
import { TableMappingStep } from '@/components/DataConnector/CsvUploadWizard/TableMappingStep';
import { MappingReviewStep } from '@/components/DataConnector/CsvUploadWizard/MappingReviewStep';
import { ConfirmStep } from '@/components/DataConnector/CsvUploadWizard/ConfirmStep';
import { useDataConnector } from '@/contexts/DataConnectorContext';
import {
  readFileAsText,
  parseCSV,
  detectSchema,
  calculateQualityScore,
} from '@/utils/csvParser';
import {
  suggestTargetTable,
  autoMapColumns,
  validateMapping,
} from '@/utils/columnMapper';
import { coerceAllRows } from '@/utils/typeCoercion';
import { TARGET_TABLES, getInsertableColumns } from '@/data/targetTableRegistry';
import type {
  DataSourceSchema,
  ColumnMapping,
  TargetTableName,
  ValidationResult,
} from '@/types/dataConnector';

const STEP_ORDER = ['upload', 'mapping', 'review', 'confirm'] as const;
type StepId = (typeof STEP_ORDER)[number];

const CsvUpload = () => {
  const navigate = useNavigate();
  const { addDataSourceToTable, isSubmitting } = useDataConnector();

  // Step state
  const [currentStep, setCurrentStep] = useState<StepId>('upload');
  const [highestStep, setHighestStep] = useState(0);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Schema state
  const [schema, setSchema] = useState<DataSourceSchema | null>(null);
  const [qualityScore, setQualityScore] = useState(0);
  const [rawData, setRawData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  // Mapping state
  const [selectedTable, setSelectedTable] = useState<TargetTableName | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  // Confirm state
  const [dataSourceName, setDataSourceName] = useState('');

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // Auto-suggest target table when CSV is parsed
  const tableSuggestions = useMemo(() => {
    if (!rawData || !file) return [];
    return suggestTargetTable(rawData.headers, file.name);
  }, [rawData, file]);

  const handleFileChange = useCallback(async (newFile: File | null) => {
    setFile(newFile);
    setUploadError(null);
    setSchema(null);
    setSelectedTable(null);
    setMappings([]);
    setValidationResults([]);

    if (newFile) {
      try {
        const text = await readFileAsText(newFile);
        const parsed = parseCSV(text);

        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setUploadError('The file appears to be empty or has no data rows.');
          return;
        }

        const detected = detectSchema(parsed.headers, parsed.rows);
        const quality = calculateQualityScore(detected, parsed.rows.length);

        setRawData(parsed);
        setSchema(detected);
        setQualityScore(quality);

        // Auto-generate name from filename
        const baseName = newFile.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ');
        setDataSourceName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      } catch {
        setUploadError('Failed to read the file. Please make sure it is a valid CSV.');
      }
    }
  }, []);

  const handleTableSelect = useCallback(
    (table: TargetTableName) => {
      if (!rawData || !schema) return;
      setSelectedTable(table);

      const tableDef = TARGET_TABLES[table];
      const newMappings = autoMapColumns(rawData.headers, tableDef);
      setMappings(newMappings);

      const results = validateMapping(
        newMappings,
        tableDef,
        rawData.rows,
        rawData.headers,
      );
      setValidationResults(results);
    },
    [rawData, schema],
  );

  const handleMappingChange = useCallback(
    (csvColumn: string, targetColumn: string | null) => {
      if (!selectedTable || !rawData) return;

      const tableDef = TARGET_TABLES[selectedTable];
      const insertable = getInsertableColumns(tableDef);

      setMappings((prev) => {
        const updated = prev.map((m) => {
          if (m.csvColumn !== csvColumn) return m;
          if (!targetColumn) {
            return { ...m, targetColumn: null, transform: 'none' as const };
          }
          const targetCol = insertable.find((c) => c.name === targetColumn);
          const transform: ColumnMapping['transform'] = targetCol
            ? targetCol.type === 'number'
              ? 'to_number'
              : targetCol.type === 'date'
                ? 'to_date'
                : targetCol.type === 'timestamp'
                  ? 'to_timestamp'
                  : targetCol.type === 'boolean'
                    ? 'to_boolean'
                    : 'none'
            : 'none';
          return { ...m, targetColumn, transform };
        });

        // Re-validate with updated mappings
        const results = validateMapping(
          updated,
          tableDef,
          rawData.rows,
          rawData.headers,
        );
        setValidationResults(results);

        return updated;
      });
    },
    [selectedTable, rawData],
  );

  const handleSubmit = async () => {
    if (!file || !schema || !rawData || !selectedTable) return;

    const tableDef = TARGET_TABLES[selectedTable];
    const activeMappings = mappings.filter((m) => m.targetColumn);

    try {
      // Type-coerce all rows based on column mappings
      const typedRows = coerceAllRows(rawData.rows, rawData.headers, activeMappings);

      await addDataSourceToTable(
        {
          name: dataSourceName || file.name,
          fileName: file.name,
          fileSize: file.size,
          rowCount: schema.rowCount,
          columnCount: schema.columnCount,
          dateRange: schema.dateRange,
          qualityScore,
          status: 'active',
          schema,
          connectorType: 'csv',
          targetTable: selectedTable,
          columnMappings: activeMappings,
        },
        typedRows,
      );

      toast.success('Data imported successfully', {
        description: `${schema.rowCount.toLocaleString()} rows loaded into ${tableDef.displayName} (${selectedTable})`,
      });
      navigate('/data-connector');
    } catch (err) {
      toast.error('Failed to import data', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  const hasValidationErrors = validationResults.some((r) => r.severity === 'error');

  const isStepValid = (stepId: StepId): boolean => {
    switch (stepId) {
      case 'upload':
        return file !== null && schema !== null && !uploadError;
      case 'mapping':
        return selectedTable !== null && mappings.length > 0 && !hasValidationErrors;
      case 'review':
        return selectedTable !== null && !hasValidationErrors;
      case 'confirm':
        return dataSourceName.trim().length > 0;
      default:
        return false;
    }
  };

  const steps: WizardStep[] = STEP_ORDER.map((id, index) => ({
    id,
    label:
      id === 'upload'
        ? 'Upload File'
        : id === 'mapping'
          ? 'Map to Table'
          : id === 'review'
            ? 'Review Mapping'
            : 'Confirm & Import',
    number: index + 1,
    isComplete: index < currentStepIndex,
    isAccessible: index <= highestStep,
  }));

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
      setHighestStep((prev) => Math.max(prev, nextIndex));
    }
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      navigate('/data-connector');
    } else {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1]);
    }
  };

  const handleStepClick = (stepId: string) => {
    const index = STEP_ORDER.indexOf(stepId as StepId);
    if (index >= 0 && index <= highestStep) {
      setCurrentStep(stepId as StepId);
    }
  };

  const selectedTableDef = selectedTable ? TARGET_TABLES[selectedTable] : null;
  const mappedCount = mappings.filter((m) => m.targetColumn).length;

  return (
    <WizardLayout
      currentStep={currentStep}
      steps={steps}
      onStepClick={handleStepClick}
      onBack={handleBack}
      onNext={handleNext}
      canProceed={isStepValid(currentStep) && !isSubmitting}
      isLastStep={currentStep === 'confirm'}
      onSubmit={handleSubmit}
      title="Upload CSV"
      submitLabel="Import Data"
    >
      {currentStep === 'upload' && (
        <UploadStep file={file} onFileChange={handleFileChange} error={uploadError} />
      )}
      {currentStep === 'mapping' && rawData && schema && (
        <TableMappingStep
          csvHeaders={rawData.headers}
          sampleRows={rawData.rows}
          detectedColumns={schema.columns}
          selectedTable={selectedTable}
          mappings={mappings}
          tableSuggestions={tableSuggestions}
          onTableSelect={handleTableSelect}
          onMappingChange={handleMappingChange}
        />
      )}
      {currentStep === 'review' && selectedTableDef && (
        <MappingReviewStep
          targetTable={selectedTableDef}
          mappings={mappings}
          validationResults={validationResults}
          qualityScore={qualityScore}
          rowCount={schema?.rowCount ?? 0}
        />
      )}
      {currentStep === 'confirm' && schema && file && (
        <ConfirmStep
          fileName={file.name}
          fileSize={file.size}
          schema={schema}
          qualityScore={qualityScore}
          dataSourceName={dataSourceName}
          onNameChange={setDataSourceName}
          targetTableName={selectedTable ?? undefined}
          targetTableDisplayName={selectedTableDef?.displayName}
          targetTableCategory={selectedTableDef?.category}
          mappedColumnCount={mappedCount}
        />
      )}
    </WizardLayout>
  );
};

export default CsvUpload;
