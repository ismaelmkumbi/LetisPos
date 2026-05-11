import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import { IconSparkles, IconCheck } from '@tabler/icons-react';
import { fieldMap } from '../../../api/smartpos/documents';

interface FieldMappingPreviewProps {
  documentType: string;
  headers: string[];
  onMappingReady: (mapping: Record<string, string>) => void;
}

export default function FieldMappingPreview({ documentType, headers, onMappingReady }: FieldMappingPreviewProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fieldMap({ documentType, headers }).then(r => {
      setMappings(r.mappings ?? {});
      setConfidence(r.confidence ?? 0);
      onMappingReady(r.mappings ?? {});
    }).finally(() => setLoading(false));
  }, [documentType, headers.length]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={16} /><Typography variant="caption" display="block">AI mapping fields...</Typography></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconSparkles size={16} />
        <Typography variant="subtitle2">AI Field Mapping</Typography>
        <Chip label={`${Math.round(confidence * 100)}%`} size="small" color={confidence > 0.7 ? 'success' : 'warning'} />
      </Box>
      {Object.entries(mappings).map(([field, header]) => (
        <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          <Chip label={header} size="small" variant="outlined" />
          <IconCheck size={14} color="#22c55e" />
          <Typography variant="body2" color="text.secondary">→ {field}</Typography>
        </Box>
      ))}
    </Box>
  );
}
