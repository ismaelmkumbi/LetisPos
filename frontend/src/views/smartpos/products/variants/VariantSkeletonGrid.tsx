import { useContext } from 'react';
import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';

export function VariantSkeletonGrid() {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 2,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          sx={{
            borderRadius: '14px',
            border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            bgcolor: isDark ? brand.neutral[800] : '#fff',
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Skeleton
                variant="rounded"
                width={18}
                height={18}
                sx={{
                  borderRadius: '4px',
                  bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                }}
              />
              <Skeleton
                variant="rounded"
                width={18}
                height={18}
                sx={{
                  borderRadius: '4px',
                  bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                }}
              />
            </Stack>

            <Stack alignItems="center" sx={{ mb: 1.5 }}>
              <Skeleton
                variant="rounded"
                width={140}
                height={140}
                sx={{
                  borderRadius: '12px',
                  bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                }}
              />
            </Stack>

            <Skeleton
              variant="text"
              width="60%"
              sx={{ mx: 'auto', mb: 1, bgcolor: isDark ? brand.neutral[700] : brand.neutral[100] }}
            />

            {Array.from({ length: 5 }).map((_, j) => (
              <Stack key={j} direction="row" spacing={1} sx={{ mb: 0.75 }}>
                <Skeleton
                  variant="text"
                  width={60}
                  sx={{ bgcolor: isDark ? brand.neutral[700] : brand.neutral[100] }}
                />
                <Skeleton
                  variant="text"
                  width="60%"
                  sx={{ bgcolor: isDark ? brand.neutral[700] : brand.neutral[100] }}
                />
              </Stack>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
