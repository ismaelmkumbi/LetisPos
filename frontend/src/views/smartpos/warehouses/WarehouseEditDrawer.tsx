import { useEffect, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {
  IconBuildingWarehouse, IconChevronDown, IconMail, IconMapPin,
  IconNotes, IconPhone, IconPower,
} from '@tabler/icons-react';

import {
  createWarehouse, updateWarehouse, toggleWarehouseStatus,
  type Warehouse, type WarehouseInput,
} from 'src/api/smartpos/inventory';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand } from 'src/theme/smartpos/brand';

export interface WarehouseEditDrawerProps {
  open: boolean;
  initial?: Warehouse | null;
  onClose: () => void;
  onSaved: (w: Warehouse) => void;
}

const empty: WarehouseInput = { name: '', code: '', city: '', country: '', phone: '', email: '', zip: '', notes: '' };

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{
        width: 32, height: 32, borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${brand.primary[50]} 0%, ${brand.primary[100]} 100%)`,
        color: brand.primary[700],
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block', lineHeight: 1.2 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export default function WarehouseEditDrawer({ open, initial, onClose, onSaved }: WarehouseEditDrawerProps) {
  const [form, setForm] = useState<WarehouseInput>(empty);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    contact: false,
    location: false,
    notes: false,
    status: false,
  });
  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code ?? '',
        name: initial.name,
        city: initial.city ?? '',
        country: initial.country ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        zip: initial.zip ?? '',
        notes: initial.notes ?? '',
      });
      setActive(initial.active);
      setOpenSections((s) => ({ ...s, basic: true, status: true }));
    } else {
      setForm(empty);
      setActive(true);
      setOpenSections({ basic: true, contact: false, location: false, notes: false, status: false });
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof WarehouseInput>(k: K, v: WarehouseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateWarehouse(initial.id, form)
        : await createWarehouse(form);
      if (initial && saved.active !== active) {
        const updated = await toggleWarehouseStatus(saved.id, active);
        onSaved(updated);
      } else {
        onSaved(saved);
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditDrawer
      open={open} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}
      title={initial ? 'Edit warehouse' : 'New warehouse'}
      subtitle={initial ? (initial.code ?? initial.name) : 'Add a stock location'}
      width={520}
    >
      {error && <Alert severity="error">{error}</Alert>}

      {/* Section 1 · Basic information */}
      <Accordion
        expanded={openSections.basic}
        onChange={() => toggle('basic')}
        disableGutters elevation={0}
        sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
          <SectionTitle
            icon={<IconBuildingWarehouse size={16} />}
            title="Basic information"
            hint="Code and name"
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Code" value={form.code ?? ''}
                onChange={(e) => patch('code', e.target.value)}
                size="small" sx={{ width: 140 }}
                placeholder="e.g. WH-001"
              />
              <TextField
                label="Name *" value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                size="small" required fullWidth
                placeholder="e.g. Main Store"
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Section 2 · Contact */}
      <Accordion
        expanded={openSections.contact}
        onChange={() => toggle('contact')}
        disableGutters elevation={0}
        sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
          <SectionTitle
            icon={<IconPhone size={16} />}
            title="Contact"
            hint="Email and phone"
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Email" type="email" value={form.email ?? ''}
                onChange={(e) => patch('email', e.target.value)}
                size="small" fullWidth
                placeholder="warehouse@example.com"
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ display: 'flex', mr: 1, color: brand.neutral[400] }}>
                      <IconMail size={16} />
                    </Box>
                  ),
                }}
              />
              <TextField
                label="Phone" value={form.phone ?? ''}
                onChange={(e) => patch('phone', e.target.value)}
                size="small" fullWidth
                placeholder="+255..."
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ display: 'flex', mr: 1, color: brand.neutral[400] }}>
                      <IconPhone size={16} />
                    </Box>
                  ),
                }}
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Section 3 · Location */}
      <Accordion
        expanded={openSections.location}
        onChange={() => toggle('location')}
        disableGutters elevation={0}
        sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
          <SectionTitle
            icon={<IconMapPin size={16} />}
            title="Location"
            hint="City, country, and postal code"
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="City" value={form.city ?? ''}
                onChange={(e) => patch('city', e.target.value)}
                size="small" fullWidth
                placeholder="e.g. Dar es Salaam"
              />
              <TextField
                label="Country" value={form.country ?? ''}
                onChange={(e) => patch('country', e.target.value)}
                size="small" fullWidth
                placeholder="e.g. Tanzania"
              />
              <TextField
                label="ZIP" value={form.zip ?? ''}
                onChange={(e) => patch('zip', e.target.value)}
                size="small" sx={{ width: 120 }}
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Section 4 · Notes */}
      <Accordion
        expanded={openSections.notes}
        onChange={() => toggle('notes')}
        disableGutters elevation={0}
        sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
          <SectionTitle
            icon={<IconNotes size={16} />}
            title="Notes"
            hint="Internal remarks about this location"
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          <TextField
            label="Notes" value={form.notes ?? ''}
            onChange={(e) => patch('notes', e.target.value)}
            size="small" multiline minRows={3} fullWidth
            placeholder="Any additional information…"
          />
        </AccordionDetails>
      </Accordion>

      {/* Section 5 · Status (edit only) */}
      {initial && (
        <Accordion
          expanded={openSections.status}
          onChange={() => toggle('status')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconPower size={16} />}
              title="Status"
              hint={active ? 'Warehouse is active' : 'Warehouse is inactive'}
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Box
              sx={{
                p: 1.5, borderRadius: '12px',
                border: `1px solid ${brand.neutral[200]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 1.5,
                bgcolor: active ? brand.primary[50] : brand.neutral[100],
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                  {active ? 'Active' : 'Inactive'}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                  {active ? 'Visible and usable across the system' : 'Hidden from operations'}
                </Typography>
              </Box>
              <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </EditDrawer>
  );
}
