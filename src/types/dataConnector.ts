export type ConnectorCategory = 'all' | 'database' | 'file-upload' | 'api' | 'spreadsheet' | 'warehouse';

export type ConnectorStatus = 'available' | 'coming-soon';

export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  category: Exclude<ConnectorCategory, 'all'>;
  status: ConnectorStatus;
  iconName: string;
}

export type ColumnType = 'string' | 'numeric' | 'date' | 'boolean';

export type ColumnRole = 'date' | 'metric' | 'dimension' | 'secondary_metric' | 'identifier' | 'ignore';

export interface DetectedColumn {
  name: string;
  type: ColumnType;
  role: ColumnRole;
  confidence: number;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface DataSourceSchema {
  columns: DetectedColumn[];
  rowCount: number;
  columnCount: number;
  dateRange?: { start: string; end: string };
}

export type UploadStatus = 'idle' | 'uploading' | 'detecting' | 'ready' | 'confirmed' | 'error';

export interface DataSource {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  dateRange?: { start: string; end: string };
  qualityScore: number;
  uploadedAt: string;
  status: 'active' | 'processing' | 'error';
  schema: DataSourceSchema;
  connectorType: 'csv';
}

export interface MetricSuggestion {
  useCase: string;
  metricName: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Target Table Mapping Types
// ---------------------------------------------------------------------------

export type TargetTableName =
  | 'fact_orders'
  | 'fact_order_lines'
  | 'dim_channel'
  | 'dim_client'
  | 'dim_delivery_partner'
  | 'dim_sku'
  | 'dim_warehouse';

export type TargetColumnType = 'string' | 'number' | 'boolean' | 'date' | 'timestamp';

export interface TargetColumn {
  name: string;
  type: TargetColumnType;
  required: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface TargetTableDefinition {
  name: TargetTableName;
  displayName: string;
  category: 'fact' | 'dimension';
  columns: TargetColumn[];
  primaryKey: string;
  autoGeneratePk: boolean;
  fkDependencies: TargetTableName[];
}

export interface ColumnMapping {
  csvColumn: string;
  targetColumn: string | null;
  transform: 'none' | 'to_number' | 'to_date' | 'to_boolean' | 'to_timestamp';
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  severity: ValidationSeverity;
  column?: string;
  message: string;
}
