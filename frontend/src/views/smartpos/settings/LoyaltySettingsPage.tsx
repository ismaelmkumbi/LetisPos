/**
 * Loyalty Programme Settings — enable/disable, points-per-unit spent,
 * currency value of each point, and minimum points required to redeem.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
  Zoom,
} from '@mui/material';
import { IconGift, IconCoin } from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  cardSx, SectionTitle, FloatingSaveBar, CardSkeletonGroup,
} from 'src/components/smartpos/SettingsHelpers';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from 'src/components/smartpos/PosLayouts/shared';
import {
  getPosSettings, updatePosSettings, resetPosSettings, type PosSettings,
} from 'src/api/smartpos/posSettings';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { useAuth } from 'src/context/smartpos/AuthContext';
import type { UUID } from 'src/api/smartpos/types';

const fieldSx = { ...premiumFieldSx, '& .MuiOutlinedInput-root': { ...premiumFieldSx['& .MuiOutlinedInput-root'], borderRadius: '10px' } };

export default function LoyaltySettingsPage() {
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
        enableLoyalty: settings.enableLoyalty,
        loyaltyPointsPerUnit: settings.loyaltyPointsPerUnit,
        loyaltyValuePerPoint: settings.loyaltyValuePerPoint,
        loyaltyMinRedeemPoints: settings.loyaltyMinRedeemPoints,
      });
      setSettings(updated);
      showInfo('Loyalty settings saved.');
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

  // Live preview calculation
  const exampleSpend = 1000;
  const pointsEarned = settings ? Math.floor(exampleSpend * settings.loyaltyPointsPerUnit) : 0;
  const redemptionValue = settings ? pointsEarned * settings.loyaltyValuePerPoint : 0;
  const canRedeem = settings ? pointsEarned >= settings.loyaltyMinRedeemPoints : false;

  return (
    <Box>
      <PageHeader
        title="Loyalty Programme"
        subtitle="Reward customers with points on every purchase"
        badge={{ label: 'Enterprise', tone: 'primary' }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>{info}</Alert>}

      {/* Warehouse selector */}
      <Box sx={{ ...cardSx, p: 2.5, mb: 2.5 }}>
        <SectionTitle icon={<IconGift size={20} />} title="Configuration scope" />
        <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 1.5 }}>
          Configure loyalty programme per warehouse. Customers earn points on purchases and can redeem them for discounts.
        </Typography>
        <Autocomplete
          value={selWarehouse ?? null}
          options={warehouses}
          getOptionLabel={(w) => `${w.name}${w.city ? ` — ${w.city}` : ''}`}
          onChange={(_, v) => v && setWarehouseId(v.id)}
          renderInput={(p) => <TextField {...p} size="small" sx={{ ...fieldSx, minWidth: 360 }} />}
          sx={{ maxWidth: 480 }}
        />
      </Box>

      {!warehouseId && !loading && (
        <Alert severity="info">Select a warehouse to configure its loyalty programme.</Alert>
      )}

      {loading && warehouseId && <CardSkeletonGroup heights={[120, 240, 180]} />}

      {!loading && settings && warehouseId && (
        <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
          {/* Enable toggle */}
          <Box sx={{
            ...cardSx,
            borderColor: settings.enableLoyalty ? brand.primary[300] : brand.neutral[200],
            bgcolor: settings.enableLoyalty ? brand.primary[50] : '#fff',
            transition: 'all 0.2s',
          }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2.5 }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 2.5,
                bgcolor: settings.enableLoyalty ? brand.primary[100] : brand.neutral[100],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <IconGift size={26} color={settings.enableLoyalty ? brand.primary[600] : brand.neutral[400]} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  Loyalty programme
                </Typography>
                <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                  Customers earn points on purchases and can redeem them for discounts.
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableLoyalty}
                    onChange={(_, v) => update({ enableLoyalty: v })}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Stack>
          </Box>

          {/* Configuration + Live preview row */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5}>
            {/* Configuration */}
            <Box sx={{
              ...cardSx, p: 2.5, flex: 1,
              opacity: settings.enableLoyalty ? 1 : 0.5,
              pointerEvents: settings.enableLoyalty ? 'auto' : 'none',
            }}>
              <SectionTitle icon={<IconCoin size={20} />} title="Programme configuration" />
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Points per unit spent"
                    value={settings.loyaltyPointsPerUnit}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0) update({ loyaltyPointsPerUnit: v });
                    }}
                    type="number"
                    size="small"
                    sx={{ maxWidth: 220, ...fieldSx }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          pts / {settings.currencyCode || 'unit'}
                        </InputAdornment>
                      ),
                    }}
                    helperText="Points earned per 1 currency unit spent"
                  />
                  <TextField
                    label="Value per point"
                    value={settings.loyaltyValuePerPoint}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0) update({ loyaltyValuePerPoint: v });
                    }}
                    type="number"
                    size="small"
                    sx={{ maxWidth: 220, ...fieldSx }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {settings.currencySymbol || settings.currencyCode}
                        </InputAdornment>
                      ),
                    }}
                    helperText="Currency value of 1 point at redemption"
                  />
                </Stack>
                <TextField
                  label="Minimum points to redeem"
                  value={settings.loyaltyMinRedeemPoints}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 0) update({ loyaltyMinRedeemPoints: v });
                  }}
                  type="number"
                  size="small"
                  sx={{ maxWidth: 240, ...fieldSx }}
                  InputProps={{ endAdornment: <InputAdornment position="end">pts</InputAdornment> }}
                  helperText="Customer must have at least this many points to redeem"
                />
              </Stack>
            </Box>

            {/* Live preview */}
            {settings.enableLoyalty && (
              <Box sx={{
                ...cardSx, p: 2.5, flex: 1,
                borderColor: brand.accent[200],
                bgcolor: brand.accent[50],
              }}>
                <SectionTitle icon={<IconGift size={20} />} title="Live preview" />
                <Typography variant="body2" sx={{ color: brand.neutral[600], mb: 1.5 }}>
                  For a sale of <strong>{exampleSpend.toLocaleString()} {settings.currencyCode}</strong>:
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
                  <Box sx={{
                    p: 1.5, borderRadius: 2, bgcolor: 'white',
                    border: `1px solid ${brand.neutral[200]}`, minWidth: 140,
                  }}>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                      Points earned
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: brand.primary[700] }}>
                      {pointsEarned.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 1.5, borderRadius: 2, bgcolor: 'white',
                    border: `1px solid ${brand.neutral[200]}`, minWidth: 140,
                  }}>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                      Redemption value
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: brand.accent[600] }}>
                      {redemptionValue.toFixed(2)} {settings.currencyCode}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 1.5, borderRadius: 2, bgcolor: 'white',
                    border: `1px solid ${brand.neutral[200]}`, minWidth: 160,
                  }}>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                      Can redeem?
                    </Typography>
                    <Chip
                      label={canRedeem ? 'Yes — minimum reached' : `No — need ${settings.loyaltyMinRedeemPoints} pts`}
                      size="small"
                      sx={{
                        mt: 0.5, fontWeight: 600, fontSize: '0.72rem',
                        bgcolor: canRedeem ? brand.success.light : brand.neutral[100],
                        color: canRedeem ? brand.success.dark : brand.neutral[500],
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            )}
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
