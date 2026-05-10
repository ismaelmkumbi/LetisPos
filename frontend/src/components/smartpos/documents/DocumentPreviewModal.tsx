import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Typography,
} from '@mui/material';
import { IconEye, IconFileTypePdf } from '@tabler/icons-react';
import { getTemplate, previewTemplate } from '../../../api/smartpos/documents';
import TemplatePreviewRenderer from './TemplatePreviewRenderer';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentType: string;
  data: Record<string, unknown>;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documentType,
  data,
}: DocumentPreviewModalProps) {
  const [tab, setTab] = useState(0);
  const [templateHtml, setTemplateHtml] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (templateHtml) return;
    try {
      setLoading(true);
      const tpl = await getTemplate(documentType);
      setTemplateHtml(tpl.bodyHtml);
    } catch {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [documentType, templateHtml]);

  const generatePdfPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pdfBlob = await previewTemplate(documentType, templateHtml);
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
      setTab(1);
    } catch {
      setError('Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  }, [documentType, templateHtml]);

  const handleOpen = useCallback(() => {
    if (open) {
      loadTemplate();
      setPdfBlobUrl(null);
      setTab(0);
      setError(null);
    }
  }, [open, loadTemplate]);

  const handleClose = useCallback(() => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    onClose();
  }, [pdfBlobUrl, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ onEntered: handleOpen }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconEye size={20} /> Document Preview
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="HTML Preview" />
          <Tab label="PDF Preview" icon={<IconFileTypePdf size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
        {!loading && !error && tab === 0 && templateHtml && (
          <TemplatePreviewRenderer templateHtml={templateHtml} data={data} />
        )}
        {!loading && !error && tab === 1 && pdfBlobUrl && (
          <Box
            component="iframe"
            src={pdfBlobUrl}
            sx={{ width: '100%', height: 600, border: 'none', borderRadius: 1 }}
            title="PDF Preview"
          />
        )}
        {!loading && !error && tab === 1 && !pdfBlobUrl && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              PDF preview not yet generated
            </Typography>
            <Button variant="contained" onClick={generatePdfPreview}>
              Generate PDF Preview
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
