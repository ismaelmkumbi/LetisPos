import { useState, useEffect } from 'react';
import { Alert, AlertTitle, Box, CircularProgress } from '@mui/material';
import { detectAnomalies } from '../../../api/smartpos/documents';

export default function AnomalyBanner({ documentId }: { documentId: string }) {
  const [anomalies, setAnomalies] = useState<Array<{ field: string; severity: string; message: string; suggestion?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLoading(true);
    detectAnomalies(documentId).then(r => setAnomalies(r.anomalies ?? [])).finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={16} /></Box>;
  if (dismissed || anomalies.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {anomalies.map((a, i) => (
        <Alert key={i} severity={a.severity === 'critical' ? 'error' : 'warning'}
          onClose={() => setDismissed(true)} sx={{ mb: 0.5 }}>
          <AlertTitle sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.field}</AlertTitle>
          {a.message}{a.suggestion && ` — ${a.suggestion}`}
        </Alert>
      ))}
    </Box>
  );
}
