/**
 * Vertical extensions index.
 *
 * Importing this module registers all available vertical form components
 * in the registry, so ProductEditDrawer can look them up dynamically.
 *
 * Add a new vertical here when creating a new form component:
 *   1. Create MyNewExtensionForm.tsx
 *   2. Import and register it below
 */

import { registerVerticalFields } from './registry';
import PharmacyExtensionForm from './PharmacyExtensionForm';
import HardwareExtensionForm from './HardwareExtensionForm';

// Register pharmacy form
registerVerticalFields('pharmacy', [
  { key: 'pharmacy', label: 'Pharmacy', component: PharmacyExtensionForm, sortOrder: 10 },
]);

// Register hardware form
registerVerticalFields('hardware', [
  { key: 'hardware', label: 'Hardware', component: HardwareExtensionForm, sortOrder: 20 },
]);
