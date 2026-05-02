/**
 * HRM API — backed by hrm-service:8090.
 * Includes employees, org structure, attendance, leave, payroll.
 */
import { api } from './client';
import type { Page, UUID } from './types';

export type EmployeeStatus  = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
export type LeaveStatus     = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollStatus   = 'DRAFT' | 'APPROVED' | 'PAID';

// ---------- Org structure ----------

export interface Department  { id: UUID; name: string; description?: string | null }
export interface Designation { id: UUID; name: string; departmentId?: UUID | null; description?: string | null }
export interface Shift       { id: UUID; name: string; startTime: string; endTime: string }
export interface Holiday     { id: UUID; name: string; holidayDate: string; description?: string | null }
export interface LeaveType   { id: UUID; name: string; daysPerYear: number; paid: boolean }

const ORG = '/api/v1/hrm';

export const orgApi = {
  // Departments
  listDepartments: async (): Promise<Department[]> =>
    (await api.get<Department[]>(`${ORG}/departments`)).data,
  createDepartment: async (body: { name: string; description?: string }): Promise<Department> =>
    (await api.post<Department>(`${ORG}/departments`, body)).data,
  deleteDepartment: async (id: UUID): Promise<void> => { await api.delete(`${ORG}/departments/${id}`); },

  // Designations
  listDesignations: async (departmentId?: UUID): Promise<Designation[]> =>
    (await api.get<Designation[]>(`${ORG}/designations`, { params: { departmentId } })).data,
  createDesignation: async (body: { name: string; departmentId?: UUID; description?: string }): Promise<Designation> =>
    (await api.post<Designation>(`${ORG}/designations`, body)).data,
  deleteDesignation: async (id: UUID): Promise<void> => { await api.delete(`${ORG}/designations/${id}`); },

  // Shifts
  listShifts: async (): Promise<Shift[]> =>
    (await api.get<Shift[]>(`${ORG}/shifts`)).data,
  createShift: async (body: { name: string; startTime: string; endTime: string }): Promise<Shift> =>
    (await api.post<Shift>(`${ORG}/shifts`, body)).data,
  deleteShift: async (id: UUID): Promise<void> => { await api.delete(`${ORG}/shifts/${id}`); },

  // Holidays
  listHolidays: async (from?: string, to?: string): Promise<Holiday[]> =>
    (await api.get<Holiday[]>(`${ORG}/holidays`, { params: { from, to } })).data,
  createHoliday: async (body: { name: string; holidayDate: string; description?: string }): Promise<Holiday> =>
    (await api.post<Holiday>(`${ORG}/holidays`, body)).data,
  deleteHoliday: async (id: UUID): Promise<void> => { await api.delete(`${ORG}/holidays/${id}`); },

  // Leave types
  listLeaveTypes: async (): Promise<LeaveType[]> =>
    (await api.get<LeaveType[]>(`${ORG}/leave-types`)).data,
  createLeaveType: async (body: { name: string; daysPerYear: number; paid?: boolean }): Promise<LeaveType> =>
    (await api.post<LeaveType>(`${ORG}/leave-types`, body)).data,
};

// ---------- Employees ----------

export interface Employee {
  id: UUID;
  code: string;
  userId?: UUID | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  departmentId?: UUID | null;
  designationId?: UUID | null;
  shiftId?: UUID | null;
  hireDate: string;
  endDate?: string | null;
  baseSalary: number;
  salaryCurrency: string;
  status: EmployeeStatus;
  address?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
}

