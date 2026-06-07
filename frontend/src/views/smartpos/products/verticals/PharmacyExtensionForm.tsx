import { useState } from 'react';
import {
  FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { VerticalFormProps } from './registry';

interface PharmacyData {
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  prescriptionRequired?: boolean;
  controlledSchedule?: string;
  storageCondition?: string;
  ndaRegistration?: string;
  therapeuticClass?: string;
  activeIngredient?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  atcCode?: string;
}

const DOSAGE_FORMS = [
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAPSULE', label: 'Capsule' },
  { value: 'SYRUP', label: 'Syrup' },
  { value: 'INJECTION', label: 'Injection' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'INHALER', label: 'Inhaler' },
];

const SCHEDULES = [
  { value: 'II', label: 'Schedule II' },
  { value: 'III', label: 'Schedule III' },
  { value: 'IV', label: 'Schedule IV' },
  { value: 'V', label: 'Schedule V' },
];

const STORAGE = [
  { value: 'ROOM_TEMP', label: 'Room Temperature' },
  { value: 'REFRIGERATED', label: 'Refrigerated (2–8°C)' },
  { value: 'FROZEN', label: 'Frozen (-20°C)' },
];

export default function PharmacyExtensionForm({ data, onChange, errors = {} }: VerticalFormProps) {
  const [values, setValues] = useState<PharmacyData>(data as PharmacyData);

  const patch = <K extends keyof PharmacyData>(key: K, value: PharmacyData[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next as Record<string, unknown>);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.primary[700] }}>
        Pharmacy Details
      </Typography>

      {/* Row 1: Rx + Controlled */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={!!values.prescriptionRequired}
              onChange={(e) => patch('prescriptionRequired', e.target.checked)}
            />
          }
          label="Prescription Required (Rx)"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Controlled Schedule"
          size="small"
          fullWidth
          value={values.controlledSchedule ?? ''}
          onChange={(e) => patch('controlledSchedule', e.target.value || undefined)}
        >
          <MenuItem value="">— None —</MenuItem>
          {SCHEDULES.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Row 2: NDA + Generic name */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="NDA / TFDA Registration *"
          size="small"
          fullWidth
          value={values.ndaRegistration ?? ''}
          onChange={(e) => patch('ndaRegistration', e.target.value || undefined)}
          error={!!errors.ndaRegistration}
          helperText={errors.ndaRegistration ?? 'Required for pharmaceutical products'}
        />
        <TextField
          label="Generic Name"
          size="small"
          fullWidth
          value={values.genericName ?? ''}
          onChange={(e) => patch('genericName', e.target.value || undefined)}
          placeholder="e.g. Paracetamol"
        />
      </Stack>

      {/* Row 3: Active ingredient + Strength */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Active Ingredient"
          size="small"
          fullWidth
          value={values.activeIngredient ?? ''}
          onChange={(e) => patch('activeIngredient', e.target.value || undefined)}
        />
        <TextField
          label="Strength / Concentration"
          size="small"
          fullWidth
          value={values.strength ?? ''}
          onChange={(e) => patch('strength', e.target.value || undefined)}
          placeholder="e.g. 500mg, 5ml/100mg"
        />
      </Stack>

      {/* Row 4: Dosage form + Storage + Therapeutic class */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Dosage Form"
          size="small"
          fullWidth
          value={values.dosageForm ?? ''}
          onChange={(e) => patch('dosageForm', e.target.value || undefined)}
        >
          <MenuItem value="">— Select —</MenuItem>
          {DOSAGE_FORMS.map((df) => (
            <MenuItem key={df.value} value={df.value}>{df.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Storage Condition"
          size="small"
          fullWidth
          value={values.storageCondition ?? ''}
          onChange={(e) => patch('storageCondition', e.target.value || undefined)}
        >
          <MenuItem value="">— Select —</MenuItem>
          {STORAGE.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Therapeutic Class"
          size="small"
          fullWidth
          value={values.therapeuticClass ?? ''}
          onChange={(e) => patch('therapeuticClass', e.target.value || undefined)}
        />
      </Stack>

      {/* Row 5: Batch + ATC */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Batch Number"
          size="small"
          fullWidth
          value={values.batchNumber ?? ''}
          onChange={(e) => patch('batchNumber', e.target.value || undefined)}
        />
        <TextField
          label="ATC Code"
          size="small"
          fullWidth
          value={values.atcCode ?? ''}
          onChange={(e) => patch('atcCode', e.target.value || undefined)}
          placeholder="e.g. N02BE01"
          error={!!errors.atcCode}
          helperText={errors.atcCode ?? 'Anatomical Therapeutic Chemical classification'}
        />
      </Stack>

      {/* Row 6: Dates — manufacture + expiry */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="date"
          label="Manufacture Date"
          size="small"
          fullWidth
          value={values.manufactureDate ?? ''}
          onChange={(e) => patch('manufactureDate', e.target.value || undefined)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="Expiry Date"
          size="small"
          fullWidth
          value={values.expiryDate ?? ''}
          onChange={(e) => patch('expiryDate', e.target.value || undefined)}
          InputLabelProps={{ shrink: true }}
          error={!!errors.expiryDate}
          helperText={errors.expiryDate}
        />
      </Stack>
    </Stack>
  );
}
