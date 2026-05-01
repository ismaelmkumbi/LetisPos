/**
 * Language management — Stocky parity:
 *   • view installed languages
 *   • add a new language (code + name + RTL flag)
 *   • inspect & edit translation strings (per namespace)
 *   • bulk import a JSON dictionary
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { IconCheck, IconLanguage, IconPlus, IconUpload } from '@tabler/icons-react';

import {
  addLanguage, bulkUpsert, getBundle, listLanguages, upsertTranslation,
  type Language,
} from 'src/api/smartpos/i18n';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

export default function I18nAdminPage() {
  const [tab, setTab] = useState<'languages' | 'translations'>('languages');
  return (
    <>
      <PageHeader
        title="Languages &amp; translations"
        subtitle="24+ locales · admin can add new languages and edit strings"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="languages"    label="Languages" />
        <Tab value="translations" label="Translations" />
      </Tabs>
      {tab === 'languages'    && <LanguagesTab />}
      {tab === 'translations' && <TranslationsTab />}
    </>
  );
}

// ----------------------------------------------------------------

function LanguagesTab() {
  const [rows, setRows] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', rtl: false });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listLanguages()
      .then((items) => !cancelled && setRows(items))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [refreshToken]);

  const handleAdd = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    try {
      await addLanguage(form.code, form.name, form.rtl);
      setOpen(false);
      setForm({ code: '', name: '', rtl: false });
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setOpen(true)}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          Add language
        </Button>
      </Stack>

      <Card variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="center">RTL</TableCell>
              <TableCell align="center">Default</TableCell>
              <TableCell align="center">Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
            {!loading && rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{l.code}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell align="center">{l.rtl ? '✓' : ''}</TableCell>
                <TableCell align="center">
                  {l.isDefault && <Chip icon={<IconCheck size={14} />} label="Default" size="small"
                    sx={{ bgcolor: brand.accent[50], color: brand.accent[700], fontWeight: 600 }} />}
                </TableCell>
                <TableCell align="center">
                  <Chip label={l.enabled ? 'On' : 'Off'} size="small"
                    sx={{
                      bgcolor: l.enabled ? brand.success.light : brand.neutral[100],
                      color:   l.enabled ? brand.success.dark  : brand.neutral[500],
                    }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add language</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="BCP-47 code" size="small" required
              helperText='e.g. "en", "fr-CA", "ar"' value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
            <TextField label="Display name" size="small" required value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <input type="checkbox" checked={form.rtl}
                onChange={(e) => setForm((s) => ({ ...s, rtl: e.target.checked }))} />
              <Typography variant="body2">Right-to-left script</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------

function TranslationsTab() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<string>('en');
  const [bundle, setBundle] = useState<Record<string, Record<string, string>>>({});
  const [namespace, setNamespace] = useState('app');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('{\n  "key1": "value 1",\n  "key2": "value 2"\n}');

  useEffect(() => {
    listLanguages().then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBundle(language)
      .then((b) => !cancelled && setBundle(b))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [language]);

  const namespaces = useMemo(() => {
    const ns = Object.keys(bundle).sort();
    return ns.length ? ns : ['app'];
  }, [bundle]);

  const entries = useMemo(() => {
    const ns = bundle[namespace] ?? {};
    return Object.entries(ns)
      .filter(([k, v]) =>
        !search ||
        k.toLowerCase().includes(search.toLowerCase()) ||
        v.toLowerCase().includes(search.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [bundle, namespace, search]);

  const handleSave = async (key: string, value: string) => {
    try {
      await upsertTranslation(language, namespace, key, value);
      setBundle((b) => ({ ...b, [namespace]: { ...(b[namespace] ?? {}), [key]: value } }));
      setInfo(`Saved ${key}`);
      setTimeout(() => setInfo(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleBulk = async () => {
    try {
      const parsed = JSON.parse(bulkText);
      const r = await bulkUpsert(language, namespace, parsed);
      setBulkOpen(false);
      setInfo(`${r.upserted} entries imported.`);
      setBundle((b) => ({ ...b, [namespace]: { ...(b[namespace] ?? {}), ...parsed } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk import failed');
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info  && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Language" value={language}
          onChange={(e) => setLanguage(e.target.value)} sx={{ minWidth: 180 }}
          InputProps={{ startAdornment: <IconLanguage size={16} style={{ marginRight: 6 }} /> }}>
          {languages.map((l) => <MenuItem key={l.code} value={l.code}>{l.code} — {l.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Namespace" value={namespace}
          onChange={(e) => setNamespace(e.target.value)} sx={{ minWidth: 160 }}>
          {namespaces.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Search keys / values" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<IconUpload size={16} />} onClick={() => setBulkOpen(true)}>
          Bulk import
        </Button>
      </Stack>

      <Card variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: brand.neutral[50] }}>
            <TableRow>
              <TableCell sx={{ width: 280 }}>Key</TableCell>
              <TableCell>Value</TableCell>
              <TableCell sx={{ width: 100 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={3}>Loading…</TableCell></TableRow>}
            {!loading && entries.map(([key, value]) => (
              <EditableRow key={key} k={key} v={value} onSave={(v) => handleSave(key, v)} />
            ))}
            {!loading && entries.length === 0 && (
              <TableRow><TableCell colSpan={3}>
                <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                  No entries yet. Use bulk import to seed translations.
                </Typography>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk import — {language} / {namespace}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            Paste a flat JSON object: <code>{`{ "key": "value", ... }`}</code>
          </Typography>
          <TextField fullWidth multiline minRows={10} sx={{ mt: 1, fontFamily: 'monospace' }}
            value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBulk}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function EditableRow({ k, v, onSave }: { k: string; v: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(v);
  const dirty = val !== v;
  return (
    <TableRow>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{k}</TableCell>
      <TableCell>
        <TextField fullWidth size="small" value={val} onChange={(e) => setVal(e.target.value)}
          variant="standard" InputProps={{ disableUnderline: !dirty }} />
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" disabled={!dirty} onClick={() => onSave(val)}>
          <IconCheck size={16} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