export interface EmployeeSearchParams {
  search?: string;
  departmentId?: UUID;
  designationId?: UUID;
  status?: EmployeeStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listEmployees(params: EmployeeSearchParams = {}): Promise<Page<Employee>> {
  const { data } = await api.get<Page<Employee>>('/api/v1/employees', { params });
  return data;
}

export interface CreateEmployeeBody {
  code: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userId?: UUID;
  departmentId?: UUID;
  designationId?: UUID;
  shiftId?: UUID;
  hireDate?: string;
  baseSalary?: number;
  salaryCurrency?: string;
  address?: string;
  imageUrl?: string;
  notes?: string;
}

export async function createEmployee(body: CreateEmployeeBody): Promise<Employee> {
  const { data } = await api.post<Employee>('/api/v1/employees', body);
  return data;
}

export async function updateEmployee(id: UUID, body: Partial<CreateEmployeeBody> & { status?: EmployeeStatus; endDate?: string }): Promise<Employee> {
  const { data } = await api.put<Employee>(`/api/v1/employees/${id}`, body);
  return data;
}

export async function deleteEmployee(id: UUID): Promise<void> {
  await api.delete(`/api/v1/employees/${id}`);
}

// ---------- Attendance ----------

export interface Attendance {
  id: UUID;
  employeeId: UUID;
  workDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus;
  hoursWorked?: number | null;
  notes?: string | null;
}

export async function listAttendanceForEmployee(employeeId: UUID, from: string, to: string): Promise<Attendance[]> {
  const { data } = await api.get<Attendance[]>(`/api/v1/attendance/by-employee/${employeeId}`, { params: { from, to } });
  return data;
}

export async function listAttendanceByDate(from: string, to: string): Promise<Attendance[]> {
  const { data } = await api.get<Attendance[]>('/api/v1/attendance', { params: { from, to } });
  return data;
}

export async function checkIn(employeeId: UUID, timestamp?: string): Promise<Attendance> {
  const { data } = await api.post<Attendance>('/api/v1/attendance/check-in', { employeeId, timestamp });
  return data;
}

export async function checkOut(employeeId: UUID, timestamp?: string): Promise<Attendance> {
  const { data } = await api.post<Attendance>('/api/v1/attendance/check-out', { employeeId, timestamp });
  return data;
}

// ---------- Leave ----------

export interface LeaveRequest {
  id: UUID;
  employeeId: UUID;
  leaveTypeId: UUID;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  status: LeaveStatus;
  decidedAt?: string | null;
  decidedBy?: UUID | null;
  decisionNote?: string | null;
}

export async function listLeaveForEmployee(employeeId: UUID, page = 0, size = 20): Promise<Page<LeaveRequest>> {
  const { data } = await api.get<Page<LeaveRequest>>(`/api/v1/leave-requests/by-employee/${employeeId}`, { params: { page, size } });
  return data;
}

export async function createLeaveRequest(body: {
  employeeId: UUID; leaveTypeId: UUID; startDate: string; endDate: string; reason?: string;
}): Promise<LeaveRequest> {
  const { data } = await api.post<LeaveRequest>('/api/v1/leave-requests', body);
  return data;
}

export async function decideLeaveRequest(id: UUID, status: 'APPROVED' | 'REJECTED', note: string): Promise<LeaveRequest> {
  const { data } = await api.post<LeaveRequest>(`/api/v1/leave-requests/${id}/decision`, { status, note });
  return data;
}

export async function cancelLeaveRequest(id: UUID): Promise<LeaveRequest> {
  const { data } = await api.post<LeaveRequest>(`/api/v1/leave-requests/${id}/cancel`);
  return data;
}

// ---------- Payroll ----------

export interface PayrollLine {
  id: UUID;
  employeeId: UUID;
  baseSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  tax: number;
  netPay: number;
  paidAt?: string | null;
  paymentRef?: string | null;
  notes?: string | null;
}

export interface PayrollRun {
  id: UUID;
  ref: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  totalGross: number;
  totalNet: number;
  notes?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  lines: PayrollLine[];
}

export async function listPayrolls(): Promise<PayrollRun[]> {
  const { data } = await api.get<PayrollRun[]>('/api/v1/payroll');
  return data;
}

export async function getPayroll(id: UUID): Promise<PayrollRun> {
  const { data } = await api.get<PayrollRun>(`/api/v1/payroll/${id}`);
  return data;
}

export interface CreatePayrollBody {
  ref: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
  lines?: { employeeId: UUID; baseSalary?: number; allowances?: number; deductions?: number; overtime?: number; tax?: number }[];
}

export async function createPayroll(body: CreatePayrollBody): Promise<PayrollRun> {
  const { data } = await api.post<PayrollRun>('/api/v1/payroll', body);
  return data;
}

export async function approvePayroll(id: UUID): Promise<PayrollRun> {
  const { data } = await api.post<PayrollRun>(`/api/v1/payroll/${id}/approve`);
  return data;
}

export async function payPayroll(id: UUID): Promise<PayrollRun> {
  const { data } = await api.post<PayrollRun>(`/api/v1/payroll/${id}/pay`);
  return data;
}
