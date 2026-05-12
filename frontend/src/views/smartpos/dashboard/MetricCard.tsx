import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { cardSx, muted, titleColor, sparkOptions } from './utils';
import EmptyPanel from './EmptyPanel';
import type { MetricCardProps } from './types';

export default function MetricCard({
  label,
  value,
  change,
  icon,
  color,
  series,
  delta,
  onClick,
}: MetricCardProps) {
  const { activeMode: _am2 } = useContext(CustomizerContext);
  const isDark = _am2 === 'dark';

  const content = (
    <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: `${color}12`,
          color,
          display: 'grid',
          placeItems: 'center',
          mb: 1.25,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ color: titleColor, fontWeight: 700, fontSize: 13 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 20 }}>
          {value}
        </Typography>
        {delta && (
          <Chip
            size="small"
            icon={delta.positive ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
            label={`${delta.positive ? '+' : '-'}${delta.value.toFixed(1)}%`}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 800,
              bgcolor: delta.positive ? '#ECFDF5' : '#FEF2F2',
              color: delta.positive ? brand.primary[600] : brand.error.main,
              '& .MuiChip-icon': {
                color: delta.positive ? brand.primary[600] : brand.error.main,
                marginLeft: '4px',
              },
            }}
          />
        )}
      </Stack>
      {change ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          <IconArrowUp size={14} color={brand.primary[600]} />
          <Typography sx={{ color: brand.primary[600], fontWeight: 800, fontSize: 12 }}>
            {change}
          </Typography>
        </Stack>
      ) : (
        <Typography sx={{ color: muted(isDark), fontSize: 12, mt: 1 }}>Live total</Typography>
      )}
      <Typography sx={{ color: muted(isDark), fontSize: 12 }}>selected period</Typography>
      <Box sx={{ mt: 'auto', mx: -1, mb: -1 }}>
        {series.length ? (
          <Chart
            options={sparkOptions(color)}
            series={[{ name: label, data: series }]}
            type="area"
            height={46}
          />
        ) : (
          <EmptyPanel title="" subtitle="No series" height={46} compact />
        )}
      </Box>
    </CardContent>
  );

  if (onClick) {
    return (
      <Card
        elevation={0}
        sx={{
          ...cardSx(isDark),
          minHeight: 204,
          cursor: 'pointer',
          transition: 'transform 0.16s ease, box-shadow 0.16s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 28px rgba(15,23,42,0.1)',
          },
        }}
      >
        <CardActionArea
          onClick={onClick}
          sx={{
            height: '100%',
            '& .MuiCardActionArea-focusHighlight': { bgcolor: `${color}12` },
          }}
        >
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), minHeight: 204 }}>
      {content}
    </Card>
  );
}
