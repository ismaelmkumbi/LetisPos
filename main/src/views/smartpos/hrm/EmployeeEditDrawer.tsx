import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, InputAdornment, MenuItem, Stack, TextField,
} from '@mui/material';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import {
  createEmployee, updateEmployee, orgApi,
  type CreateEmployeeBody, type Department, type Designation, type Employee, type EmployeeStatus, type Shift,
} from 'src/api/smartpos/hrm';
import type { UUID } from 'src/api/smartpos/types';
import { DEFAULT_CURRENCY } from 'src/utils/smartpos/currency';

const empty: CreateEmployeeBody = {
  code: '', firstName: '', lastName: '', baseSalary: 0, salaryCurrency: DEFAULT_CURRENCY,
};

export interface EmployeeEditDrawerProps {
  open: boolean;
  initial?: Employee | null;
  onClose: () => void;
  onSaved: (e: Employee) => void;
}

export default function EmployeeEditDrawer({ open, initial, onClose, onSaved }: EmployeeEditDrawerProps) {
  const [body, setBody] = useState<CreateEmployeeBody & { status?: EmployeeStatus }>(empty);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      orgApi.listDepartments(),
      orgApi.listDesignations(),
      orgApi.listShifts(),
    ]).then(([d, g, s]) => { setDepartments(d); setDesignations(g); setShifts(s); }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (initial) {
      setBody({
        code: initial.code,
        firstName: initial.firstName, lastName: initial.lastName ?? '',
        email: initial.email ?? undefined, phone: initial.phone ?? undefined,
        userId: initial.userId ?? undefined,
        departmentId: initial.departmentId ?? undefined,
        designationId: initial.designationId ?? undefined,
        shiftId: initial.shiftId ?? undefined,
        hireDate: initial.hireDate, baseSalary: initial.baseSalary,
        salaryCurrency: initial.salaryCurrency,
        address: initial.address ?? undefined, imageUrl: initial.imageUrl ?? undefined,
        notes: initial.notes ?? undefined,
        status: initial.status,
      });
    } else {
      setBody(empty);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof typeof body>(k: K, v: (typeof body)[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const handleSubmit = async () => {
    if (!body.code.trim() || !body.firstName.trim()) {
      setError('Code and first name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateEmployee(initial.id, body)
        : await createEmployee(body);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Edit employee' : 'New employee'}
      subtitle={initial ? `${initial.code} — ${initial.firstName} ${initial.lastName ?? ''}` : 'Add a person'}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField label="Code" value={body.code} required size="small" sx={{ width: 140 }}
          onChange={(e) => patch('code', e.target.value)} />
        <TextField label="First name" value={body.firstName} required size="small" fullWidth
          onChange={(e) => patch('firstName', e.target.value)} />
        <TextField label="Last name" value={body.lastName ?? ''} size="small" fullWidth
          onChange={(e) => patch('lastName', e.target.value)} />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField label="Email" type="email" value={body.email ?? ''} size="small" fullWidth
          onChange={(e) => patch('email', e.target.value)} />
        <TextField label="Phone" value={body.phone ?? ''} size="small" fullWidth
          onChange={(e) => patch('phone', e.target.value)} />
      </Stack>

      <Stack direction="row" spacing={2}>
        <Autocomplete
          fullWidth size="small"
          options={departments}
          value={departments.find((d) => d.id === body.departmentId) ?? null}
          getOptionLabel={(d) => d.name}
          onChange={(_, v) => patch('departmentId', v?.id as UUID | undefined)}
          renderInput={(params) => <TextField {...params} label="Department" size="small" />}
        />
        <Autocomplete
          fullWidth size="small"
          options={designations}
          value={designations.find((d) => d.id === body.designationId) ?? null}
          getOptionLabel={(d) => d.name}
          onChange={(_, v) => patch('designationId', v?.id as UUID | undefined)}
          renderInput={(params) => <TextField {...params} label="Designation" size="small" />}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <Autocomplete
          fullWidth size="small"
          options={shifts}
          value={shifts.find((s) => s.id === body.shiftId) ?? null}
          getOptionLabel={(s) => `${s.name} (${s.startTime}–${s.endTime})`}
          onChange={(_, v) => patch('shiftId', v?.id as UUID | undefined)}
          renderInput={(params) => <TextField {...params} label="Shift" size="small" />}
        />
        <TextField
          label="Hire date" type="date" value={body.hireDate ?? ''} size="small" sx={{ minWidth: 160 }}
          onChange={(e) => patch('hireDate', e.target.value)} InputLabelProps={{ shrink: true }}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField label="Base salary" type="number" value={body.baseSalary ?? 0} size="small" fullWidth
          onChange={(e) => patch('baseSalary', Number(e.target.value))}
          InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }} />
        <TextField label="Currency" value={body.salaryCurrency ?? DEFAULT_CURRENCY} size="small" sx={{ width: 100 }}
          onChange={(e) => patch('salaryCurrency', e.target.value)} />
        {initial && (
          <TextField select label="Status" value={body.status ?? initial.status} size="small" sx={{ minWidth: 160 }}
            onChange={(e) => patch('status', e.target.value as EmployeeStatus)}>
            {(['ACTIVE','ON_LEAVE','TERMINATED'] as EmployeeStatus[]).map((s) =>
              <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      <TextField label="Address" value={body.address ?? ''} size="small" fullWidth multiline minRows={2}
        onChange={(e) => patch('address', e.target.value)} />
      <TextField label="Notes" value={body.notes ?? ''} size="small" fullWidth multiline minRows={2}
        onChange={(e) => patch('notes', e.target.value)} />
    </EditDrawer>
  );
}
