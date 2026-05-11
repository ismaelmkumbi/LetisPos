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
  Alert,
  AlertTitle,
} from '@mui/material';
import { IconEye, IconFileTypePdf, IconHistory, IconSparkles } from '@tabler/icons-react';
import { getTemplate, previewTemplate, summarizeDocument } from '../../../api/smartpos/documents';
import TemplatePreviewRenderer from './TemplatePreviewRenderer';
import DocumentVersionTimeline from './DocumentVersionTimeline';
import AnomalyBanner from './AnomalyBanner';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentType: string;
  documentId?: string;
  data: Record<string, unknown>;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documentType,
  documentId,
  data,
}: DocumentPreviewModalProps) {
  const [tab, setTab] = useState(0);
  const [templateHtml, setTemplateHtml] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

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

  const handleSummarize = useCallback(async () => {
    if (!documentId) return;
    try {
      setSummarizing(true);
      const result = await summarizeDocument(documentId);
      setDocSummary(result.summary);
    } catch {
      console.error('Failed to summarize document');
    } finally {
      setSummarizing(false);
    }
  }, [documentId]);

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
        <Box sx={{ flexGrow: 1 }} />
        {documentId && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleSummarize}
            disabled={summarizing}
            startIcon={summarizing ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
          >
            Summarize
          </Button>
        )}
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="HTML Preview" />
          <Tab label="PDF Preview" icon={<IconFileTypePdf size={16} />} iconPosition="start" />
          <Tab label="Versions" icon={<IconHistory size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent>
        {documentId && <AnomalyBanner documentId={documentId} />}
        {docSummary && (
          <Alert severity="info" icon={<IconSparkles size={16} />} sx={{ mb: 2 }}
            action={<Button size="small" onClick={() => setDocSummary(null)}>Dismiss</Button>}>
            <AlertTitle sx={{ fontSize: '0.8rem', fontWeight: 600 }}>AI Summary</AlertTitle>
            {docSummary}
          </Alert>
        )}
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
        {!loading && !error && tab === 2 && documentId && (
          <DocumentVersionTimeline documentId={documentId} />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
