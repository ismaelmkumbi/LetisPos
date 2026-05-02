/**
 * Create / edit a notification template. Supports a simple {{placeholder}}
 * preview pane so users can see the substituted output without sending.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';

import {
  createTemplate, updateTemplate,
  type Channel, type CreateTemplateBody, type NotificationTemplate,
} from 'src/api/smartpos/notifications';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand } from 'src/theme/smartpos/brand';

const empty: CreateTemplateBody = {
  code: '', channel: 'EMAIL', name: '', body: '', html: false, enabled: true, isDefault: false,
};

export interface TemplateEditDrawerProps {
  open: boolean;
  initial?: NotificationTemplate | null;
  onClose: () => void;
  onSaved: (t: NotificationTemplate) => void;
  onDelete?: () => void;
}

function render(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k: string) => data[k] ?? '');
}

export default function TemplateEditDrawer({
  open, initial, onClose, onSaved, onDelete,
}: TemplateEditDrawerProps) {
  const [body, setBody] = useState<CreateTemplateBody>(empty);
  const [previewData, setPreviewData] = useState<string>(
    JSON.stringify({ customer_name: 'Asha', ref: 'INV-1042', total: '120.00' }, null, 2),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setBody({
        code: initial.code, channel: initial.channel, name: initial.name,
        subject: initial.subject ?? '', body: initial.body,
        html: initial.html, isDefault: initial.isDefault, enabled: initial.enabled,
      });
    } else {
      setBody(empty);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof CreateTemplateBody>(k: K, v: CreateTemplateBody[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const previewParsed = useMemo<Record<string, string>>(() => {
    try { return JSON.parse(previewData); } catch { return {}; }
  }, [previewData]);

  const previewBody = useMemo(() => render(body.body || '', previewParsed), [body.body, previewParsed]);
  const previewSubject = useMemo(() => render(body.subject || '', previewParsed), [body.subject, previewParsed]);

  const handleSubmit = async () => {
    if (!body.code.trim() || !body.name.trim() || !body.body.trim()) {
      setError('Code, name and body are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateTemplate(initial.id, body)
        : await createTemplate(body);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Edit template' : 'New template'}
      subtitle={initial ? `${initial.code} · ${initial.channel}` : 'Compose a re-usable message'}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField
          label="Code" value={body.code}
          onChange={(e) => patch('code', e.target.value)}
          size="small" fullWidth required
          helperText="e.g. SALE_RECEIPT, QUOTATION_SENT"
        />
        <TextField
          label="Channel" select value={body.channel}
          onChange={(e) => patch('channel', e.target.value as Channel)}
          size="small" sx={{ minWidth: 140 }}
        >
          <MenuItem value="EMAIL">Email</MenuItem>
          <MenuItem value="SMS">SMS</MenuItem>
          <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
        </TextField>
      </Stack>

      <TextField
        label="Display name" value={body.name}
        onChange={(e) => patch('name', e.target.value)}
        size="small" fullWidth required
      />

      {body.channel === 'EMAIL' && (
        <TextField
          label="Subject" value={body.subject ?? ''}
          onChange={(e) => patch('subject', e.target.value)}
          size="small" fullWidth
          helperText="Supports {{placeholder}} substitution"
        />
      )}

      <TextField
        label="Body" value={body.body}
        onChange={(e) => patch('body', e.target.value)}
        size="small" fullWidth required
        multiline minRows={6}
        helperText="Use {{customer_name}}, {{ref}}, {{total}}…"
      />

      <Stack direction="row" spacing={2} alignItems="center">
        <FormControlLabel
          control={<Switch checked={!!body.html} onChange={(e) => patch('html', e.target.checked)} />}
          label="HTML body"
        />
        <FormControlLabel
          control={<Switch checked={body.isDefault !== false} onChange={(e) => patch('isDefault', e.target.checked)} />}
          label="Use as default"
        />
        <FormControlLabel
          control={<Switch checked={body.enabled !== false} onChange={(e) => patch('enabled', e.target.checked)} />}
          label="Enabled"
        />
      </Stack>

      {/* Preview */}
      <Typography variant="subtitle2" sx={{ color: brand.neutral[700], fontWeight: 700 }}>Preview</Typography>
      <TextField
        label="Sample data (JSON)" value={previewData}
        onChange={(e) => setPreviewData(e.target.value)}
        size="small" fullWidth multiline minRows={3}
      />
      <Box sx={{
        border: `1px solid ${brand.neutral[200]}`, borderRadius: 2, p: 2, bgcolor: brand.neutral[50],
      }}>
        {previewSubject && (
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            Subject: <strong>{previewSubject}</strong>
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          {body.html
            ? <Box dangerouslySetInnerHTML={{ __html: previewBody }} />
            : <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{previewBody}</Typography>}
        </Box>
      </Box>

      {initial && onDelete && (
        <Stack direction="row" justifyContent="flex-start" sx={{ mt: 1 }}>
          <Button color="error" startIcon={<IconTrash size={16} />} onClick={onDelete}>
            Delete template
          </Button>
        </Stack>
      )}
    </EditDrawer>
  );
}
