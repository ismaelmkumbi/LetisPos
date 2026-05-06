import { useState } from 'react';
import { Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { IconFileTypePdf, IconFileSpreadsheet, IconFileTypeCsv, IconDownload } from '@tabler/icons-react';
import { submitExportJob, pollExportJob, type ExportFormat, type ExportReportKey, type ExportJob } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  reportKey: ExportReportKey;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
}

const FORMATS: { key: ExportFormat; icon: React.ReactNode; label: string; tone: string }[] = [
  { key: 'PDF', icon: <IconFileTypePdf size={16} />, label: 'PDF', tone: brand.error.main },
  { key: 'XLSX', icon: <IconFileSpreadsheet size={16} />, label: 'Excel', tone: brand.success.main },
  { key: 'CSV', icon: <IconFileTypeCsv size={16} />, label: 'CSV', tone: brand.primary[500] },
];

export default function ReportExportBar({ reportKey, dateFrom, dateTo, warehouseId }: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [job, setJob] = useState<ExportJob | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setJob(null);
    try {
      const submitted = await submitExportJob({ reportKey, format, dateFrom, dateTo, warehouseId: warehouseId as any });
      const finished = await pollExportJob(submitted.id, { onTick: (j) => setJob(j) });
      setJob(finished);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ color: brand.neutral[600], fontWeight: 600, mr: 0.5 }}>Export:</Typography>
      {FORMATS.map((f) => (
        <Button key={f.key} size="small" variant="outlined" startIcon={exporting === f.key ? <CircularProgress size={14} /> : f.icon}
          onClick={() => handleExport(f.key)} disabled={exporting !== null}
          sx={{ borderColor: brand.neutral[200], color: f.tone, fontWeight: 600, fontSize: 12,
            '&:hover': { borderColor: f.tone, bgcolor: `${f.tone}10` } }}>
          {f.label}
        </Button>
      ))}
      {job?.status === 'READY' && job.fileUrl && (
        <Button size="small" variant="contained" href={job.fileUrl} target="_blank" rel="noopener noreferrer"
          startIcon={<IconDownload size={14} />}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700, fontSize: 12 }}>
          Download
        </Button>
      )}
      {job?.status === 'RUNNING' && <Chip size="small" label="Generating…" sx={{ fontWeight: 600 }} />}
      {job?.status === 'FAILED' && <Chip size="small" label="Failed" color="error" sx={{ fontWeight: 600 }} />}
    </Stack>
  );
}
