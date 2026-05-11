import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
} from '@mui/material';
import { IconFileDownload } from '@tabler/icons-react';
import {
  bulkGenerate,
  getBulkJobStatus,
  downloadBulkJob,
  type BulkJobDto,
  type BulkGenerateRequest,
} from '../../../api/smartpos/documents';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  open: boolean;
  onClose: () => void;
  referenceType: string;
  referenceIds: string[];
}

type DocTypeOption = {
  value: string;
  label: string;
};

const DOC_TYPES_BY_REFERENCE: Record<string, DocTypeOption[]> = {
  sale: [
    { value: 'tax-invoice', label: 'Tax Invoice' },
    { value: 'delivery-note', label: 'Delivery Note' },
  ],
  purchase: [
    { value: 'purchase-order', label: 'Purchase Order' },
  ],
  payment: [
    { value: 'payment-receipt', label: 'Payment Receipt' },
  ],
  customer: [
    { value: 'customer-statement', label: 'Customer Statement' },
  ],
};

type Phase = 'config' | 'running' | 'done' | 'error';

export default function BulkGenerateDialog({ open, onClose, referenceType, referenceIds }: Props) {
  const [docType, setDocType] = useState('');
  const [phase, setPhase] = useState<Phase>('config');
  const [job, setJob] = useState<BulkJobDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const options = DOC_TYPES_BY_REFERENCE[referenceType] ?? [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDocType(options.length === 1 ? options[0].value : '');
      setPhase('config');
      setJob(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!docType || referenceIds.length === 0) return;

    setPhase('running');
    setError(null);

    try {
      const req: BulkGenerateRequest = {
        documentType: docType,
        referenceType,
        referenceIds,
      };
      const initialJob = await bulkGenerate(req);
      setJob(initialJob);

      // If already complete (e.g. tiny batch), show done
      if (initialJob.status === 'COMPLETED' || initialJob.status === 'FAILED') {
        setPhase(initialJob.status === 'COMPLETED' ? 'done' : 'error');
        return;
      }

      // Poll every 2 seconds
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getBulkJobStatus(initialJob.id);
          setJob(updated);

          if (updated.status === 'COMPLETED') {
            setPhase('done');
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } else if (updated.status === 'FAILED') {
            setPhase('error');
            setError('Bulk generation job failed.');
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        } catch (e) {
          setPhase('error');
          setError(e instanceof Error ? e.message : 'Failed to check job status');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }, 2000);
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Failed to start bulk generation');
    }
  };

  const handleDownloadZip = async () => {
    if (!job) return;
    try {
      const blob = await downloadBulkJob(job.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk-${referenceType}-documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const handleClose = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    onClose();
  };

  const progress = job ? Math.round((job.progress / Math.max(job.total, 1)) * 100) : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Bulk Generate Documents
      </DialogTitle>

      <DialogContent>
        {phase === 'config' && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box
              sx={{
                bgcolor: brand.primary[50],
                borderRadius: '10px',
                px: 2,
                py: 1.5,
                border: `1px solid ${brand.primary[100]}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
                {referenceIds.length} {referenceIds.length === 1 ? 'record' : 'records'} selected
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[600] }}>
                A separate document will be generated for each selected record.
              </Typography>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Document type</InputLabel>
              <Select
                value={docType}
                label="Document type"
                onChange={(e) => setDocType(e.target.value)}
                MenuProps={{ PaperProps: { sx: { borderRadius: '10px' } } }}
              >
                {options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}

        {phase === 'running' && job && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                  Generating documents...
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700], fontVariantNumeric: 'tabular-nums' }}>
                  {job.progress} of {job.total}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: brand.primary[50],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: brand.primary[600],
                  },
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: brand.neutral[500], textAlign: 'center' }}>
              Please wait while documents are generated. This may take a moment for larger batches.
            </Typography>
          </Stack>
        )}

        {phase === 'running' && !job && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="body2" sx={{ color: brand.neutral[600], textAlign: 'center' }}>
              Starting bulk generation...
            </Typography>
          </Stack>
        )}

        {phase === 'done' && job && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="success" sx={{ borderRadius: '10px', fontWeight: 600 }}>
              Successfully generated {job.progress} of {job.total} documents.
            </Alert>

            {job.results && job.results.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1, display: 'block' }}>
                  Results
                </Typography>
                <Stack spacing={0.5} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {job.results.map((r) => (
                    <Stack key={r.referenceId} direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 0.75, borderRadius: '8px', bgcolor: brand.neutral[50] }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>
                        {r.documentNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: r.status === 'COMPLETED' ? brand.success.dark : brand.error.dark, fontWeight: 600 }}>
                        {r.status}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {phase === 'error' && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="error" sx={{ borderRadius: '10px', fontWeight: 600 }}>
              {error || 'An unexpected error occurred.'}
            </Alert>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {phase === 'config' && (
          <>
            <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!docType || referenceIds.length === 0}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: brand.primary[600],
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              Generate {referenceIds.length} {referenceIds.length === 1 ? 'Document' : 'Documents'}
            </Button>
          </>
        )}

        {phase === 'running' && (
          <Button onClick={handleClose} disabled sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
        )}

        {phase === 'done' && (
          <>
            <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<IconFileDownload size={16} />}
              onClick={handleDownloadZip}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: brand.success.main,
                '&:hover': { bgcolor: brand.success.dark },
              }}
            >
              Download ZIP
            </Button>
          </>
        )}

        {phase === 'error' && (
          <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
