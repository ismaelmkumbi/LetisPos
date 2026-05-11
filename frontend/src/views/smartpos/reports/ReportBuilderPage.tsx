import { Box, Typography, Chip } from '@mui/material';
import { ReportPageShell } from 'src/components/smartpos/reports';

export default function ReportBuilderPage() {
  return (
    <ReportPageShell title="Report Builder" subtitle="Design and save custom reports with drag-and-drop widgets">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Chip label="Coming Soon" color="warning" sx={{ mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1 }}>Custom Report Builder</Typography>
        <Typography color="text.secondary">
          Build your own reports by selecting metrics, dimensions, charts and filters.
          Save and share custom report templates with your team.
          This feature will be available in a future update.
        </Typography>
      </Box>
    </ReportPageShell>
  );
}
