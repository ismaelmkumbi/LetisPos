/**
 * Patients — customer list filtered for pharmacy context.
 */
import { Box } from '@mui/material';
import { IconUsers } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';

export default function PatientsPage() {
  return (
    <Box>
      <PageHeader
        title="Patients"
        subtitle="Patient profiles with medication history, allergies, and prescription records."
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Pharmacy' },
          { label: 'Patients' },
        ]}
      />
      <EmptyStateGuide
        icon={<IconUsers size={48} />}
        title="Patient management"
        subtitle="Register patients, track medication history, record allergies, and link prescriptions to patient profiles."
        action={{ label: 'Add Patient', onClick: () => {} }}
      />
    </Box>
  );
}
