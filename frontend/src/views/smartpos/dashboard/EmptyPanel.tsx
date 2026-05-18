import { Box, Typography } from '@mui/material';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { muted, titleColor } from './utils';

interface EmptyPanelProps {
  title: string;
  subtitle: string;
  height: number;
  compact?: boolean;
}

export default function EmptyPanel({
  title,
  subtitle,
  height,
  compact = false,
}: EmptyPanelProps) {
  const { activeMode: _ep } = useContext(CustomizerContext);
  const isDark = _ep === 'dark';
  return (
    <Box
      sx={{
        height,
        minHeight: height,
        borderRadius: compact ? '8px' : '12px',
        border: compact ? 'none' : `1px dashed ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: compact ? 'transparent' : isDark ? brand.neutral[900] : brand.neutral[50],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: compact ? 0 : 2,
        textAlign: 'center',
      }}
    >
      {title && (
        <Typography sx={{ color: titleColor, fontWeight: 800, fontSize: compact ? 12 : 14 }}>
          {title}
        </Typography>
      )}
      <Typography sx={{ color: muted(isDark), fontSize: compact ? 11 : 12, mt: title ? 0.25 : 0 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
