import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid,
  LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import {
  IconFileTypePdf, IconFileSpreadsheet, IconFileTypeCsv, IconDownload,
  IconCheck, IconX, IconClock,
} from '@tabler/icons-react';

import {
  submitExportJob, pollExportJob,
  type ExportFormat, type ExportReportKey, type ExportJob,
} from 'src/api/smartpos/reports';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const REPORTS: { key: ExportReportKey; title: string; description: string; color: string; soft: string }[] = [
  {
    key: 'sales-summary-series',
    title: 'Sales summary',
    description: 'Daily series of net, gross, tax, discount, and order count.',
    color: brand.primary[500], soft: brand.primary[50],
  },
  {
    key: 'sales-top-products',
    title: 'Top products',
    description: 'Best-selling products ranked by revenue and units sold.',
    color: brand.accent[500], soft: brand.accent[50],
  },
  {
    key: 'sales-top-customers',
    title: 'Top customers',
    description: 'Highest-spend customers by total amount and order count.',
    color: brand.info.main, soft: brand.info.light,
  },
];

const FORMATS: { key: ExportFormat; icon: React.ReactNode; tone: string }[] = [
  { key: 'PDF',  icon: <IconFileTypePdf size={16} />,    tone: brand.error.main },
  { key: 'XLSX', icon: <IconFileSpreadsheet size={16} />, tone: brand.success.main },
  { key: 'CSV',  icon: <IconFileTypeCsv size={16} />,    tone: brand.primary[500] },
];

interface ActiveExport {
  reportKey: ExportReportKey;
  format: ExportFormat;
  job: ExportJob;
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [runs, setRuns] = useState<ActiveExport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (reportKey: ExportReportKey, format: ExportFormat) => {
    setError(null);
    try {
      const submitted = await submitExportJob({
        reportKey, format,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      setRuns((rs) => [{ reportKey, format, job: submitted }, ...rs].slice(0, 10));
      const finished = await pollExportJob(submitted.id, {
        onTick: (job) => {
          setRuns((rs) => rs.map((r) => r.job.id === job.id ? { ...r, job } : r));
        },
      });
      setRuns((rs) => rs.map((r) => r.job.id === finished.id ? { ...r, job: finished } : r));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Generate async exports — downloads are ready via presigned links when complete."
      />

      {/* Date range */}
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small" type="date" label="From" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }}
            />
            <TextField
              size="small" type="date" label="To" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }}
            />
            <Typography variant="caption" sx={{ color: brand.neutral[500], alignSelf: 'center' }}>
              Leave blank to use backend defaults (last 30 days).
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Report tiles */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {REPORTS.map((r) => (
          <Grid size={{ xs: 12, md: 4 }} key={r.key}>
            <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{
                  width: 44, height: 44, borderRadius: 2, bgcolor: r.soft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
                }}>
                  <IconDownload size={22} color={r.color} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{r.title}</Typography>
                <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2, minHeight: 40 }}>
                  {r.description}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {FORMATS.map((f) => (
                    <Button
                      key={f.key}
                      size="small"
                      variant="outlined"
                      startIcon={f.icon}
                      onClick={() => handleExport(r.key, f.key)}
                      sx={{
                        borderColor: brand.neutral[200],
                        color: f.tone,
                        fontWeight: 600,
                        '&:hover': { borderColor: f.tone, bgcolor: `${f.tone}10` },
                      }}
                    >
                      {f.key}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active runs */}
      {runs.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Recent exports</Typography>
          <Stack spacing={1}>
            {runs.map((r) => (
              <Card
                key={r.job.id}
                elevation={0}
                sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 2 }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <StatusIcon status={r.job.status} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {REPORTS.find((x) => x.key === r.reportKey)?.title ?? r.reportKey}
                        </Typography>
                        <Chip size="small" label={r.format} sx={{ fontWeight: 600 }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                        {new Date(r.job.createdAt).toLocaleTimeString()} · {r.job.id.slice(0, 8)}
                      </Typography>
                      {(r.job.status === 'PENDING' || r.job.status === 'RUNNING') && (
                        <LinearProgress
                          sx={{
                            mt: 0.5, height: 3, borderRadius: 1,
                            '& .MuiLinearProgress-bar': { bgcolor: brand.primary[500] },
                            bgcolor: brand.primary[50],
                          }}
                        />
                      )}
                      {r.job.status === 'FAILED' && r.job.error && (
                        <Typography variant="caption" sx={{ color: brand.error.dark }}>
                          {r.job.error}
                        </Typography>
                      )}
                    </Box>
                    {r.job.status === 'READY' && r.job.fileUrl && (
                      <Button
                        variant="contained"
                        size="small"
                        href={r.job.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<IconDownload size={16} />}
                        sx={{
                          bgcolor: brand.accent[500],
                          '&:hover': { bgcolor: brand.accent[600] },
                          fontWeight: 700,
                        }}
                      >
                        Download
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

function StatusIcon({ status }: { status: ExportJob['status'] }) {
  if (status === 'PENDING' || status === 'RUNNING') {
    return <CircularProgress size={18} sx={{ color: brand.primary[500] }} />;
  }
  if (status === 'READY') {
    return (
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%',
        bgcolor: brand.success.light, color: brand.success.dark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconCheck size={16} />
      </Box>
    );
  }
  if (status === 'FAILED') {
    return (
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%',
        bgcolor: brand.error.light, color: brand.error.dark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconX size={16} />
      </Box>
    );
  }
  return <IconClock size={18} color={brand.neutral[500]} />;
}
