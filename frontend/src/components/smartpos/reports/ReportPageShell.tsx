import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import PageHeader from 'src/components/smartpos/PageHeader';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ReportPageShell({ title, subtitle, children }: Props) {
  return (
    <Box sx={{ pb: 3 }}>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </Box>
  );
}
