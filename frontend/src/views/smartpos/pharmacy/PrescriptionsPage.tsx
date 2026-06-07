/**
 * Prescriptions management — pharmacy prescription workflow.
 */
import { Box } from '@mui/material';
import { IconFileDescription } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';

export default function PrescriptionsPage() {
  return (
    <Box>
      <PageHeader
        title="Prescriptions"
        subtitle="Manage prescription entries, verify prescriber details, and track dispensing."
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Pharmacy' },
          { label: 'Prescriptions' },
        ]}
      />
      <EmptyStateGuide
        icon={<IconFileDescription size={48} />}
        title="Prescription workflow"
        subtitle="Create, verify, and dispense prescriptions. Track refills and controlled substance logs."
        action={{ label: 'New Prescription', onClick: () => {} }}
      />
    </Box>
  );
}
