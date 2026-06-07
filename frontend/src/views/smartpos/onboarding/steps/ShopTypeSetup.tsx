import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CircularProgress,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconPill,
  IconTools,
  IconShoppingCart,
  IconChefHat,
  IconBuildingStore,
  IconCheck,
} from '@tabler/icons-react';
import { useVerticals } from 'src/context/smartpos/VerticalContext';
import { brand } from 'src/theme/smartpos/brand';

/**
 * Available shop types a tenant can choose during setup.
 * Single-select — one vertical at a time. "Other" = generic POS (no vertical).
 */
const SHOP_TYPES = [
  {
    key: 'pharmacy',
    label: 'Pharmacy / Duka la Dawa',
    description: 'Sell medicines, track prescriptions, manage batches & expiry dates, NDA compliance.',
    icon: <IconPill size={28} />,
    color: '#E91E63',
    examples: 'Drug store, community pharmacy, hospital dispensary',
  },
  {
    key: 'hardware',
    label: 'Hardware / Vifaa',
    description: 'Sell tools, electronics, building materials. Track warranties, dimensions, and specs.',
    icon: <IconTools size={28} />,
    color: '#2196F3',
    examples: 'Hardware shop, electronics store, building supplies',
  },
  {
    key: 'supermarket',
    label: 'Supermarket / Duka',
    description: 'Fast-moving consumer goods, shelf-life tracking, allergen & nutritional info.',
    icon: <IconShoppingCart size={28} />,
    color: '#4CAF50',
    examples: 'Supermarket, mini-mart, grocery store, FMCG wholesaler',
  },
  {
    key: 'restaurant',
    label: 'Restaurant / Mlo',
    description: 'Food service, recipe costing, prep time tracking, menu ingredient management.',
    icon: <IconChefHat size={28} />,
    color: '#FF9800',
    examples: 'Restaurant, café, food court, catering business',
  },
];

export default function ShopTypeSetup() {
  const { activeVerticals, activate, deactivate, loading: ctxLoading } = useVerticals();
  const [selected, setSelected] = useState<string | null>(
    () => activeVerticals.length > 0 ? activeVerticals[0].key : null,
  );
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (key: string) => {
    setError(null);
    setActivating(true);
    try {
      // Deactivate previous vertical if switching
      if (selected && selected !== key) {
        try { await deactivate(selected); } catch { /* may not be active */ }
      }
      await activate(key);
      setSelected(key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to activate shop type');
    } finally {
      setActivating(false);
    }
  };

  const handleOther = async () => {
    setError(null);
    setActivating(true);
    try {
      // Deactivate current vertical so tenant goes back to generic POS
      if (selected) {
        try { await deactivate(selected); } catch { /* may not be active */ }
      }
      setSelected(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset shop type');
    } finally {
      setActivating(false);
    }
  };

  if (ctxLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: brand.primary[600] }} />
      </Box>
    );
  }

  const selectedCard = SHOP_TYPES.find((st) => st.key === selected);

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          What kind of shop do you run?
        </Typography>
        <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
          This tailors the product catalog to your business. You can change this anytime in Settings.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Typography variant="body2" sx={{ color: 'error.main' }}>
          {error}
        </Typography>
      )}

      {/* Shop type cards — single select with radio */}
      <Stack spacing={1.5}>
        {SHOP_TYPES.map((st) => {
          const isSelected = selected === st.key;
          return (
            <Card
              key={st.key}
              variant="outlined"
              sx={{
                border: isSelected
                  ? `2px solid ${st.color}`
                  : `1px solid ${brand.neutral[200]}`,
                borderRadius: '14px',
                transition: 'all 0.15s',
                opacity: activating ? 0.6 : 1,
                bgcolor: isSelected ? `${st.color}08` : 'transparent',
                '&:hover': {
                  borderColor: st.color,
                  boxShadow: isSelected ? `0 0 0 3px ${st.color}18` : `0 0 0 1px ${st.color}30`,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelect(st.key)}
                disabled={activating}
                sx={{ p: 2 }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${st.color}14`,
                      color: st.color,
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {st.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {st.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: brand.neutral[600], mb: 0.75, lineHeight: 1.5 }}
                    >
                      {st.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: brand.neutral[400], fontStyle: 'italic' }}
                    >
                      {st.examples}
                    </Typography>
                  </Box>
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
          );
        })}
      </Stack>

      {/* "Other / Generic" option */}
      <Card
        variant="outlined"
        sx={{
          border: selected === null
            ? `2px solid ${brand.neutral[500]}`
            : `1px solid ${brand.neutral[200]}`,
          borderRadius: '14px',
          transition: 'all 0.15s',
          opacity: activating ? 0.6 : 1,
          bgcolor: selected === null ? brand.neutral[50] : 'transparent',
          '&:hover': {
            borderColor: brand.neutral[500],
            boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
          },
        }}
      >
        <CardActionArea
          onClick={handleOther}
          disabled={activating}
          sx={{ p: 2 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: brand.neutral[100],
                color: brand.neutral[600],
                flexShrink: 0,
              }}
            >
              <IconBuildingStore size={28} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                Other — Generic Shop
              </Typography>
              <Typography variant="body2" sx={{ color: brand.neutral[600], lineHeight: 1.5 }}>
                No specialized fields. A standard POS for any type of retail, wholesale, or general store.
                You can always add a specific shop type later in Settings.
              </Typography>
            </Box>
            <Radio
              checked={selected === null}
              sx={{
                flexShrink: 0,
                color: brand.neutral[300],
                '&.Mui-checked': { color: brand.neutral[600] },
              }}
            />
          </Stack>
        </CardActionArea>
      </Card>

      {/* Selection confirmation */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: '12px',
          bgcolor: selected ? brand.primary[50] : brand.neutral[100],
          border: `1px solid ${selected ? brand.primary[200] : brand.neutral[300]}`,
        }}
      >
        {selectedCard ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: selectedCard.color,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <IconCheck size={14} />
            </Box>
            <Typography variant="body2" sx={{ color: brand.primary[700], fontWeight: 600 }}>
              Your product catalog is now configured for <strong>{selectedCard.label}</strong>.
              Fields like {selectedCard.key === 'pharmacy'
                ? 'NDA registration, dosage form, and batch tracking'
                : selectedCard.key === 'hardware'
                  ? 'warranty tracking, dimensions, and voltage'
                  : selectedCard.key === 'supermarket'
                    ? 'shelf life, allergen info, and certifications'
                    : 'prep time, recipe cost, and dietary flags'}
              {' '}will appear when adding products.
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: brand.neutral[500],
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <IconCheck size={14} />
            </Box>
            <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 600 }}>
              Generic POS mode — all standard product fields with no specialized vertical extensions.
              You can pick a specific shop type anytime in Settings.
            </Typography>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
