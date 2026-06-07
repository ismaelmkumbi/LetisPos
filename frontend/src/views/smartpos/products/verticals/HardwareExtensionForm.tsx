import { useState } from 'react';
import {
  Stack, TextField, Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { VerticalFormProps } from './registry';

interface HardwareData {
  partNumber?: string;
  oemBrand?: string;
  warrantyMonths?: number;
  guaranteeMonths?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightGrams?: number;
  material?: string;
  countryOfOrigin?: string;
  powerWatts?: number;
  voltage?: string;
  specifications?: Record<string, string>;
}

export default function HardwareExtensionForm({ data, onChange, errors = {} }: VerticalFormProps) {
  const [values, setValues] = useState<HardwareData>(data as HardwareData);

  const patch = <K extends keyof HardwareData>(key: K, value: HardwareData[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next as Record<string, unknown>);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.info.dark }}>
        Hardware Details
      </Typography>

      {/* Row 1: Part number + OEM */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Part Number / SKU"
          size="small"
          fullWidth
          value={values.partNumber ?? ''}
          onChange={(e) => patch('partNumber', e.target.value || undefined)}
        />
        <TextField
          label="OEM Brand"
          size="small"
          fullWidth
          value={values.oemBrand ?? ''}
          onChange={(e) => patch('oemBrand', e.target.value || undefined)}
        />
      </Stack>

      {/* Row 2: Warranty + Guarantee */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label="Warranty (months)"
          size="small"
          fullWidth
          value={values.warrantyMonths ?? ''}
          onChange={(e) => patch('warrantyMonths', e.target.value ? Number(e.target.value) : undefined)}
        />
        <TextField
          type="number"
          label="Guarantee (months)"
          size="small"
          fullWidth
          value={values.guaranteeMonths ?? ''}
          onChange={(e) => patch('guaranteeMonths', e.target.value ? Number(e.target.value) : undefined)}
        />
      </Stack>

      {/* Dimensions section */}
      <Typography variant="caption" sx={{
        fontWeight: 700, color: brand.neutral[500],
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Dimensions
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          type="number"
          label="Length"
          size="small"
          fullWidth
          value={values.lengthCm ?? ''}
          onChange={(e) => patch('lengthCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
        <TextField
          type="number"
          label="Width"
          size="small"
          fullWidth
          value={values.widthCm ?? ''}
          onChange={(e) => patch('widthCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
        <TextField
          type="number"
          label="Height"
          size="small"
          fullWidth
          value={values.heightCm ?? ''}
          onChange={(e) => patch('heightCm', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="cm"
        />
      </Stack>

      {/* Weight */}
      <TextField
        type="number"
        label="Weight (grams)"
        size="small"
        fullWidth
        value={values.weightGrams ?? ''}
        onChange={(e) => patch('weightGrams', e.target.value ? Number(e.target.value) : undefined)}
        placeholder="grams"
      />

      {/* Row 4: Material + Country */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Material"
          size="small"
          fullWidth
          value={values.material ?? ''}
          onChange={(e) => patch('material', e.target.value || undefined)}
          placeholder="e.g. Stainless steel, ABS plastic"
        />
        <TextField
          label="Country of Origin"
          size="small"
          fullWidth
          value={values.countryOfOrigin ?? ''}
          onChange={(e) => patch('countryOfOrigin', e.target.value || undefined)}
          placeholder="e.g. China, Japan, Germany"
        />
      </Stack>

      {/* Row 5: Power + Voltage */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label="Power (Watts)"
          size="small"
          fullWidth
          value={values.powerWatts ?? ''}
          onChange={(e) => patch('powerWatts', e.target.value ? Number(e.target.value) : undefined)}
        />
        <TextField
          label="Voltage"
          size="small"
          fullWidth
          value={values.voltage ?? ''}
          onChange={(e) => patch('voltage', e.target.value || undefined)}
          placeholder="e.g. 220V, 110-240V"
          error={!!errors.voltage}
          helperText={errors.voltage}
        />
      </Stack>
    </Stack>
  );
}
