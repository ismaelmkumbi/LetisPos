/**
 * DocumentActionsBar — compact single-button dropdown for document operations.
 *
 * Replaces a 6-button row with one icon button that opens a grouped menu.
 * Items are organized by intent: Generate → Download/Print → Deliver → AI.
 */
import { useState, useCallback, useRef } from 'react';
import {
  Alert,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconFileDescription,
  IconEye,
  IconPrinter,
  IconMail,
  IconBrandWhatsapp,
  IconSparkles,
  IconRefresh,
  IconFileTypePdf,
} from '@tabler/icons-react';
import {
  generateDocument,
  previewDocument,
  summarizeDocument,
  retryVfdSubmission,
  type DocumentDto,
} from '../../../api/smartpos/documents';
import DocumentPreviewModal from './DocumentPreviewModal';
import DocumentEmailDialog from './DocumentEmailDialog';
import DocumentWhatsAppDialog from './DocumentWhatsAppDialog';
import { brand } from 'src/theme/smartpos/brand';

interface DocumentActionsBarProps {
  documentType: string;
  referenceType?: string;
  referenceId?: string;
  contextData?: Record<string, unknown>;
  onGenerate?: (doc: DocumentDto) => void;
  disabled?: boolean;
}

export default function DocumentActionsBar({
  documentType,
  referenceType,
  referenceId,
  contextData,
  onGenerate,
  disabled = false,
}: DocumentActionsBarProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [generating, setGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTaxInvoice = doc?.documentType === 'tax-invoice';
  const hasDoc = !!doc;

  // ── Actions ──────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setMenuOpen(false);
    if (doc) {
      setPreviewOpen(true);
      return;
    }
    try {
      setGenerating(true);
      setError(null);
      const result = await generateDocument({
        documentType,
        referenceType,
        referenceId,
        contextData,
      });
      setDoc(result);
      onGenerate?.(result);
      setPreviewOpen(true);
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
        ?? (err as Error).message
        ?? 'Document generation failed. Please try again.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [doc, documentType, referenceType, referenceId, contextData, onGenerate]);

  const handleDownload = useCallback(async () => {
    setMenuOpen(false);
    if (!doc) return;
    const blob = await previewDocument({
      documentType,
      referenceType,
      referenceId,
      contextData,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc, documentType, referenceType, referenceId, contextData]);

  const handlePrint = useCallback(async () => {
    setMenuOpen(false);
    if (!doc) return;
    const blob = await previewDocument({
      documentType,
      referenceType,
      referenceId,
      contextData,
    });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.onload = () => iframe.contentWindow?.print();
    iframe.src = url;
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  }, [doc, documentType, referenceType, referenceId, contextData]);

  const handleRetryVfd = useCallback(async () => {
    setMenuOpen(false);
    if (!doc) return;
    try {
      const result = await retryVfdSubmission(doc.id);
      setDoc({ ...doc, vfdStatus: result.status });
    } catch { /* non-blocking */ }
  }, [doc]);

  const handleSummarize = useCallback(async () => {
    setMenuOpen(false);
    if (!doc) return;
    try {
      await summarizeDocument(doc.id);
    } catch { /* non-blocking */ }
  }, [doc]);

  // ── Trigger button — shows status subtly ────────────────────────────

  const triggerTooltip = generating
    ? 'Generating…'
    : hasDoc
      ? `Preview ${doc.documentNumber}`
      : `Generate ${documentType.replace(/-/g, ' ')}`;

  return (
    <>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1, borderRadius: '10px', fontSize: '0.82rem' }}>
          {error}
        </Alert>
      )}
      <Tooltip title={triggerTooltip} arrow placement="top">
        <Badge
          color="success"
          variant="dot"
          invisible={!hasDoc}
          overlap="circular"
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiBadge-dot': {
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: brand.success.main,
            },
          }}
        >
          <IconButton
            ref={anchorRef}
            size="small"
            disabled={disabled || generating}
            onClick={() => setMenuOpen(true)}
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              border: `1.5px solid ${hasDoc ? brand.success.main : brand.neutral[200]}`,
              bgcolor: hasDoc ? brand.success.light : 'transparent',
              color: hasDoc ? brand.success.dark : brand.neutral[400],
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: hasDoc ? brand.success.light : brand.neutral[50],
                borderColor: hasDoc ? brand.success.main : brand.primary[300],
                color: hasDoc ? brand.success.dark : brand.primary[600],
              },
            }}
          >
            {generating ? (
              <CircularProgress size={16} sx={{ color: brand.primary[600] }} />
            ) : (
              <IconFileDescription size={16} stroke={1.8} />
            )}
          </IconButton>
        </Badge>
      </Tooltip>

      {/* ── Dropdown Menu ──────────────────────────────────────────────── */}

      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 210,
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              border: `1px solid ${brand.neutral[200]}`,
              overflow: 'visible',
            },
          },
        }}
      >
        {/* ── Section: Generate / Preview ── */}
        <MenuItem onClick={handleGenerate} sx={itemSx}>
          <ListItemIcon sx={iconSx}>
            <IconEye size={17} stroke={1.8} />
          </ListItemIcon>
          <ListItemText
            primary={hasDoc ? 'Preview' : 'Generate'}
            secondary={hasDoc ? doc.documentNumber : 'Create new document'}
            slotProps={{
              primary: { sx: { fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.3 } },
              secondary: { sx: { fontSize: '0.68rem', lineHeight: 1.2 } },
            }}
          />
          {hasDoc && (
            <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 700, fontSize: '0.65rem', ml: 1 }}>
              Ready
            </Typography>
          )}
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Section: Download / Print ── */}
        <MenuItem onClick={handleDownload} disabled={!hasDoc} sx={itemSx}>
          <ListItemIcon sx={iconSx}>
            <IconFileTypePdf size={17} stroke={1.8} color={brand.error.main} />
          </ListItemIcon>
          <ListItemText
            primary="Download PDF"
            slotProps={{
              primary: { sx: { fontWeight: 600, fontSize: '0.82rem' } },
            }}
          />
        </MenuItem>

        <MenuItem onClick={handlePrint} disabled={!hasDoc} sx={itemSx}>
          <ListItemIcon sx={iconSx}>
            <IconPrinter size={17} stroke={1.8} />
          </ListItemIcon>
          <ListItemText
            primary="Print"
            slotProps={{
              primary: { sx: { fontWeight: 600, fontSize: '0.82rem' } },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Section: Deliver ── */}
        <MenuItem onClick={() => { setMenuOpen(false); setEmailOpen(true); }} disabled={!hasDoc} sx={itemSx}>
          <ListItemIcon sx={iconSx}>
            <IconMail size={17} stroke={1.8} />
          </ListItemIcon>
          <ListItemText
            primary="Send via Email"
            slotProps={{
              primary: { sx: { fontWeight: 600, fontSize: '0.82rem' } },
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => { setMenuOpen(false); setWhatsappOpen(true); }}
          disabled={!hasDoc}
          sx={itemSx}
        >
          <ListItemIcon sx={{ ...iconSx, color: '#25D366' }}>
            <IconBrandWhatsapp size={17} stroke={1.8} />
          </ListItemIcon>
          <ListItemText
            primary="Send via WhatsApp"
            slotProps={{
              primary: { sx: { fontWeight: 600, fontSize: '0.82rem' } },
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Section: AI ── */}
        <MenuItem onClick={handleSummarize} disabled={!hasDoc} sx={itemSx}>
          <ListItemIcon sx={{ ...iconSx, color: '#8B5CF6' }}>
            <IconSparkles size={17} stroke={1.8} />
          </ListItemIcon>
          <ListItemText
            primary="AI Summarize"
            slotProps={{
              primary: { sx: { fontWeight: 600, fontSize: '0.82rem' } },
            }}
          />
        </MenuItem>

        {/* ── VFD retry (tax invoices only) ── */}
        {isTaxInvoice && doc?.vfdStatus === 'failed' && (
          <MenuItem onClick={handleRetryVfd} sx={{ ...itemSx, color: brand.error.main }}>
            <ListItemIcon sx={{ ...iconSx, color: brand.error.main }}>
              <IconRefresh size={17} stroke={1.8} />
            </ListItemIcon>
            <ListItemText
              primary="Retry VFD Submission"
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: '0.82rem', color: brand.error.main } },
              }}
            />
          </MenuItem>
        )}
      </Menu>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {hasDoc && (
        <DocumentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          documentType={documentType}
          documentId={doc.id}
          referenceType={referenceType}
          referenceId={referenceId}
          data={contextData ?? {}}
        />
      )}
      {hasDoc && (
        <DocumentEmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          documentId={doc.id}
          documentNumber={doc.documentNumber}
        />
      )}
      {hasDoc && (
        <DocumentWhatsAppDialog
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          documentId={doc.id}
          documentNumber={doc.documentNumber}
        />
      )}
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────

const itemSx = {
  borderRadius: '8px',
  mx: 0.8,
  my: 0.2,
  py: 1,
  '&:hover': { bgcolor: brand.primary[50] },
};

const iconSx = {
  minWidth: 34,
  color: brand.neutral[600],
};
