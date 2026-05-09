/**
 * Notifications & Alerts Settings — low-stock alert, daily summary,
 * and alert email address.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Stack,
  TextField,
  Typography,
  Zoom,
} from '@mui/material';
import { IconBellRinging, IconAlertTriangle, IconReportAnalytics } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx, SectionTitle, AlertCard, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import type { Theme } from '@mui/material/styles';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import {
  getPosSettings, updatePosSettings, resetPosSettings, type PosSettings,
} from 'src/api/smartpos/posSettings';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { UUID } from 'src/api/smartpos/types';

const fieldSx = (theme: Theme) => {
  const base = premiumFieldSx(theme);
  return { ...base, '& .MuiOutlinedInput-root': { ...base['& .MuiOutlinedInput-root'], borderRadius: '10px' } };
};

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<UUID | null>(null);
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((w) => setWarehouses(w.filter((x) => x.active)))
      .catch(() => setError('Failed to load warehouses'));
  }, []);

  useEffect(() => {
    if (!warehouseId) { setSettings(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPosSettings(warehouseId)
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [warehouseId]);

  useEffect(() => {
    if (warehouseId || warehouses.length === 0) return;
    const first = user?.warehouseIds?.[0] ?? warehouses[0]?.id;
    if (first) setWarehouseId(first);
  }, [warehouses, warehouseId, user]);

  const update = useCallback((patch: Partial<PosSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const showInfo = (msg: string) => { setInfo(msg); setTimeout(() => setInfo(null), 3500); };

  const handleSave = async () => {
    if (!warehouseId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePosSettings(warehouseId, {
        lowStockAlertEnabled: settings.lowStockAlertEnabled,
        dailySummaryEnabled: settings.dailySummaryEnabled,
        alertEmail: settings.alertEmail,
      });
      setSettings(updated);
      showInfo('Notification settings saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!warehouseId) return;
    setResetting(true);
    try {
      const defaults = await resetPosSettings(warehouseId);
      setSettings(defaults);
      showInfo('Settings reset to factory defaults.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const selWarehouse = warehouses.find((w) => w.id === warehouseId);
  const anyEnabled = settings ? (settings.lowStockAlertEnabled || settings.dailySummaryEnabled) : false;

  return (
    <Box>
      <PageHeader
        title="Notifications & Alerts"
        subtitle="Configure automated alerts and summary emails"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconBellRinging size={20} />} title="Configuration scope" />
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
          Configure notifications per warehouse.
        </Typography>
        <Autocomplete
          value={selWarehouse ?? null}
          options={warehouses}
          getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
          onChange={(_, v) => v && setWarehouseId(v.id)}
          renderInput={(p) => <TextField {...p} size="small" sx={(theme) => ({ ...fieldSx(theme), minWidth: 360 })} />}
          sx={{ maxWidth: 480 }}
        />
      </Box>

      {!warehouseId && !loading && (
        <Alert severity="info">Select a warehouse to configure its notification settings.</Alert>
      )}

      {loading && warehouseId && <CardSkeletonGroup heights={[180, 140]} />}

      {!loading && settings && warehouseId && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Alert toggles + Delivery email row */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            {/* Alert toggles */}
            <Box sx={{ ...cardSx, p: 2.5, flex: 1 }}>
              <SectionTitle icon={<IconBellRinging size={20} />} title="Alert types" />
              <Stack spacing={1.25}>
                <AlertCard
                  icon={<IconAlertTriangle size={20} />}
                  title="Low stock alert"
                  description={`Notify when a product falls at or below ${settings.lowStockThreshold} units (threshold set in POS Behaviour).`}
                  checked={settings.lowStockAlertEnabled}
                  onChange={(v) => update({ lowStockAlertEnabled: v })}
                  accentColor={brand.warning.main}
                />
                <AlertCard
                  icon={<IconReportAnalytics size={20} />}
                  title="Daily sales summary"
                  description="Receive an end-of-day email with total sales, revenue, and top products."
                  checked={settings.dailySummaryEnabled}
                  onChange={(v) => update({ dailySummaryEnabled: v })}
                  accentColor={brand.primary[500]}
                />
              </Stack>
            </Box>

            {/* Delivery */}
            <Box sx={{
              ...cardSx, p: 2.5, flex: 1,
              opacity: anyEnabled ? 1 : 0.55,
              pointerEvents: anyEnabled ? 'auto' : 'none',
            }}>
              <SectionTitle icon={<IconBellRinging size={20} />} title="Delivery" />
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{
                  width: 40, height: 40, borderRadius: 2,
                  bgcolor: brand.primary[50],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, mt: 0.5,
                }}>
                  <IconBellRinging size={20} color={brand.primary[500]} />
                </Box>
                <TextField
                  label="Alert email address"
                  value={settings.alertEmail}
                  onChange={(e) => update({ alertEmail: e.target.value })}
                  size="small"
                  fullWidth
                  sx={(theme) => ({ maxWidth: 400, ...fieldSx(theme) })}
                  type="email"
                  helperText={
                    anyEnabled
                      ? 'All enabled alerts will be sent to this address.'
                      : 'Enable at least one alert type above.'
                  }
                />
              </Stack>
            </Box>
          </Stack>

          {/* Floating save bar */}
          <Zoom in>
            <FloatingSaveBar
              saving={saving}
              onSave={handleSave}
              onReset={handleReset}
              resetting={resetting}
              lastSavedAt={settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : undefined}
            />
          </Zoom>
        </Stack>
      )}
    </Box>
  );
}
