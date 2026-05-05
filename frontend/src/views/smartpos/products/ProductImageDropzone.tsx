import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, CircularProgress, IconButton, Tooltip, Avatar } from '@mui/material';
import { IconCamera, IconTrash, IconUpload } from '@tabler/icons-react';
import { uploadProductImage } from 'src/api/smartpos/products';
import { brand } from 'src/theme/smartpos/brand';

export interface ProductImageDropzoneProps {
  imageUrl: string | undefined;
  onImageChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export default function ProductImageDropzone({
  imageUrl, onImageChange, disabled = false,
}: ProductImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadProductImage(file);
      onImageChange(result.url);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }, [onImageChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    multiple: false,
    disabled: disabled || uploading,
  });

  const handleRemove = () => {
    setUploadError(null);
    onImageChange(undefined);
  };

  if (imageUrl) {
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: '12px', overflow: 'hidden' }}>
        <Avatar
          src={imageUrl}
          variant="rounded"
          sx={{ width: 120, height: 120, bgcolor: brand.neutral[100] }}
        />
        <Box
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0.5,
            bgcolor: 'rgba(0,0,0,0.45)',
            opacity: 0, transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 },
          }}
        >
          <Tooltip title="Change image">
            <Box
              {...getRootProps()}
              sx={{
                cursor: 'pointer', width: 36, height: 36,
                borderRadius: '8px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <input {...getInputProps()} />
              {uploading ? <CircularProgress size={14} /> : <IconUpload size={16} color={brand.primary[600]} />}
            </Box>
          </Tooltip>
          <Tooltip title="Remove image">
            <IconButton
              size="small"
              onClick={handleRemove}
              sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#fff', '&:hover': { bgcolor: brand.error.light } }}
            >
              <IconTrash size={16} color={brand.error.main} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          height: 120,
          borderRadius: '12px',
          border: `2px dashed ${isDragActive ? brand.primary[400] : brand.neutral[300]}`,
          bgcolor: isDragActive ? brand.primary[50] : brand.neutral[50],
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          opacity: disabled || uploading ? 0.6 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: brand.primary[400],
            bgcolor: brand.primary[50],
          },
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <CircularProgress size={24} sx={{ color: brand.primary[600] }} />
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>Uploading…</Typography>
          </>
        ) : (
          <>
            <Box sx={{ color: brand.neutral[400], display: 'flex' }}>
              <IconCamera size={28} />
            </Box>
            <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 600, textAlign: 'center', px: 1 }}>
              {isDragActive ? 'Drop image here' : 'Drop image or click to upload'}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[400], textAlign: 'center', px: 1 }}>
              or paste URL below
            </Typography>
          </>
        )}
      </Box>
      {uploadError && (
        <Typography variant="caption" sx={{ color: brand.error.main, mt: 0.5, display: 'block' }}>
          {uploadError}
        </Typography>
      )}
    </Box>
  );
}
