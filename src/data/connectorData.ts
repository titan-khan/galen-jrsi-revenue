import type { ConnectorDefinition } from '@/types/dataConnector';

export const connectorDefinitions: ConnectorDefinition[] = [
  {
    id: 'csv-upload',
    name: 'CSV Upload',
    description: 'Upload CSV files to import structured data directly into your workspace',
    category: 'file-upload',
    status: 'available',
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL databases for real-time data sync and analysis',
    category: 'database',
    status: 'coming-soon',
    iconName: 'Database',
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Import data from MySQL databases with automated schema detection',
    category: 'database',
    status: 'coming-soon',
    iconName: 'Database',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Sync data from Google Sheets with automatic refresh scheduling',
    category: 'spreadsheet',
    status: 'coming-soon',
    iconName: 'Sheet',
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Connect to any REST API endpoint to pull data into your workspace',
    category: 'api',
    status: 'coming-soon',
    iconName: 'Globe',
  },
  {
    id: 'excel',
    name: 'Excel',
    description: 'Upload Excel files (.xlsx, .xls) with multi-sheet support',
    category: 'file-upload',
    status: 'coming-soon',
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    description: 'Connect to Snowflake data warehouse for large-scale data analysis',
    category: 'warehouse',
    status: 'coming-soon',
    iconName: 'Snowflake',
  },
];

export const connectorCategories = [
  { id: 'all' as const, label: 'All' },
  { id: 'database' as const, label: 'Database' },
  { id: 'file-upload' as const, label: 'File Upload' },
  { id: 'api' as const, label: 'API' },
  { id: 'spreadsheet' as const, label: 'Spreadsheet' },
  { id: 'warehouse' as const, label: 'Warehouse' },
];
