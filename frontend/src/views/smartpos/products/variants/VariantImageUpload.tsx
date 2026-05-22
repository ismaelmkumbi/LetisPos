import { useState, useCallback } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { IconPhoto, IconUpload } from '@tabler/icons-react';
import { uploadProductImage } from 'src/api/smartpos/products';
import { brand } from 'src/theme/smartpos/brand';

interface VariantImageUploadProps {
  imageUrl?: string | null;
  onChange: (url: string) => void;
  size?: number;
  isDark?: boolean;
}

export function VariantImageUpload({
  imageUrl,
  onChange,
  size = 120,
  isDark = false,
}: VariantImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const result = await uploadProductImage(file);
        onChange(result.url);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const borderColor = isDark ? brand.neutral[700] : brand.neutral[200];
  const bgColor = isDark ? brand.neutral[900] : brand.neutral[50];
  const hoverBorder = brand.primary[400];
  const hoverBg = isDark ? 'rgba(22,163,74,0.1)' : brand.primary[50];
  const iconColor = isDark ? brand.neutral[500] : brand.neutral[400];
  const labelColor = isDark ? brand.neutral[500] : brand.neutral[400];

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        border: `2px dashed ${borderColor}`,
        bgcolor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.2s, background-color 0.2s',
        '&:hover': { borderColor: hoverBorder, bgcolor: hoverBg },
      }}
    >
      {uploading ? (
        <CircularProgress size={24} sx={{ color: brand.primary[600] }} />
      ) : imageUrl ? (
        <>
          <Box
            component="img"
            src={imageUrl}
            alt="Variant"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 1 },
            }}
          >
            <IconUpload size={20} color="white" />
          </Box>
        </>
      ) : (
        <Stack direction="column" alignItems="center" spacing={0.5}>
          <IconPhoto size={24} color={iconColor} stroke={1.5} />
          <Typography
            variant="caption"
            sx={{ color: labelColor, fontSize: '0.65rem', fontWeight: 600 }}
          >
            Image
          </Typography>
        </Stack>
      )}
      <input
        type="file"
        accept="image/*"
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        onChange={handleFile}
        disabled={uploading}
      />
      {error && (
        <Typography
          variant="caption"
          sx={{ color: brand.error.main, position: 'absolute', bottom: 2, fontSize: '0.6rem' }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
