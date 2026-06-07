/**
 * Shop Type Settings Page — tenant picks ONE vertical module for their business.
 * "None" = generic POS, no vertical extensions.
 */
import { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Radio,
  Stack,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconPill,
  IconTools,
  IconShoppingCart,
  IconChefHat,
  IconBuildingStore,
  IconCheck,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { useVerticals } from 'src/context/smartpos/VerticalContext';
import { brand } from 'src/theme/smartpos/brand';

const SHOP_TYPES = [
  {
    key: 'pharmacy',
    label: 'Pharmacy / Duka la Dawa',
    description: 'Pharmaceutical products — prescriptions, batch tracking, NDA/TFDA compliance, expiry management.',
    icon: <IconPill size={24} />,
    color: '#E91E63',
    fields: [
      { label: 'Prescription Required (Rx)' },
      { label: 'NDA / TFDA Registration' },
      { label: 'Dosage Form & Strength' },
      { label: 'Controlled Schedule (II-V)' },
      { label: 'Storage Condition' },
      { label: 'Batch Number & Expiry' },
      { label: 'ATC Code & Therapeutic Class' },
      { label: 'Generic Name & Active Ingredient' },
    ],
  },
  {
    key: 'hardware',
    label: 'Hardware / Vifaa',
    description: 'Tools, electronics, building materials — warranty tracking, dimensions, specs.',
    icon: <IconTools size={24} />,
    color: '#2196F3',
    fields: [
      { label: 'Part Number & OEM Brand' },
      { label: 'Warranty & Guarantee' },
      { label: 'Dimensions (L×W×H)' },
      { label: 'Weight' },
      { label: 'Material & Country of Origin' },
      { label: 'Power & Voltage' },
      { label: 'Technical Specifications' },
    ],
  },
  {
    key: 'supermarket',
    label: 'Supermarket / Duka',
    description: 'FMCG — shelf-life, allergens, certifications, nutritional info.',
    icon: <IconShoppingCart size={24} />,
    color: '#4CAF50',
    fields: [
      { label: 'Shelf Life (days)' },
      { label: 'Allergen Information' },
      { label: 'Nutritional Information' },
      { label: 'Organic Certification' },
      { label: 'Halal Certification' },
    ],
  },
  {
    key: 'restaurant',
    label: 'Restaurant / Mlo',
    description: 'Food service — recipes, prep time, ingredient costing.',
    icon: <IconChefHat size={24} />,
    color: '#FF9800',
    fields: [
      { label: 'Prep Time' },
      { label: 'Recipe Cost' },
      { label: 'Serving Size' },
      { label: 'Dietary Flags' },
      { label: 'Recipe Ingredients' },
    ],
  },
];

export default function ShopTypePage() {
  const { activeVerticals, activate, deactivate, loading, error: ctxError } = useVerticals();
  const [toggling, setToggling] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeKey = activeVerticals.length > 0 ? activeVerticals[0].key : null;

  const handleSelect = async (key: string) => {
    setToggling(true);
    setLocalError(null);
    try {
      // Deactivate current vertical first
      if (activeKey && activeKey !== key) {
        try { await deactivate(activeKey); } catch { /* no-op */ }
      }
      await activate(key);
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : 'Failed to change shop type');
    } finally {
      setToggling(false);
    }
  };

  const handleNone = async () => {
    setToggling(true);
    setLocalError(null);
    try {
      if (activeKey) {
        await deactivate(activeKey);
      }
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : 'Failed to reset shop type');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const activeMeta = activeKey ? SHOP_TYPES.find((st) => st.key === activeKey) : null;

  return (
    <Box>
      <PageHeader
        title="Shop Type"
        subtitle="Choose one business vertical. This adds specialized product fields to your catalog."
        breadcrumbs={[
          { label: 'Dashboard', href: '/smartpos' },
          { label: 'Settings', href: '/smartpos/settings' },
          { label: 'Shop Type' },
        ]}
      />

      {(ctxError || localError) && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
          {ctxError || localError}
        </Alert>
      )}

      {/* Current selection badge */}
      <Box sx={{ mb: 3 }}>
        {activeMeta ? (
          <Zoom in>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                px: 2.5,
                borderRadius: '12px',
                bgcolor: `${activeMeta.color}10`,
                border: `1.5px solid ${activeMeta.color}40`,
              }}
            >
              <Box sx={{ color: activeMeta.color, display: 'flex' }}>{activeMeta.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                  Active: {activeMeta.label}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  {activeMeta.fields.length} specialized fields enabled
                </Typography>
              </Box>
            </Box>
          </Zoom>
        ) : (
          <Zoom in>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                px: 2.5,
                borderRadius: '12px',
                bgcolor: brand.neutral[100],
                border: `1.5px solid ${brand.neutral[300]}`,
              }}
            >
              <Box sx={{ color: brand.neutral[500], display: 'flex' }}><IconBuildingStore size={20} /></Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
                  Generic POS mode — no specialized vertical
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  Standard product fields only
                </Typography>
              </Box>
            </Box>
          </Zoom>
        )}
      </Box>

      <Stack spacing={1.5}>
        {SHOP_TYPES.map((st) => {
          const isSelected = activeKey === st.key;
          return (
            <Zoom in key={st.key} timeout={300}>
              <Card
                variant="outlined"
                sx={{
                  border: isSelected
                    ? `2px solid ${st.color}` : `1px solid ${brand.neutral[200]}`,
                  borderRadius: '14px',
                  transition: 'all 0.2s',
                  opacity: toggling ? 0.5 : 1,
                  bgcolor: isSelected ? `${st.color}06` : 'transparent',
                  '&:hover': {
                    borderColor: st.color,
                    boxShadow: isSelected ? `0 0 0 3px ${st.color}18` : `0 0 0 1px ${st.color}30`,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => !isSelected && handleSelect(st.key)}
                  sx={{ p: 2.5 }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${st.color}14`,
                        color: st.color,
                        flexShrink: 0,
                      }}
                    >
                      {st.icon}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                          {st.label}
                        </Typography>
                        {isSelected && (
                          <Chip
                            icon={<IconCheck size={12} />}
                            label="Active"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: `${st.color}14`,
                              color: st.color,
                              border: `1px solid ${st.color}30`,
                            }}
                          />
                        )}
                      </Stack>

                      <Typography variant="body2" sx={{ color: brand.neutral[600], mb: 1.5, lineHeight: 1.5 }}>
                        {st.description}
                      </Typography>

                      {/* Field preview */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {st.fields.map((f) => (
                          <Chip
                            key={f.label}
                            label={f.label}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: '0.6875rem',
                              borderColor: brand.neutral[300],
                              color: brand.neutral[600],
                              mb: 0.5,
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    {/* Radio */}
                    <Radio
                      checked={isSelected}
                      sx={{
                        flexShrink: 0,
                        color: brand.neutral[300],
                        '&.Mui-checked': { color: st.color },
                      }}
                    />
                  </Stack>
                </CardActionArea>
              </Card>
            </Zoom>
          );
        })}

        {/* "None" / Generic option */}
        <Zoom in timeout={400}>
          <Card
            variant="outlined"
            sx={{
              border: activeKey === null
                ? `2px solid ${brand.neutral[500]}` : `1px solid ${brand.neutral[200]}`,
              borderRadius: '14px',
              transition: 'all 0.2s',
              opacity: toggling ? 0.5 : 1,
              bgcolor: activeKey === null ? brand.neutral[50] : 'transparent',
              '&:hover': {
                borderColor: brand.neutral[500],
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
              },
            }}
          >
            <CardActionArea
              onClick={() => activeKey !== null && handleNone()}
              sx={{ p: 2.5 }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: brand.neutral[100],
                    color: brand.neutral[500],
                    flexShrink: 0,
                  }}
                >
                  <IconBuildingStore size={24} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                    None — Generic POS
                  </Typography>
                  <Typography variant="body2" sx={{ color: brand.neutral[600], lineHeight: 1.5 }}>
                    Standard product catalog with no specialized vertical fields. Works for any type of shop.
                  </Typography>
                </Box>
                <Radio
                  checked={activeKey === null}
                  sx={{
                    flexShrink: 0,
                    color: brand.neutral[300],
                    '&.Mui-checked': { color: brand.neutral[600] },
                  }}
                />
              </Stack>
            </CardActionArea>
          </Card>
        </Zoom>
      </Stack>
    </Box>
  );
}
