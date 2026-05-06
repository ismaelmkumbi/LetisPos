/**
 * Letis POS — SmartPOS Component Library
 *
 * Enterprise-grade UI components for the Letis POS admin interface.
 */

// Data Display
export { DataTable, StatusBadge, type Column as DataTableColumn, type DataTableProps } from './DataTable';
export { EnhancedDataTable, type EnhancedDataTableProps, type FilterChip, type BulkAction } from './EnhancedDataTable';

// Navigation
export { CommandPalette } from './CommandPalette';
export { BreadcrumbNav } from './BreadcrumbNav';
export { FloatingActions } from './FloatingActions';

// Page Structure
export { PageHeader, type PageHeaderProps, type PageHeaderAction } from './PageHeader';
export { EditDrawer, type EditDrawerProps } from './EditDrawer';

// UX Enhancement
export { KeyboardShortcutsHelp, useKeyboardShortcuts, type ShortcutDefinition } from './KeyboardShortcuts';

// Operational Components
export { StatusIndicator, type StatusIndicatorProps, type OperationalState } from './StatusIndicator';
export { MetricCard, type MetricCardProps } from './MetricCard';
export { OperationalAlert, type OperationalAlertProps, type AlertContext } from './OperationalAlert';

// Forms (using default export)
export { default as LanguageSwitcher } from './LanguageSwitcher';
