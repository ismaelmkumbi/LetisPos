import { useContext } from 'react';
import { Box, Card, CardContent, Checkbox, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { VariantInlineEdit } from './VariantInlineEdit';
import { VariantImageUpload } from './VariantImageUpload';
import type { Variant } from 'src/api/smartpos/types';

interface VariantCardGridProps {
  variants: Variant[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Variant>) => void;
  onDelete: (id: string) => void;
}

export function VariantCardGrid({
  variants,
  selectedIds,
  onToggleSelect,
  onUpdate,
  onDelete,
}: VariantCardGridProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  if (variants.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 2,
      }}
    >
      {variants.map((v) => {
        const isSelected = selectedIds.has(v.id);
        const cardBg = isSelected
          ? isDark ? brand.primary[900] : brand.primary[50]
          : isDark ? brand.neutral[800] : '#fff';
        const cardBorder = isSelected
          ? brand.primary[400]
          : isDark ? brand.neutral[700] : brand.neutral[200];

        return (
          <Card
            key={v.id}
            sx={{
              borderRadius: '14px',
              border: `1px solid ${cardBorder}`,
              bgcolor: cardBg,
              transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s',
              '&:hover': {
                borderColor: brand.primary[300],
                boxShadow: isDark
                  ? `0 4px 16px -8px rgba(0,0,0,0.5)`
                  : `0 4px 16px -8px ${brand.primary[200]}`,
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onChange={() => onToggleSelect(v.id)}
                  sx={{
                    p: 0.375,
                    color: isDark ? brand.neutral[600] : brand.neutral[300],
                    '&.Mui-checked': { color: brand.primary[600] },
                  }}
                />
                <Tooltip title="Delete variant">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(v.id)}
                    sx={{
                      borderRadius: '8px',
                      color: isDark ? brand.neutral[500] : brand.neutral[400],
                      '&:hover': {
                        color: brand.error.main,
                        bgcolor: isDark ? 'rgba(239,68,68,0.15)' : brand.error.light,
                      },
                    }}
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                <VariantImageUpload
                  imageUrl={v.imageUrl}
                  onChange={(url) => onUpdate(v.id, { imageUrl: url })}
                  size={140}
                  isDark={isDark}
                />
              </Box>

              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  mb: 1,
                  color: isDark ? brand.neutral[100] : brand.neutral[800],
                  textAlign: 'center',
                }}
              >
                {v.name}
              </Typography>

              <Stack spacing={0.75}>
                <FieldRow label="SKU" isDark={isDark}>
                  <VariantInlineEdit
                    value={v.code}
                    onChange={(val) => onUpdate(v.id, { code: val as string | null })}
                    placeholder="Add SKU"
                    isDark={isDark}
                    sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                  />
                </FieldRow>
                <FieldRow label="Cost" isDark={isDark}>
                  <VariantInlineEdit
                    value={v.cost}
                    onChange={(val) => onUpdate(v.id, { cost: val as number | null })}
                    type="currency"
                    isDark={isDark}
                  />
                </FieldRow>
                <FieldRow label="Price" isDark={isDark}>
                  <VariantInlineEdit
                    value={v.price}
                    onChange={(val) => onUpdate(v.id, { price: val as number | null })}
                    type="currency"
                    isDark={isDark}
                  />
                </FieldRow>
                <FieldRow label="Wholesale" isDark={isDark}>
                  <VariantInlineEdit
                    value={v.wholesalePrice}
                    onChange={(val) => onUpdate(v.id, { wholesalePrice: val as number | null })}
                    type="currency"
                    placeholder="—"
                    isDark={isDark}
                  />
                </FieldRow>
                <FieldRow label="Min price" isDark={isDark}>
                  <VariantInlineEdit
                    value={v.minPrice}
                    onChange={(val) => onUpdate(v.id, { minPrice: val as number | null })}
                    type="currency"
                    placeholder="—"
                    isDark={isDark}
                  />
                </FieldRow>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

function FieldRow({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography
        variant="caption"
        sx={{
          color: isDark ? brand.neutral[500] : brand.neutral[400],
          fontWeight: 600,
          fontSize: '0.7rem',
          minWidth: 62,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}
