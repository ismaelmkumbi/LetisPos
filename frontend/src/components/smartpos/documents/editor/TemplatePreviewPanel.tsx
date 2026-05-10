import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { previewTemplate } from '../../../../api/smartpos/documents';

interface TemplatePreviewPanelProps { documentType: string; config: Record<string, unknown>; }

export default function TemplatePreviewPanel({ documentType, config }: TemplatePreviewPanelProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const configJson = JSON.stringify({ blocks: config.blocks || [], ...config });
      const blob = await previewTemplate(documentType, configJson);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) { console.error('Preview failed', e); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <button onClick={handlePreview} disabled={loading} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Refresh Preview'}
        </button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {pdfUrl ? <iframe src={pdfUrl} style={{ width: '100%', height: 700, border: 'none' }} title="Template Preview" /> :
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500, color: '#888', fontSize: '0.9rem' }}>Click "Refresh Preview" to see changes</Box>}
      </Box>
    </Box>
  );
}
