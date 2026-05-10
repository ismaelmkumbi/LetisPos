import { useState, useCallback } from 'react';
import {
  Button,
  ButtonGroup,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  IconEye,
  IconPrinter,
  IconDownload,
  IconMail,
  IconBrandWhatsapp,
} from '@tabler/icons-react';
import {
  generateDocument,
  downloadDocumentPdf,
  type DocumentDto,
} from '../../../api/smartpos/documents';
import DocumentPreviewModal from './DocumentPreviewModal';
import DocumentEmailDialog from './DocumentEmailDialog';
import DocumentWhatsAppDialog from './DocumentWhatsAppDialog';

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
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const theme = useTheme();

  const handleGenerate = useCallback(async () => {
    if (doc) {
      setPreviewOpen(true);
      return;
    }
    try {
      setGenerating(true);
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
      console.error('Document generation failed', err);
    } finally {
      setGenerating(false);
    }
  }, [doc, documentType, referenceType, referenceId, contextData, onGenerate]);

  const handleDownload = useCallback(async () => {
    if (!doc) return;
    const blob = await downloadDocumentPdf(doc.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const handlePrint = useCallback(async () => {
    if (!doc) return;
    const blob = await downloadDocumentPdf(doc.id);
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
    iframe.src = url;
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  }, [doc]);

  return (
    <>
      <ButtonGroup variant="outlined" size="small" disabled={disabled || generating}>
        <Button onClick={handleGenerate} startIcon={generating ? <CircularProgress size={14} /> : <IconEye size={16} />}>
          {doc ? 'Preview' : 'Generate'}
        </Button>
        <Button onClick={handlePrint} disabled={!doc} startIcon={<IconPrinter size={16} />}>
          Print
        </Button>
        <Button onClick={handleDownload} disabled={!doc} startIcon={<IconDownload size={16} />}>
          PDF
        </Button>
        <Button onClick={() => setEmailOpen(true)} disabled={!doc} startIcon={<IconMail size={16} />}>
          Email
        </Button>
        <Button
          onClick={() => setWhatsappOpen(true)}
          disabled={!doc}
          startIcon={<IconBrandWhatsapp size={16} />}
          sx={{
            color: theme.palette.success.main,
            borderColor: theme.palette.success.main,
            '&:hover': { borderColor: theme.palette.success.dark },
          }}
        >
          WhatsApp
        </Button>
      </ButtonGroup>

      {doc && (
        <DocumentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          documentType={documentType}
          data={contextData ?? {}}
        />
      )}
      {doc && (
        <DocumentEmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          documentId={doc.id}
          documentNumber={doc.documentNumber}
        />
      )}
      {doc && (
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
