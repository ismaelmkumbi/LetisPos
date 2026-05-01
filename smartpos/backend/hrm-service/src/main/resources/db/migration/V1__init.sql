-- HRM Service — initial schema
-- Owns: org structure (departments, designations, shifts, holidays),
-- employee master, attendance, leave, payroll runs.
--
-- Cross-service refs (user_id from auth, account_id from payment) are stored
-- as bare UUIDs — no FKs across DBs.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- Org structure
-- ==================================================================
CREATE TABLE departments (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_departments_tenant_name ON departments (tenant_id, lower(name));

CREATE TABLE designations (
    id              UUID         PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    department_id   UUID         REFERENCES departments(id) ON DELETE SET NULL,
    description     TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_designations_tenant_name ON designations (tenant_id, lower(name));

CREATE TABLE office_shifts (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    start_time  TIME         NOT NULL,
    end_time    TIME         NOT NULL,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_shifts_tenant_name ON office_shifts (tenant_id, lower(name));

CREATE TABLE holidays (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    holiday_date DATE        NOT NULL,
    description TEXT,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_holidays_tenant_date ON holidays (tenant_id, holiday_date);

-- ==================================================================
-- Employees
-- ==================================================================
CREATE TABLE employees (
    id              UUID          PRIMARY KEY,
    code            VARCHAR(50)   NOT NULL,                     -- HR-readable id (EMP-0001)
    user_id         UUID,                                       -- link to auth.users
    first_name      VARCHAR(120)  NOT NULL,
    last_name       VARCHAR(120),
    email           CITEXT,
    phone           VARCHAR(32),
    department_id   UUID          REFERENCES departments(id)   ON DELETE SET NULL,
    designation_id  UUID          REFERENCES designations(id)  ON DELETE SET NULL,
    shift_id        UUID          REFERENCES office_shifts(id) ON DELETE SET NULL,
    hire_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    base_salary     NUMERIC(19,2) NOT NULL DEFAULT 0,
    salary_currency CHAR(3)       NOT NULL DEFAULT 'TZS',
    status          VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE | ON_LEAVE | TERMINATED
    address         TEXT,
    image_url       TEXT,
    notes           TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT employees_status_chk CHECK (status IN ('ACTIVE','ON_LEAVE','TERMINATED'))
);
CREATE UNIQUE INDEX idx_employees_tenant_code ON employees (tenant_id, lower(code)) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_department  ON employees (department_id);
CREATE INDEX idx_employees_designation ON employees (designation_id);
CREATE INDEX idx_employees_status      ON employees (status) WHERE deleted_at IS NULL;

-- ==================================================================
-- Attendance — one row per (employee, date) with check-in/out times
-- ==================================================================
CREATE TABLE attendance (
    id            UUID         PRIMARY KEY,
    employee_id   UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date     DATE         NOT NULL,
    check_in      TIMESTAMPTZ,
    check_out     TIMESTAMPTZ,
    status        VARCHAR(16)  NOT NULL DEFAULT 'PRESENT',     -- PRESENT | ABSENT | LATE | HALF_DAY | LEAVE | HOLIDAY
    hours_worked  NUMERIC(6,2),
    notes         TEXT,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT attendance_status_chk CHECK (status IN ('PRESENT','ABSENT','LATE','HALF_DAY','LEAVE','HOLIDAY'))
);
CREATE UNIQUE INDEX idx_attendance_emp_date ON attendance (employee_id, work_date);
CREATE INDEX idx_attendance_date ON attendance (work_date DESC);

-- ==================================================================
-- Leave management
-- ==================================================================
CREATE TABLE leave_types (
    id              UUID         PRIMARY KEY,
    name            VARCHAR(80)  NOT NULL,                     -- ANNUAL | SICK | UNPAID | MATERNITY | …
    days_per_year   INT          NOT NULL DEFAULT 0,
    is_paid         BOOLEAN      NOT NULL DEFAULT TRUE,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_leave_types_tenant_name ON leave_types (tenant_id, lower(name));

CREATE TABLE leave_requests (
    id            UUID         PRIMARY KEY,
    employee_id   UUID         NOT NULL REFERENCES employees(id)   ON DELETE CASCADE,
    leave_type_id UUID         NOT NULL REFERENCES leave_types(id),
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL,
    days          NUMERIC(5,2) NOT NULL,
    reason        TEXT,
    status        VARCHAR(16)  NOT NULL DEFAULT 'PENDING',     -- PENDING | APPROVED | REJECTED | CANCELLED
    decided_at    TIMESTAMPTZ,
    decided_by    UUID,
    decision_note TEXT,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT leave_status_chk CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    CONSTRAINT leave_dates_chk  CHECK (end_date >= start_date)
);
CREATE INDEX idx_leave_emp_status ON leave_requests (employee_id, status);
CREATE INDEX idx_leave_window     ON leave_requests (start_date, end_date);

-- ==================================================================
-- Payroll — header + per-component lines
-- ==================================================================
CREATE TABLE payroll_runs (
    id            UUID         PRIMARY KEY,
    ref           VARCHAR(50)  NOT NULL,
    period_start  DATE         NOT NULL,
    period_end    DATE         NOT NULL,
    status        VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',       -- DRAFT | APPROVED | PAID
    total_gross   NUMERIC(19,2) NOT NULL DEFAULT 0,
    total_net     NUMERIC(19,2) NOT NULL DEFAULT 0,
    notes         TEXT,
    tenant_id     UUID,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    approved_at   TIMESTAMPTZ,
    paid_at       TIMESTAMPTZ,
    CONSTRAINT payroll_status_chk CHECK (status IN ('DRAFT','APPROVED','PAID')),
    CONSTRAINT payroll_period_chk CHECK (period_end >= period_start)
);
CREATE UNIQUE INDEX idx_payroll_tenant_ref ON payroll_runs (tenant_id, ref);

CREATE TABLE payroll_lines (
    id              UUID         PRIMARY KEY,
    payroll_run_id  UUID         NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id     UUID         NOT NULL REFERENCES employees(id),
    base_salary     NUMERIC(19,2) NOT NULL DEFAULT 0,
    allowances      NUMERIC(19,2) NOT NULL DEFAULT 0,
    deductions      NUMERIC(19,2) NOT NULL DEFAULT 0,
    overtime        NUMERIC(19,2) NOT NULL DEFAULT 0,
    tax             NUMERIC(19,2) NOT NULL DEFAULT 0,
    net_pay         NUMERIC(19,2) NOT NULL DEFAULT 0,
    paid_at         TIMESTAMPTZ,
    payment_ref     VARCHAR(80),
    notes           TEXT,
    UNIQUE (payroll_run_id, employee_id)
);
CREATE INDEX idx_payroll_lines_run ON payroll_lines (payroll_run_id);
CREATE INDEX idx_payroll_lines_emp ON payroll_lines (employee_id);

-- ==================================================================
-- Seed common leave types (global defaults)
-- ==================================================================
INSERT INTO leave_types (id, name, days_per_year, is_paid) VALUES
  (uuid_generate_v4(), 'Annual',    21, TRUE),
  (uuid_generate_v4(), 'Sick',      14, TRUE),
  (uuid_generate_v4(), 'Maternity', 90, TRUE),
  (uuid_generate_v4(), 'Paternity', 7,  TRUE),
  (uuid_generate_v4(), 'Unpaid',    0,  FALSE);
