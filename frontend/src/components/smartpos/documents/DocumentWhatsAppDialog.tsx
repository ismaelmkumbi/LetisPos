import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { whatsappDocument } from '../../../api/smartpos/documents';

interface DocumentWhatsAppDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentNumber: string;
}

export default function DocumentWhatsAppDialog({
  open,
  onClose,
  documentId,
  documentNumber,
}: DocumentWhatsAppDialogProps) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`Here is document ${documentNumber}.`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      await whatsappDocument(documentId, { phone, message });
      setSent(true);
    } catch {
      setError('Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconBrandWhatsapp size={20} /> Share via WhatsApp
      </DialogTitle>
      <DialogContent>
        {sent ? (
          <Typography color="success.main" sx={{ py: 4, textAlign: 'center' }}>
            WhatsApp message sent successfully to {phone}
          </Typography>
        ) : (
          <>
            <TextField
              label="Phone Number"
              fullWidth
              margin="normal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 123 456 789"
              required
            />
            <TextField
              label="Message"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{sent ? 'Close' : 'Cancel'}</Button>
        {!sent && (
          <Button
            variant="contained"
            color="success"
            onClick={handleSend}
            disabled={!phone || sending}
          >
            {sending ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
