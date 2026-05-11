import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, CircularProgress, Stack } from '@mui/material';
import { IconPrinter } from '@tabler/icons-react';
import { listPrinters, testPrint, type PrinterInfo } from 'src/api/smartpos/documents';

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    listPrinters().then(setPrinters).finally(() => setLoading(false));
  }, []);

  const handleTest = async (id: string) => {
    setTesting(id);
    await testPrint(id);
    setTesting(null);
  };

  if (loading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Printer Settings</Typography>
      {printers.length === 0 ? (
        <Typography color="text.secondary">No printers configured. Add printers in application.yml under smartpos.printers.</Typography>
      ) : (
        <Stack spacing={2}>
          {printers.map(p => (
            <Card key={p.id}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">{p.name}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label={`${p.paperWidth}mm`} size="small" variant="outlined" />
                    <Chip label={p.autoCut ? 'Auto-cut' : 'No auto-cut'} size="small" variant="outlined" color={p.autoCut ? 'success' : 'default'} />
                    <Chip label={p.cashDrawer ? 'Cash drawer' : 'No drawer'} size="small" variant="outlined" color={p.cashDrawer ? 'success' : 'default'} />
                  </Stack>
                </Box>
                <Button variant="outlined" startIcon={testing === p.id ? <CircularProgress size={14} /> : <IconPrinter size={16} />}
                  onClick={() => handleTest(p.id)} disabled={testing !== null}>
                  {testing === p.id ? 'Testing...' : 'Test Print'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
