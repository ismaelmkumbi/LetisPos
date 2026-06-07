/**
 * Controlled Substances — regulatory compliance tracking for Schedule II-V drugs.
 */
import { Box } from '@mui/material';
import { IconShield } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';

export default function ControlledSubstancesPage() {
  return (
    <Box>
      <PageHeader
        title="Controlled Substances"
        subtitle="Regulatory compliance for Schedule II-V drugs. Dispensing logs, inventory reconciliation, and audit trail."
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Pharmacy' },
          { label: 'Controlled Substances' },
        ]}
      />
      <EmptyStateGuide
        icon={<IconShield size={48} />}
        title="Controlled substances tracking"
        subtitle="Log every dispensation of controlled drugs. Track inventory by schedule class. Generate compliance reports for regulatory bodies."
        action={{ label: 'Log Dispensation', onClick: () => {} }}
      />
    </Box>
  );
}
