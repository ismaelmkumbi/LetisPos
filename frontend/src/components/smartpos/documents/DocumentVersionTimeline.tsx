import { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@mui/lab';
import { IconFileTypePdf, IconFileCheck, IconPrinter, IconMail, IconBrandWhatsapp, IconRefresh } from '@tabler/icons-react';
import { listDocumentVersions, downloadVersionPdf, type DocumentVersion } from '../../../api/smartpos/documents';

const changeIcons: Record<string, React.ReactNode> = {
  created: <IconFileCheck size={14} />, regenerated: <IconRefresh size={14} />,
  reprinted: <IconPrinter size={14} />, status_change: <IconFileCheck size={14} />,
  sent_email: <IconMail size={14} />, sent_whatsapp: <IconBrandWhatsapp size={14} />,
};

const changeColors: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
  created: 'success', regenerated: 'info', reprinted: 'primary',
  status_change: 'warning', sent_email: 'primary', sent_whatsapp: 'success',
};

export default function DocumentVersionTimeline({ documentId }: { documentId: string }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocumentVersions(documentId).then(setVersions).finally(() => setLoading(false));
  }, [documentId]);

  const handleViewPdf = async (version: DocumentVersion) => {
    const blob = await downloadVersionPdf(documentId, version.id);
    window.open(URL.createObjectURL(blob));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Timeline sx={{ mt: 0 }}>
      {versions.map(v => (
        <TimelineItem key={v.id}>
          <TimelineSeparator>
            <TimelineDot color={changeColors[v.changeType] ?? 'grey'}>{changeIcons[v.changeType]}</TimelineDot>
            {v.versionNumber > 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="body2" fontWeight={600} textTransform="capitalize">{v.changeType.replace('_', ' ')}</Typography>
            {v.changeSummary && <Typography variant="caption" color="text.secondary">{v.changeSummary}</Typography>}
            <Typography variant="caption" color="text.secondary" display="block">v{v.versionNumber} — {new Date(v.createdAt).toLocaleString()}</Typography>
            <Button size="small" onClick={() => handleViewPdf(v)} startIcon={<IconFileTypePdf size={14} />} sx={{ mt: 0.5 }}>View PDF</Button>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
