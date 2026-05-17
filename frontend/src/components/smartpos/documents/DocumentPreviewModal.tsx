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
  Collapse,
  TextField,
} from '@mui/material';
import { IconEye, IconFileTypePdf, IconHistory, IconSparkles, IconNotes } from '@tabler/icons-react';
import { getTemplate, previewDocument, summarizeDocument, updateDocumentNotes } from '../../../api/smartpos/documents';
import TemplatePreviewRenderer from './TemplatePreviewRenderer';
import DocumentVersionTimeline from './DocumentVersionTimeline';
import AnomalyBanner from './AnomalyBanner';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentType: string;
  documentId?: string;
  /** Pass referenceType + referenceId to render with real data instead of empty template. */
  referenceType?: string;
  referenceId?: string;
  data: Record<string, unknown>;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documentType,
  documentId,
  referenceType,
  referenceId,
  data,
}: DocumentPreviewModalProps) {
  const [tab, setTab] = useState(0);
  const [templateHtml, setTemplateHtml] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docSummary, setDocSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const loadTemplate = useCallback(async () => {
    if (templateHtml) return;
    try {
      const tpl = await getTemplate(documentType);
      setTemplateHtml(tpl.bodyHtml);
    } catch {
      // Non-critical — HTML preview is secondary to PDF preview
    }
  }, [documentType, templateHtml]);

  const generatePdfPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the document preview endpoint so it fetches real sale data
      // instead of rendering with sample/template-only data.
      const pdfBlob = await previewDocument({
        documentType,
        referenceType,
        referenceId,
      });
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
      setTab(1);
    } catch {
      setError('Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  }, [documentType, referenceType, referenceId]);

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

  const handleSaveNotes = useCallback(async () => {
    if (!documentId) return;
    try {
      setSavingNotes(true);
      await updateDocumentNotes(documentId, notes);
    } catch {
      console.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }, [documentId, notes]);

  const handleOpen = useCallback(() => {
    if (open) {
      loadTemplate();
      setPdfBlobUrl(null);
      setTab(0);
      setError(null);
      // Auto-generate PDF preview if we have real data to show
      if (referenceType && referenceId) {
        generatePdfPreview();
      }
    }
  }, [open, loadTemplate, referenceType, referenceId, generatePdfPreview]);

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

        {/* HTML Preview — pass referenceType/referenceId so real data is used when available */}
        {!loading && !error && tab === 0 && templateHtml && (
          <TemplatePreviewRenderer
            templateHtml={templateHtml}
            data={{
              documentType,
              referenceType,
              referenceId,
              ...data,
            }}
          />
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

        {documentId && (
          <Box sx={{ mt: 2, borderTop: '1px solid #e2e8f0', pt: 2 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowNotes(!showNotes)}
              startIcon={<IconNotes size={16} />}
              sx={{ textTransform: 'none', color: '#666' }}
            >
              {showNotes ? 'Hide Notes' : 'Staff Notes'}
            </Button>
            <Collapse in={showNotes}>
              <TextField
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                size="small"
                placeholder="Add internal notes (staff only)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                sx={{ mt: 1 }}
                helperText={savingNotes ? 'Saving...' : 'Auto-saves on blur'}
              />
            </Collapse>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
