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
import { IconMail } from '@tabler/icons-react';
import { emailDocument } from '../../../api/smartpos/documents';

interface DocumentEmailDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentNumber: string;
}

export default function DocumentEmailDialog({
  open,
  onClose,
  documentId,
  documentNumber,
}: DocumentEmailDialogProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(`Document ${documentNumber}`);
  const [message, setMessage] = useState(
    `Please find attached document ${documentNumber}.`,
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      await emailDocument(documentId, { to, subject, message });
      setSent(true);
    } catch {
      setError('Failed to send email');
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
        <IconMail size={20} /> Email Document
      </DialogTitle>
      <DialogContent>
        {sent ? (
          <Typography color="success.main" sx={{ py: 4, textAlign: 'center' }}>
            Email sent successfully to {to}
          </Typography>
        ) : (
          <>
            <TextField
              label="To"
              type="email"
              fullWidth
              margin="normal"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
            <TextField
              label="Subject"
              fullWidth
              margin="normal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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
            onClick={handleSend}
            disabled={!to || sending}
          >
            {sending ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
