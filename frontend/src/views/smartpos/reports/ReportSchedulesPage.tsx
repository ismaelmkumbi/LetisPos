import { Box, Typography, Chip } from '@mui/material';
import { ReportPageShell } from 'src/components/smartpos/reports';

export default function ReportSchedulesPage() {
  return (
    <ReportPageShell title="Report Schedules" subtitle="Scheduled report deliveries and subscriptions">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Chip label="Coming Soon" color="warning" sx={{ mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1 }}>Scheduled Report Delivery</Typography>
        <Typography color="text.secondary">
          Automate report generation and email delivery on a recurring schedule.
          This feature will be available in a future update.
        </Typography>
      </Box>
    </ReportPageShell>
  );
}
