import { useState, useEffect } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { IconRotateClockwise } from '@tabler/icons-react';
import { listTemplateVersions, rollbackTemplate, type TemplateVersionDto } from '../../../api/smartpos/documents';

interface TemplateVersionTimelineProps {
  documentType: string;
  onRollback: () => void;
}

export default function TemplateVersionTimeline({ documentType, onRollback }: TemplateVersionTimelineProps) {
  const [versions, setVersions] = useState<TemplateVersionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    listTemplateVersions(documentType).then(setVersions).finally(() => setLoading(false));
  }, [documentType]);

  const handleRollback = async (version: number) => {
    setRolling(version);
    await rollbackTemplate(documentType, version);
    setRolling(null);
    onRollback();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>;
  if (versions.length === 0) return <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>No version history yet.</Typography>;

  return (
    <List dense>
      {versions.map(v => (
        <ListItem key={v.id} secondaryAction={
          <Button size="small" onClick={() => handleRollback(v.versionNumber)}
            disabled={rolling === v.versionNumber}
            startIcon={rolling === v.versionNumber ? <CircularProgress size={12} /> : <IconRotateClockwise size={14} />}>
            Restore
          </Button>
        }>
          <ListItemText
            primary={`v${v.versionNumber} — ${v.changeDescription ?? 'Update'}`}
            secondary={new Date(v.updatedAt).toLocaleString()}
          />
        </ListItem>
      ))}
    </List>
  );
}
