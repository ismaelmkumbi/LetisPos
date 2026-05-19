# Dynamic Feature & Menu Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static plan-based feature gating with a fully dynamic, database-driven enterprise system with drag-and-drop visual plan comparison admin UI.

**Architecture:** Four new tables in user-service (feature_definitions, feature_assignments, menu_definitions, path_feature_mappings). Feature resolution runs at login — plan base + tenant overrides + user overrides → `features[]` JWT claim. Gateway reads JWT features dynamically. Frontend menu rendered from API, filtered server-side by user's features. Admin UI: 3-tab workspace with 4-column drag-and-drop plan comparison.

**Tech Stack:** Java 17 / Spring Boot 3 / JPA (Hibernate) / Flyway / PostgreSQL / React 18 / TypeScript / Tabler Icons / dnd-kit (drag-and-drop) / Redis (caching)

---

### Task 1: Database Migration — New Tables

**Files:**
- Create: `backend/user-service/src/main/resources/db/migration/V11__feature_management.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Feature catalog
CREATE TABLE feature_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_feature_defs_category ON feature_definitions(category);
CREATE INDEX idx_feature_defs_active ON feature_definitions(is_active);

-- Feature assignments (plan / tenant / user)
CREATE TABLE feature_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(100) NOT NULL REFERENCES feature_definitions(key) ON DELETE CASCADE,
    assignment_level VARCHAR(10) NOT NULL CHECK (assignment_level IN ('PLAN', 'TENANT', 'USER')),
    target_id VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (feature_key, assignment_level, target_id)
);

CREATE INDEX idx_feature_assign_target ON feature_assignments(assignment_level, target_id);
CREATE INDEX idx_feature_assign_key ON feature_assignments(feature_key);

-- Menu tree
CREATE TABLE menu_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES menu_definitions(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    route VARCHAR(255),
    required_feature_key VARCHAR(100) REFERENCES feature_definitions(key) ON DELETE SET NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_section_header BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_menu_parent ON menu_definitions(parent_id);
CREATE INDEX idx_menu_sort ON menu_definitions(parent_id, sort_order);

-- Path-to-feature mapping for gateway
CREATE TABLE path_feature_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_pattern VARCHAR(255) NOT NULL UNIQUE,
    required_feature_key VARCHAR(100) NOT NULL REFERENCES feature_definitions(key) ON DELETE CASCADE,
    http_status_on_deny INT NOT NULL DEFAULT 402,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_path_mapping_pattern ON path_feature_mappings(path_pattern);
```

- [ ] **Step 2: Run migration to verify**

```bash
cd backend/user-service && mvn flyway:migrate -Dflyway.url=jdbc:postgresql://localhost:5432/smartpos -Dflyway.user=smartpos -Dflyway.password=<password>
```

Expected: Migration V11 runs successfully, 4 new tables created.

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/src/main/resources/db/migration/V11__feature_management.sql
git commit -m "feat: add feature management tables (feature_definitions, feature_assignments, menu_definitions, path_feature_mappings)"
```

---

### Task 2: Seed Migration — Plan Features from Hardcoded Config

**Files:**
- Create: `backend/user-service/src/main/resources/db/migration/V12__seed_features_and_menu.sql`

- [ ] **Step 1: Write the seed migration**

```sql
-- Seed feature definitions from existing permissions
INSERT INTO feature_definitions (key, label, category, sort_order) VALUES
-- Sales
('pos.use', 'POS Terminal Access', 'SALES', 1),
('sale.view', 'View Sales', 'SALES', 2),
('sale.create', 'Create Sales', 'SALES', 3),
('sale.return', 'Sales Returns', 'SALES', 4),
-- Products
('product.view', 'View Products', 'PRODUCTS', 5),
('product.create', 'Create Products', 'PRODUCTS', 6),
('product.update', 'Update Products', 'PRODUCTS', 7),
('product.delete', 'Delete Products', 'PRODUCTS', 8),
('category.manage', 'Manage Categories', 'PRODUCTS', 9),
-- Stock
('stock.view', 'View Stock', 'STOCK', 10),
('stock.transfer', 'Stock Transfers', 'STOCK', 11),
('stock.adjust', 'Stock Adjustments', 'STOCK', 12),
('stock.count', 'Stock Counts', 'STOCK', 13),
-- Purchasing
('purchase.view', 'View Purchases', 'PURCHASING', 14),
('purchase.create', 'Create Purchases', 'PURCHASING', 15),
('purchase.update', 'Update Purchases', 'PURCHASING', 16),
('purchase.delete', 'Delete Purchases', 'PURCHASING', 17),
('purchase.return', 'Purchase Returns', 'PURCHASING', 18),
-- Finance
('payment.view', 'View Payments', 'FINANCE', 19),
('payment.record', 'Record Payments', 'FINANCE', 20),
('payment.refund', 'Refund Payments', 'FINANCE', 21),
('account.manage', 'Manage Accounts', 'FINANCE', 22),
('expense.manage', 'Manage Expenses', 'FINANCE', 23),
-- Accounting
('accounting.module', 'Accounting Module', 'FINANCE', 24),
('account.view', 'View Accounts', 'FINANCE', 25),
('journal.view', 'View Journal', 'FINANCE', 26),
('journal.create', 'Create Journal Entry', 'FINANCE', 27),
('journal.post', 'Post Journal Entry', 'FINANCE', 28),
('report.financial.view', 'View Financial Reports', 'FINANCE', 29),
-- HRM
('hrm.module', 'HR & Payroll Module', 'HRM', 30),
('hrm.view', 'View HR', 'HRM', 31),
('hrm.manage', 'Manage HR', 'HRM', 32),
('hrm.attendance.write', 'Write Attendance', 'HRM', 33),
('hrm.leave.request', 'Request Leave', 'HRM', 34),
('hrm.leave.approve', 'Approve Leave', 'HRM', 35),
('hrm.payroll.view', 'View Payroll', 'HRM', 36),
('hrm.payroll.manage', 'Manage Payroll', 'HRM', 37),
-- CRM
('crm.module', 'CRM Module', 'CRM', 38),
-- Marketing
('marketing.module', 'Marketing Module', 'MARKETING', 39),
-- AI
('ai.module', 'AI & Insights Module', 'AI', 40),
('ai.insight', 'AI Insights', 'AI', 41),
('ai.chat', 'AI Chat', 'AI', 42),
-- Admin
('admin', 'Admin Access', 'ADMIN', 43),
('user.view', 'View Users', 'ADMIN', 44),
('user.create', 'Create Users', 'ADMIN', 45),
('user.update', 'Update Users', 'ADMIN', 46),
('user.delete', 'Delete Users', 'ADMIN', 47),
('role.view', 'View Roles', 'ADMIN', 48),
('role.manage', 'Manage Roles', 'ADMIN', 49),
('branch.view', 'View Branches', 'ADMIN', 50),
('branch.manage', 'Manage Branches', 'ADMIN', 51),
('billing.view', 'View Billing', 'ADMIN', 52),
('billing.manage', 'Manage Billing', 'ADMIN', 53),
('tenant.suspend', 'Suspend Tenants', 'ADMIN', 54),
('audit.view', 'View Audit Logs', 'ADMIN', 55),
('session.manage', 'Manage Sessions', 'ADMIN', 56),
-- Integration
('integration.module', 'Integration Module', 'INTEGRATIONS', 57),
('integration.view', 'View Integrations', 'INTEGRATIONS', 58),
('integration.zatca', 'ZATCA Integration', 'INTEGRATIONS', 59),
('integration.woo', 'WooCommerce Integration', 'INTEGRATIONS', 60),
-- Reports
('report.sales', 'Sales Reports', 'REPORTS', 61),
('report.inventory', 'Inventory Reports', 'REPORTS', 62),
('report.financial', 'Financial Reports', 'REPORTS', 63),
('report.export', 'Export Reports', 'REPORTS', 64),
('report.custom', 'Custom Reports', 'REPORTS', 65),
-- Notifications
('notification.view', 'View Notifications', 'NOTIFICATIONS', 66),
('notification.send', 'Send Notifications', 'NOTIFICATIONS', 67);

-- Seed plan-level feature assignments (matching current hardcoded FeatureGateFilter)
-- STARTER: sales, products, stock, customers, basic reports, pos
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('pos.use', 'PLAN', 'STARTER', true),
('sale.view', 'PLAN', 'STARTER', true),
('sale.create', 'PLAN', 'STARTER', true),
('sale.return', 'PLAN', 'STARTER', true),
('product.view', 'PLAN', 'STARTER', true),
('product.create', 'PLAN', 'STARTER', true),
('product.update', 'PLAN', 'STARTER', true),
('product.delete', 'PLAN', 'STARTER', true),
('category.manage', 'PLAN', 'STARTER', true),
('stock.view', 'PLAN', 'STARTER', true),
('stock.transfer', 'PLAN', 'STARTER', true),
('stock.adjust', 'PLAN', 'STARTER', true),
('stock.count', 'PLAN', 'STARTER', true),
('payment.view', 'PLAN', 'STARTER', true),
('payment.record', 'PLAN', 'STARTER', true),
('report.sales', 'PLAN', 'STARTER', true),
('report.inventory', 'PLAN', 'STARTER', true),
('user.view', 'PLAN', 'STARTER', true),
('notification.view', 'PLAN', 'STARTER', true);

-- BUSINESS: everything from STARTER + purchasing, finance, marketing, accounting
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('purchase.view', 'PLAN', 'BUSINESS', true),
('purchase.create', 'PLAN', 'BUSINESS', true),
('purchase.update', 'PLAN', 'BUSINESS', true),
('purchase.delete', 'PLAN', 'BUSINESS', true),
('purchase.return', 'PLAN', 'BUSINESS', true),
('payment.refund', 'PLAN', 'BUSINESS', true),
('account.manage', 'PLAN', 'BUSINESS', true),
('expense.manage', 'PLAN', 'BUSINESS', true),
('accounting.module', 'PLAN', 'BUSINESS', true),
('account.view', 'PLAN', 'BUSINESS', true),
('journal.view', 'PLAN', 'BUSINESS', true),
('journal.create', 'PLAN', 'BUSINESS', true),
('journal.post', 'PLAN', 'BUSINESS', true),
('report.financial.view', 'PLAN', 'BUSINESS', true),
('marketing.module', 'PLAN', 'BUSINESS', true),
('report.financial', 'PLAN', 'BUSINESS', true),
('report.export', 'PLAN', 'BUSINESS', true);

-- PROFESSIONAL: everything from BUSINESS + HRM, CRM, AI, integrations, advanced admin
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('hrm.module', 'PLAN', 'PROFESSIONAL', true),
('hrm.view', 'PLAN', 'PROFESSIONAL', true),
('hrm.manage', 'PLAN', 'PROFESSIONAL', true),
('hrm.attendance.write', 'PLAN', 'PROFESSIONAL', true),
('hrm.leave.request', 'PLAN', 'PROFESSIONAL', true),
('hrm.leave.approve', 'PLAN', 'PROFESSIONAL', true),
('hrm.payroll.view', 'PLAN', 'PROFESSIONAL', true),
('hrm.payroll.manage', 'PLAN', 'PROFESSIONAL', true),
('crm.module', 'PLAN', 'PROFESSIONAL', true),
('ai.module', 'PLAN', 'PROFESSIONAL', true),
('ai.insight', 'PLAN', 'PROFESSIONAL', true),
('ai.chat', 'PLAN', 'PROFESSIONAL', true),
('integration.module', 'PLAN', 'PROFESSIONAL', true),
('integration.view', 'PLAN', 'PROFESSIONAL', true),
('integration.zatca', 'PLAN', 'PROFESSIONAL', true),
('integration.woo', 'PLAN', 'PROFESSIONAL', true),
('branch.view', 'PLAN', 'PROFESSIONAL', true),
('branch.manage', 'PLAN', 'PROFESSIONAL', true),
('audit.view', 'PLAN', 'PROFESSIONAL', true),
('session.manage', 'PLAN', 'PROFESSIONAL', true),
('notification.send', 'PLAN', 'PROFESSIONAL', true);

-- ENTERPRISE: everything + custom reports, admin, API keys, full tenant management
INSERT INTO feature_assignments (feature_key, assignment_level, target_id, granted) VALUES
('admin', 'PLAN', 'ENTERPRISE', true),
('user.create', 'PLAN', 'ENTERPRISE', true),
('user.update', 'PLAN', 'ENTERPRISE', true),
('user.delete', 'PLAN', 'ENTERPRISE', true),
('role.view', 'PLAN', 'ENTERPRISE', true),
('role.manage', 'PLAN', 'ENTERPRISE', true),
('billing.view', 'PLAN', 'ENTERPRISE', true),
('billing.manage', 'PLAN', 'ENTERPRISE', true),
('tenant.suspend', 'PLAN', 'ENTERPRISE', true),
('report.custom', 'PLAN', 'ENTERPRISE', true);

-- Seed menu tree (matching current SmartPosMenuItems.ts structure)
INSERT INTO menu_definitions (id, parent_id, key, label, icon, route, required_feature_key, sort_order, is_section_header) VALUES
-- Sections (is_section_header = true)
('00000000-0000-0000-0000-000000000101', null, 'section-dashboard', 'Home', null, null, null, 1, true),
('00000000-0000-0000-0000-000000000102', null, 'section-sales', 'Sales Desk', null, null, null, 2, true),
('00000000-0000-0000-0000-000000000103', null, 'section-products', 'Products', null, null, null, 3, true),
('00000000-0000-0000-0000-000000000104', null, 'section-stock', 'Stock Management', null, null, null, 4, true),
('00000000-0000-0000-0000-000000000105', null, 'section-purchasing', 'Purchasing', null, null, null, 5, true),
('00000000-0000-0000-0000-000000000106', null, 'section-customers', 'Customers & Suppliers', null, null, null, 6, true),
('00000000-0000-0000-0000-000000000107', null, 'section-finance', 'Finance', null, null, null, 7, true),
('00000000-0000-0000-0000-000000000108', null, 'section-reports', 'Reports', null, null, null, 8, true),
('00000000-0000-0000-0000-000000000109', null, 'section-marketing', 'Marketing', null, null, null, 9, true),
('00000000-0000-0000-0000-000000000110', null, 'section-hrm', 'HR & Payroll', null, null, null, 10, true),
('00000000-0000-0000-0000-000000000111', null, 'section-crm', 'CRM', null, null, null, 11, true),
('00000000-0000-0000-0000-000000000112', null, 'section-ecommerce', 'E-Commerce', null, null, null, 12, true),
('00000000-0000-0000-0000-000000000113', null, 'section-ai', 'AI & Insights', null, null, null, 13, true),
('00000000-0000-0000-0000-000000000114', null, 'section-admin', 'Settings & Admin', null, null, null, 14, true),
('00000000-0000-0000-0000-000000000115', null, 'section-support', 'Support', null, null, null, 15, true);

-- Top-level items (no children shown — full menu structure to be seeded with recursive inserts)
INSERT INTO menu_definitions (id, parent_id, key, label, icon, route, required_feature_key, sort_order) VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'menu-dashboard', 'Dashboard', 'layout-dashboard', '/dashboard', null, 1),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'menu-pos', 'Point of Sale', 'cash-register', '/pos', 'pos.use', 1),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000102', 'menu-sales', 'Sales', 'shopping-cart', '/sales', 'sale.view', 2),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000103', 'menu-products', 'Products', 'package', '/products', 'product.view', 1),
('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000103', 'menu-categories', 'Categories', 'category', '/products/categories', 'category.manage', 2),
('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000104', 'menu-stock', 'Stock', 'boxes', '/stock', 'stock.view', 1),
('00000000-0000-0000-0000-000000000207', '00000000-0000-0000-0000-000000000105', 'menu-purchases', 'Purchases', 'truck', '/purchases', 'purchase.view', 1),
('00000000-0000-0000-0000-000000000208', '00000000-0000-0000-0000-000000000106', 'menu-customers', 'Customers', 'users', '/customers', null, 1),
('00000000-0000-0000-0000-000000000209', '00000000-0000-0000-0000-000000000106', 'menu-suppliers', 'Suppliers', 'truck-delivery', '/suppliers', null, 2),
('00000000-0000-0000-0000-000000000210', '00000000-0000-0000-0000-000000000107', 'menu-payments', 'Payments', 'cash', '/payments', 'payment.view', 1),
('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000107', 'menu-accounting', 'Accounting', 'calculator', '/accounting', 'accounting.module', 2),
('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000108', 'menu-reports', 'Reports', 'chart-bar', '/reports', 'report.sales', 1),
('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000109', 'menu-marketing', 'Marketing', 'megaphone', '/marketing', 'marketing.module', 1),
('00000000-0000-0000-0000-000000000214', '00000000-0000-0000-0000-000000000110', 'menu-hrm', 'HR & Payroll', 'users-group', '/hrm', 'hrm.module', 1),
('00000000-0000-0000-0000-000000000215', '00000000-0000-0000-0000-000000000111', 'menu-crm', 'CRM', 'address-book', '/crm', 'crm.module', 1),
('00000000-0000-0000-0000-000000000216', '00000000-0000-0000-0000-000000000112', 'menu-ecommerce', 'E-Commerce', 'world', '/commerce', 'integration.woo', 1),
('00000000-0000-0000-0000-000000000217', '00000000-0000-0000-0000-000000000113', 'menu-ai', 'AI Insights', 'brain', '/ai', 'ai.module', 1),
('00000000-0000-0000-0000-000000000218', '00000000-0000-0000-0000-000000000114', 'menu-settings', 'Settings', 'settings', '/settings', null, 1),
('00000000-0000-0000-0000-000000000219', '00000000-0000-0000-0000-000000000115', 'menu-support', 'Support', 'help-circle', '/support', null, 1);

-- Seed path_feature_mappings (matching current FeatureGateFilter.java)
INSERT INTO path_feature_mappings (path_pattern, required_feature_key, sort_order) VALUES
('/api/v1/accounting/**', 'accounting.module', 1),
('/api/v1/purchases/**', 'purchase.view', 2),
('/api/v1/hrm/**', 'hrm.module', 3),
('/api/v1/crm/**', 'crm.module', 4),
('/api/v1/ai/**', 'ai.module', 5),
('/api/v1/integrations/**', 'integration.module', 6),
('/api/v1/marketing/**', 'marketing.module', 7),
('/api/v1/admin/audit/**', 'audit.view', 8),
('/api/v1/admin/sessions/**', 'session.manage', 9),
('/api/v1/admin/api-keys/**', 'integration.module', 10),
('/api/v1/reports/custom/**', 'report.custom', 11);
```

- [ ] **Step 2: Run migration to verify**

```bash
cd backend/user-service && mvn flyway:migrate
```

Expected: V12 runs, seed data inserted. Run `SELECT count(*) FROM feature_definitions;` → 67 rows.

- [ ] **Step 3: Commit**

```bash
git add backend/user-service/src/main/resources/db/migration/V12__seed_features_and_menu.sql
git commit -m "feat: seed feature definitions, plan assignments, menu tree, and path mappings from current config"
```

---

### Task 3: Domain Entities — user-service

**Files:**
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureDefinition.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureAssignment.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/MenuDefinition.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/PathFeatureMapping.java`

- [ ] **Step 1: Write FeatureDefinition entity**

```java
package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feature_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String key;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
```

- [ ] **Step 2: Write FeatureAssignment entity**

```java
package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feature_assignments",
    uniqueConstraints = @UniqueConstraint(columnNames = {"feature_key", "assignment_level", "target_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "feature_key", nullable = false, length = 100)
    private String featureKey;

    @Column(name = "assignment_level", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private AssignmentLevel assignmentLevel;

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(nullable = false)
    @Builder.Default
    private boolean granted = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum AssignmentLevel {
        PLAN, TENANT, USER
    }
}
```

- [ ] **Step 3: Write MenuDefinition entity**

```java
package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "menu_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private MenuDefinition parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<MenuDefinition> children = new ArrayList<>();

    @Column(nullable = false, unique = true, length = 100)
    private String key;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(length = 50)
    private String icon;

    @Column(length = 255)
    private String route;

    @Column(name = "required_feature_key", length = 100)
    private String requiredFeatureKey;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "is_visible", nullable = false)
    @Builder.Default
    private boolean visible = true;

    @Column(name = "is_section_header", nullable = false)
    @Builder.Default
    private boolean sectionHeader = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
```

- [ ] **Step 4: Write PathFeatureMapping entity**

```java
package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "path_feature_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PathFeatureMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "path_pattern", nullable = false, unique = true, length = 255)
    private String pathPattern;

    @Column(name = "required_feature_key", nullable = false, length = 100)
    private String requiredFeatureKey;

    @Column(name = "http_status_on_deny", nullable = false)
    @Builder.Default
    private int httpStatusOnDeny = 402;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureDefinition.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureAssignment.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/MenuDefinition.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/PathFeatureMapping.java
git commit -m "feat: add feature management JPA entities"
```

---

### Task 4: Repositories — user-service

**Files:**
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureDefinitionRepository.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureAssignmentRepository.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/MenuDefinitionRepository.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/domain/model/PathFeatureMappingRepository.java`

- [ ] **Step 1: Write FeatureDefinitionRepository**

```java
package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FeatureDefinitionRepository extends JpaRepository<FeatureDefinition, UUID> {
    List<FeatureDefinition> findByActiveTrueOrderBySortOrderAsc();
    List<FeatureDefinition> findByCategoryAndActiveTrue(String category);
    boolean existsByKey(String key);
}
```

- [ ] **Step 2: Write FeatureAssignmentRepository**

```java
package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface FeatureAssignmentRepository extends JpaRepository<FeatureAssignment, UUID> {

    List<FeatureAssignment> findByAssignmentLevelAndTargetId(FeatureAssignment.AssignmentLevel level, String targetId);

    List<FeatureAssignment> findByFeatureKeyAndAssignmentLevel(String featureKey, FeatureAssignment.AssignmentLevel level);

    void deleteByFeatureKeyAndAssignmentLevelAndTargetId(String featureKey, FeatureAssignment.AssignmentLevel level, String targetId);

    @Query(value = """
        SELECT fa.feature_key FROM (
            SELECT fa.*,
                ROW_NUMBER() OVER (
                    PARTITION BY fa.feature_key
                    ORDER BY CASE fa.assignment_level
                        WHEN 'USER' THEN 1
                        WHEN 'TENANT' THEN 2
                        WHEN 'PLAN' THEN 3
                    END
                ) AS priority
            FROM feature_assignments fa
            WHERE (fa.assignment_level = 'PLAN' AND fa.target_id = :planCode)
               OR (fa.assignment_level = 'TENANT' AND fa.target_id = :tenantId)
               OR (fa.assignment_level = 'USER' AND fa.target_id = :userId)
        ) fa
        WHERE fa.priority = 1 AND fa.granted = true
    """, nativeQuery = true)
    List<String> resolveFeatureKeys(@Param("planCode") String planCode,
                                     @Param("tenantId") String tenantId,
                                     @Param("userId") String userId);
}
```

- [ ] **Step 3: Write MenuDefinitionRepository**

```java
package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface MenuDefinitionRepository extends JpaRepository<MenuDefinition, UUID> {

    @Query("SELECT m FROM MenuDefinition m LEFT JOIN FETCH m.children WHERE m.parent IS NULL ORDER BY m.sortOrder ASC")
    List<MenuDefinition> findFullTree();

    List<MenuDefinition> findByParentIsNullAndVisibleTrueOrderBySortOrderAsc();
}
```

- [ ] **Step 4: Write PathFeatureMappingRepository**

```java
package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PathFeatureMappingRepository extends JpaRepository<PathFeatureMapping, UUID> {
    List<PathFeatureMapping> findAllByOrderBySortOrderAsc();
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureDefinitionRepository.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/FeatureAssignmentRepository.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/MenuDefinitionRepository.java \
        backend/user-service/src/main/java/io/smartpos/user/domain/model/PathFeatureMappingRepository.java
git commit -m "feat: add feature management JPA repositories with resolution query"
```

---

### Task 5: Feature Resolution Service

**Files:**
- Create: `backend/user-service/src/main/java/io/smartpos/user/application/FeatureResolutionService.java`

- [ ] **Step 1: Write FeatureResolutionService**

```java
package io.smartpos.user.application;

import io.smartpos.user.domain.model.FeatureAssignment;
import io.smartpos.user.domain.model.FeatureAssignment.AssignmentLevel;
import io.smartpos.user.domain.model.FeatureAssignmentRepository;
import io.smartpos.user.domain.model.FeatureDefinition;
import io.smartpos.user.domain.model.FeatureDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureResolutionService {

    private final FeatureAssignmentRepository assignmentRepository;
    private final FeatureDefinitionRepository featureDefinitionRepository;

    @Cacheable(value = "features:plan", key = "#planCode")
    public Set<String> getPlanFeatures(String planCode) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.PLAN, planCode));
    }

    @Cacheable(value = "features:tenant", key = "#tenantId")
    public Set<String> getTenantOverrides(String tenantId) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.TENANT, tenantId));
    }

    @Cacheable(value = "features:user", key = "#userId")
    public Set<String> getUserOverrides(String userId) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.USER, userId));
    }

    public Set<String> resolveFeatures(String planCode, String tenantId, String userId) {
        Set<String> features = new HashSet<>(getPlanFeatures(planCode));

        // Apply tenant overrides
        for (FeatureAssignment a : assignmentRepository
                .findByAssignmentLevelAndTargetId(AssignmentLevel.TENANT, tenantId)) {
            if (a.isGranted()) {
                features.add(a.getFeatureKey());
            } else {
                features.remove(a.getFeatureKey());
            }
        }

        // Apply user overrides (highest priority)
        for (FeatureAssignment a : assignmentRepository
                .findByAssignmentLevelAndTargetId(AssignmentLevel.USER, userId)) {
            if (a.isGranted()) {
                features.add(a.getFeatureKey());
            } else {
                features.remove(a.getFeatureKey());
            }
        }

        return features;
    }

    @CacheEvict(value = "features:plan", key = "#planCode")
    public void evictPlanCache(String planCode) {}

    @CacheEvict(value = "features:tenant", key = "#tenantId")
    public void evictTenantCache(String tenantId) {}

    @CacheEvict(value = "features:user", key = "#userId")
    public void evictUserCache(String userId) {}

    public List<FeatureDefinition> getActiveFeatures() {
        return featureDefinitionRepository.findByActiveTrueOrderBySortOrderAsc();
    }

    @Transactional
    public FeatureAssignment assignFeature(String featureKey, AssignmentLevel level,
                                            String targetId, boolean granted, UUID createdBy) {
        assignmentRepository.deleteByFeatureKeyAndAssignmentLevelAndTargetId(featureKey, level, targetId);

        FeatureAssignment assignment = FeatureAssignment.builder()
            .featureKey(featureKey)
            .assignmentLevel(level)
            .targetId(targetId)
            .granted(granted)
            .createdBy(createdBy)
            .build();
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public void removeAssignment(String featureKey, AssignmentLevel level, String targetId) {
        assignmentRepository.deleteByFeatureKeyAndAssignmentLevelAndTargetId(featureKey, level, targetId);
    }

    private Set<String> toFeatureKeySet(List<FeatureAssignment> assignments) {
        Set<String> keys = new HashSet<>();
        for (FeatureAssignment a : assignments) {
            if (a.isGranted()) {
                keys.add(a.getFeatureKey());
            }
        }
        return keys;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/application/FeatureResolutionService.java
git commit -m "feat: add feature resolution service with caching and override logic"
```

---

### Task 6: Menu Service

**Files:**
- Create: `backend/user-service/src/main/java/io/smartpos/user/application/MenuService.java`

- [ ] **Step 1: Write MenuService**

```java
package io.smartpos.user.application;

import io.smartpos.user.domain.model.MenuDefinition;
import io.smartpos.user.domain.model.MenuDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuDefinitionRepository menuRepository;

    @Cacheable(value = "menu:full-tree")
    public List<MenuDefinition> getFullTree() {
        return menuRepository.findFullTree();
    }

    public List<MenuNode> getFilteredTree(Set<String> userFeatures, boolean isSuperAdmin) {
        List<MenuDefinition> fullTree = getFullTree();
        return fullTree.stream()
            .map(item -> filterNode(item, userFeatures, isSuperAdmin))
            .filter(Objects::nonNull)
            .toList();
    }

    private MenuNode filterNode(MenuDefinition item, Set<String> userFeatures, boolean isSuperAdmin) {
        // SUPER_ADMIN sees everything
        if (isSuperAdmin) {
            return MenuNode.from(item, filterChildren(item, userFeatures, true));
        }

        // Check if user has the required feature
        String required = item.getRequiredFeatureKey();
        if (required != null && !userFeatures.contains(required)) {
            return null; // Hidden entirely
        }

        List<MenuNode> filteredChildren = filterChildren(item, userFeatures, false);
        // Section headers with no visible children are hidden
        if (item.isSectionHeader() && filteredChildren.isEmpty()) {
            return null;
        }

        return MenuNode.from(item, filteredChildren);
    }

    private List<MenuNode> filterChildren(MenuDefinition item, Set<String> userFeatures, boolean isSuperAdmin) {
        return item.getChildren().stream()
            .map(child -> filterNode(child, userFeatures, isSuperAdmin))
            .filter(Objects::nonNull)
            .toList();
    }

    @CacheEvict(value = "menu:full-tree", allEntries = true)
    public void evictMenuCache() {}

    @Transactional
    public MenuDefinition createMenuItem(MenuDefinition item) {
        return menuRepository.save(item);
    }

    @Transactional
    public MenuDefinition updateMenuItem(UUID id, MenuDefinition updated) {
        MenuDefinition existing = menuRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Menu item not found: " + id));
        existing.setLabel(updated.getLabel());
        existing.setIcon(updated.getIcon());
        existing.setRoute(updated.getRoute());
        existing.setRequiredFeatureKey(updated.getRequiredFeatureKey());
        existing.setSortOrder(updated.getSortOrder());
        existing.setVisible(updated.isVisible());
        existing.setSectionHeader(updated.isSectionHeader());
        if (updated.getParent() != null) {
            existing.setParent(updated.getParent());
        }
        return menuRepository.save(existing);
    }

    @Transactional
    public void deleteMenuItem(UUID id) {
        menuRepository.deleteById(id);
    }

    @Transactional
    public void reorder(List<ReorderItem> items) {
        for (ReorderItem item : items) {
            MenuDefinition menu = menuRepository.findById(item.id())
                .orElseThrow(() -> new NoSuchElementException("Menu item not found: " + item.id()));
            menu.setSortOrder(item.sortOrder());
            if (item.parentId() != null) {
                MenuDefinition parent = menuRepository.findById(item.parentId())
                    .orElseThrow(() -> new NoSuchElementException("Parent not found: " + item.parentId()));
                menu.setParent(parent);
            } else {
                menu.setParent(null);
            }
            menuRepository.save(menu);
        }
        evictMenuCache();
    }

    public record MenuNode(UUID id, String key, String label, String icon, String route,
                           boolean sectionHeader, List<MenuNode> children) {
        public static MenuNode from(MenuDefinition item, List<MenuNode> children) {
            return new MenuNode(item.getId(), item.getKey(), item.getLabel(), item.getIcon(),
                item.getRoute(), item.isSectionHeader(), children);
        }
    }

    public record ReorderItem(UUID id, UUID parentId, int sortOrder) {}
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/application/MenuService.java
git commit -m "feat: add menu service with tree filtering and reorder support"
```

---

### Task 7: Admin Controllers — user-service

**Files:**
- Create: `backend/user-service/src/main/java/io/smartpos/user/api/FeatureController.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/api/MenuController.java`
- Create: `backend/user-service/src/main/java/io/smartpos/user/api/InternalFeatureController.java`

- [ ] **Step 1: Write FeatureController (admin CRUD)**

```java
package io.smartpos.user.api;

import io.smartpos.user.application.FeatureResolutionService;
import io.smartpos.user.domain.model.FeatureAssignment;
import io.smartpos.user.domain.model.FeatureAssignment.AssignmentLevel;
import io.smartpos.user.domain.model.FeatureDefinition;
import io.smartpos.user.domain.model.FeatureDefinitionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/features")
@RequiredArgsConstructor
public class FeatureController {

    private final FeatureDefinitionRepository featureRepository;
    private final FeatureResolutionService resolutionService;

    @GetMapping
    @PreAuthorize("hasAuthority('admin')")
    public List<FeatureDefinition> listAll() {
        return resolutionService.getActiveFeatures();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<FeatureDefinition> create(@Valid @RequestBody CreateFeatureRequest body) {
        FeatureDefinition feature = FeatureDefinition.builder()
            .key(body.key())
            .label(body.label())
            .description(body.description())
            .category(body.category())
            .sortOrder(body.sortOrder())
            .build();
        FeatureDefinition saved = featureRepository.save(feature);
        return ResponseEntity.created(URI.create("/api/v1/admin/features/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public FeatureDefinition update(@PathVariable UUID id, @Valid @RequestBody UpdateFeatureRequest body) {
        FeatureDefinition existing = featureRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Feature not found: " + id));
        existing.setLabel(body.label());
        existing.setDescription(body.description());
        existing.setCategory(body.category());
        existing.setSortOrder(body.sortOrder());
        existing.setActive(body.active());
        return featureRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        FeatureDefinition feature = featureRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Feature not found: " + id));
        feature.setActive(false);
        featureRepository.save(feature);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    @PreAuthorize("hasAuthority('admin')")
    public List<FeatureAssignment> listAssignments(
            @RequestParam(required = false) AssignmentLevel level,
            @RequestParam(required = false) String targetId) {
        if (level != null && targetId != null) {
            return resolutionService.getAssignmentsByLevelAndTarget(level, targetId);
        }
        return resolutionService.getAllAssignments();
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAuthority('admin')")
    public FeatureAssignment createAssignment(@Valid @RequestBody CreateAssignmentRequest body,
                                               Authentication auth) {
        UUID createdBy = UUID.fromString(auth.getName());
        FeatureAssignment saved = resolutionService.assignFeature(
            body.featureKey(), body.assignmentLevel(), body.targetId(), body.granted(), createdBy);
        // Evict relevant caches
        switch (body.assignmentLevel()) {
            case PLAN -> resolutionService.evictPlanCache(body.targetId());
            case TENANT -> resolutionService.evictTenantCache(body.targetId());
            case USER -> resolutionService.evictUserCache(body.targetId());
        }
        return saved;
    }

    @DeleteMapping("/assignments/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> deleteAssignment(@PathVariable UUID id) {
        FeatureAssignment assignment = resolutionService.getAssignmentById(id);
        resolutionService.removeAssignment(assignment.getFeatureKey(),
            assignment.getAssignmentLevel(), assignment.getTargetId());
        switch (assignment.getAssignmentLevel()) {
            case PLAN -> resolutionService.evictPlanCache(assignment.getTargetId());
            case TENANT -> resolutionService.evictTenantCache(assignment.getTargetId());
            case USER -> resolutionService.evictUserCache(assignment.getTargetId());
        }
        return ResponseEntity.noContent().build();
    }

    public record CreateFeatureRequest(@NotBlank String key, @NotBlank String label,
                                        String description, @NotBlank String category, int sortOrder) {}
    public record UpdateFeatureRequest(@NotBlank String label, String description,
                                        @NotBlank String category, int sortOrder, boolean active) {}
    public record CreateAssignmentRequest(@NotBlank String featureKey,
                                           @NotBlank AssignmentLevel assignmentLevel,
                                           @NotBlank String targetId, boolean granted) {}
}
```

- [ ] **Step 2: Write MenuController (admin CRUD + public filtered endpoint)**

```java
package io.smartpos.user.api;

import io.smartpos.user.application.MenuService;
import io.smartpos.user.application.MenuService.MenuNode;
import io.smartpos.user.application.MenuService.ReorderItem;
import io.smartpos.user.domain.model.MenuDefinition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // Public endpoint: filtered menu for current user
    @GetMapping("/api/v1/menu")
    public List<MenuNode> getMyMenu(Authentication auth) {
        Set<String> features = extractFeatures(auth);
        boolean isSuperAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        return menuService.getFilteredTree(features, isSuperAdmin);
    }

    // Admin: full unfiltered tree
    @GetMapping("/api/v1/admin/menu")
    @PreAuthorize("hasAuthority('admin')")
    public List<MenuDefinition> getFullMenu() {
        return menuService.getFullTree();
    }

    @PostMapping("/api/v1/admin/menu")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<MenuDefinition> createMenu(@Valid @RequestBody CreateMenuRequest body) {
        MenuDefinition item = MenuDefinition.builder()
            .key(body.key())
            .label(body.label())
            .icon(body.icon())
            .route(body.route())
            .requiredFeatureKey(body.requiredFeatureKey())
            .sortOrder(body.sortOrder())
            .sectionHeader(body.sectionHeader())
            .build();
        if (body.parentId() != null) {
            MenuDefinition parent = new MenuDefinition();
            parent.setId(body.parentId());
            item.setParent(parent);
        }
        MenuDefinition saved = menuService.createMenuItem(item);
        menuService.evictMenuCache();
        return ResponseEntity.created(URI.create("/api/v1/admin/menu/" + saved.getId())).body(saved);
    }

    @PutMapping("/api/v1/admin/menu/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public MenuDefinition updateMenu(@PathVariable UUID id, @Valid @RequestBody UpdateMenuRequest body) {
        MenuDefinition updated = MenuDefinition.builder()
            .label(body.label())
            .icon(body.icon())
            .route(body.route())
            .requiredFeatureKey(body.requiredFeatureKey())
            .sortOrder(body.sortOrder())
            .visible(body.visible())
            .sectionHeader(body.sectionHeader())
            .build();
        if (body.parentId() != null) {
            MenuDefinition parent = new MenuDefinition();
            parent.setId(body.parentId());
            updated.setParent(parent);
        }
        MenuDefinition saved = menuService.updateMenuItem(id, updated);
        menuService.evictMenuCache();
        return saved;
    }

    @DeleteMapping("/api/v1/admin/menu/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> deleteMenu(@PathVariable UUID id) {
        menuService.deleteMenuItem(id);
        menuService.evictMenuCache();
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/v1/admin/menu/reorder")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> reorderMenu(@Valid @RequestBody List<ReorderItem> items) {
        menuService.reorder(items);
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private Set<String> extractFeatures(Authentication auth) {
        if (auth == null) return Set.of();
        try {
            Map<String, Object> claims = (Map<String, Object>) auth.getDetails();
            if (claims != null && claims.containsKey("features")) {
                return new HashSet<>((List<String>) claims.get("features"));
            }
        } catch (Exception e) {
            // Fallback: parse from authorities
        }
        return Set.of();
    }

    public record CreateMenuRequest(@NotBlank String key, @NotBlank String label,
                                     String icon, String route, String requiredFeatureKey,
                                     int sortOrder, boolean sectionHeader, UUID parentId) {}
    public record UpdateMenuRequest(@NotBlank String label, String icon, String route,
                                     String requiredFeatureKey, int sortOrder,
                                     boolean visible, boolean sectionHeader, UUID parentId) {}
}
```

- [ ] **Step 3: Write InternalFeatureController (for auth-service)**

```java
package io.smartpos.user.api;

import io.smartpos.user.application.FeatureResolutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/internal/features")
@RequiredArgsConstructor
public class InternalFeatureController {

    private final FeatureResolutionService resolutionService;

    @GetMapping("/resolved")
    public ResponseEntity<Set<String>> resolveFeatures(
            @RequestParam String tenantId,
            @RequestParam String userId,
            @RequestParam String planCode) {
        Set<String> features = resolutionService.resolveFeatures(planCode, tenantId, userId);
        return ResponseEntity.ok(features);
    }
}
```

- [ ] **Step 4: Add missing methods to FeatureResolutionService**

Read the existing `FeatureResolutionService.java` and add these methods:

```java
// Add these imports at the top:
import java.util.NoSuchElementException;

// Add these methods inside the class:
public List<FeatureAssignment> getAssignmentsByLevelAndTarget(AssignmentLevel level, String targetId) {
    return assignmentRepository.findByAssignmentLevelAndTargetId(level, targetId);
}

public List<FeatureAssignment> getAllAssignments() {
    return assignmentRepository.findAll();
}

public FeatureAssignment getAssignmentById(UUID id) {
    return assignmentRepository.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Assignment not found: " + id));
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/user-service/src/main/java/io/smartpos/user/api/FeatureController.java \
        backend/user-service/src/main/java/io/smartpos/user/api/MenuController.java \
        backend/user-service/src/main/java/io/smartpos/user/api/InternalFeatureController.java \
        backend/user-service/src/main/java/io/smartpos/user/application/FeatureResolutionService.java
git commit -m "feat: add admin feature/menu controllers and internal resolution endpoint"
```

---

### Task 8: Auth Service — Feature Resolution on Login

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/application/LoginUseCase.java`
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/security/JwtTokenService.java`

- [ ] **Step 1: Read the existing LoginUseCase to understand hydrateClaims()**

Read `LoginUseCase.java` paying attention to the `hydrateClaims()` method. This is where roles and permissions are fetched from user-service and added to JWT claims.

- [ ] **Step 2: Update hydrateClaims() to include features**

In `LoginUseCase.java`, locate the `hydrateClaims()` method. Add a call to the new feature resolution endpoint. The exact code depends on the existing pattern, but conceptually:

```java
// Inside hydrateClaims(), after fetching permissions from user-service:

// Resolve features from user-service
try {
    String featuresUrl = userServiceUrl + "/api/internal/features/resolved"
        + "?tenantId=" + tenantId
        + "&userId=" + userId
        + "&planCode=" + billingPlan.name();
    ResponseEntity<Set<String>> featuresResponse = restTemplate.exchange(
        featuresUrl, HttpMethod.GET,
        new HttpEntity<>(internalAuthHeaders()),
        new ParameterizedTypeReference<Set<String>>() {}
    );
    claims.put("features", new ArrayList<>(featuresResponse.getBody()));
} catch (Exception e) {
    log.warn("Failed to resolve features for user {}: {}", userId, e.getMessage());
    claims.put("features", List.of()); // Empty features = no access; safe default
}
```

- [ ] **Step 3: Update JwtTokenService to accept features**

In `JwtTokenService.java`, the JWT builder needs to include `features` in the generated token. Locate the JWT claims builder and ensure `features` from the claims map is serialized:

```java
// In the method that builds JWT claims, add:
if (claims.containsKey("features")) {
    @SuppressWarnings("unchecked")
    List<String> features = (List<String>) claims.get("features");
    jwtClaimsSetBuilder.claim("features", features);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/application/LoginUseCase.java \
        backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/security/JwtTokenService.java
git commit -m "feat: resolve features on login and include features[] in JWT claims"
```

---

### Task 9: Gateway — Dynamic Feature Gate Filter

**Files:**
- Create: `backend/gateway/src/main/java/io/smartpos/gateway/DynamicFeatureGateFilter.java`
- Create: `backend/gateway/src/main/java/io/smartpos/gateway/PathMappingCache.java`
- Modify: `backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java` (update filter chain)
- Modify: `backend/gateway/pom.xml` (add spring-boot-starter-webflux for WebClient, if not present)

**Architecture note:** The gateway has no direct database access. It fetches path→feature mappings from user-service via REST on startup and caches them. The cache refreshes when user-service signals a change.

- [ ] **Step 1: Write PathMappingCache (fetches from user-service, caches locally)**

```java
package io.smartpos.gateway;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@Slf4j
public class PathMappingCache {

    private final WebClient webClient;
    private final List<PathMapping> mappings = new CopyOnWriteArrayList<>();

    public PathMappingCache(@Value("${user-service.url:http://user-service:8080}") String userServiceUrl) {
        this.webClient = WebClient.builder().baseUrl(userServiceUrl).build();
    }

    @PostConstruct
    void init() {
        refresh();
    }

    @Scheduled(fixedRate = 300_000) // Refresh every 5 minutes
    public void refresh() {
        try {
            List<PathMapping> fetched = webClient.get()
                .uri("/api/internal/path-mappings")
                .header("X-Internal-Token", "${internal.token}") // Shared secret from config
                .retrieve()
                .bodyToFlux(PathMapping.class)
                .collectList()
                .block();
            if (fetched != null) {
                mappings.clear();
                mappings.addAll(fetched);
                log.debug("Loaded {} path-feature mappings", fetched.size());
            }
        } catch (Exception e) {
            log.warn("Failed to refresh path-feature mappings: {}", e.getMessage());
            // Keep existing mappings on failure
        }
    }

    public List<PathMapping> getMappings() {
        return List.copyOf(mappings);
    }

    @Data
    public static class PathMapping {
        private String pathPattern;
        private String requiredFeatureKey;
        private int httpStatusOnDeny = 402;
        private int sortOrder;
    }
}
```

- [ ] **Step 2: Write DynamicFeatureGateFilter (uses PathMappingCache, no JPA)**

```java
package io.smartpos.gateway;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(-30)
public class DynamicFeatureGateFilter implements GlobalFilter, Ordered {

    private final PathMappingCache pathMappingCache;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // Find matching path pattern from cache
        PathMappingCache.PathMapping matched = pathMappingCache.getMappings().stream()
            .filter(m -> pathMatcher.match(m.getPathPattern(), path))
            .findFirst()
            .orElse(null);

        if (matched == null) {
            return chain.filter(exchange);
        }

        return exchange.getPrincipal()
            .filter(p -> p instanceof Jwt)
            .map(p -> (Jwt) p)
            .flatMap(jwt -> {
                if (isSuperAdmin(jwt)) {
                    return chain.filter(exchange);
                }
                List<String> features = getFeatures(jwt);
                if (features.contains(matched.getRequiredFeatureKey())) {
                    return chain.filter(exchange);
                }
                exchange.getResponse().setStatusCode(
                    HttpStatus.valueOf(matched.getHttpStatusOnDeny()));
                exchange.getResponse().getHeaders()
                    .add("X-Upgrade-Required", "true");
                exchange.getResponse().getHeaders()
                    .add("X-Required-Feature", matched.getRequiredFeatureKey());
                return exchange.getResponse().setComplete();
            })
            .switchIfEmpty(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return -30;
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/api/v1/auth/")
            || path.startsWith("/api/v1/billing/plans")
            || path.startsWith("/api/v1/webhooks/")
            || path.startsWith("/.well-known/")
            || path.startsWith("/actuator/");
    }

    @SuppressWarnings("unchecked")
    private List<String> getFeatures(Jwt jwt) {
        try {
            Object obj = jwt.getClaims().get("features");
            if (obj instanceof List<?> list) {
                return (List<String>) list;
            }
        } catch (Exception e) {
            log.debug("Could not extract features from JWT: {}", e.getMessage());
        }
        return List.of();
    }

    private boolean isSuperAdmin(Jwt jwt) {
        try {
            Object obj = jwt.getClaims().get("roles");
            if (obj instanceof List<?> roles) {
                return roles.contains("SUPER_ADMIN");
            }
        } catch (Exception e) { /* ignore */ }
        return false;
    }
}
```

- [ ] **Step 3: Add internal endpoint in user-service to serve path mappings to gateway**

Add to `InternalFeatureController.java`:

```java
@GetMapping("/path-mappings")
public ResponseEntity<List<PathFeatureMapping>> getPathMappings() {
    return ResponseEntity.ok(pathMappingRepository.findAllByOrderBySortOrderAsc());
}
```

- [ ] **Step 4: Update SecurityConfig in gateway to remove old FeatureGateFilter**

Read `backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java`. Find where `FeatureGateFilter` is declared or referenced. Remove it — `DynamicFeatureGateFilter` replaces it via `@Component` auto-detection.

- [ ] **Step 5: Verify gateway compiles**

```bash
cd backend/gateway && mvn compile
```

Expected: BUILD SUCCESS. No references to removed `FeatureGateFilter`.

- [ ] **Step 6: Commit**

```bash
git add backend/gateway/src/main/java/io/smartpos/gateway/DynamicFeatureGateFilter.java \
        backend/gateway/src/main/java/io/smartpos/gateway/PathMappingCache.java \
        backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java \
        backend/user-service/src/main/java/io/smartpos/user/api/InternalFeatureController.java
git rm backend/gateway/src/main/java/io/smartpos/gateway/FeatureGateFilter.java
git commit -m "feat: replace hardcoded FeatureGateFilter with dynamic filter using cached REST path mappings"
```

---

### Task 10: Frontend — API Layer

**Files:**
- Create: `frontend/src/api/smartpos/features.ts`

- [ ] **Step 1: Write features API client**

```typescript
import { api } from './client';
import type { AxiosResponse } from 'axios';

// Types
export interface FeatureDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  active: boolean;
  sortOrder: number;
}

export interface FeatureAssignment {
  id: string;
  featureKey: string;
  assignmentLevel: 'PLAN' | 'TENANT' | 'USER';
  targetId: string;
  granted: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface MenuNode {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  sectionHeader: boolean;
  children: MenuNode[];
}

export interface MenuDefinition {
  id: string;
  parent: MenuDefinition | null;
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  requiredFeatureKey: string | null;
  sortOrder: number;
  visible: boolean;
  sectionHeader: boolean;
  children: MenuDefinition[];
}

export interface CreateFeatureRequest {
  key: string;
  label: string;
  description?: string;
  category: string;
  sortOrder: number;
}

export interface UpdateFeatureRequest {
  label: string;
  description?: string;
  category: string;
  sortOrder: number;
  active: boolean;
}

export interface CreateAssignmentRequest {
  featureKey: string;
  assignmentLevel: 'PLAN' | 'TENANT' | 'USER';
  targetId: string;
  granted: boolean;
}

export interface CreateMenuRequest {
  key: string;
  label: string;
  icon?: string;
  route?: string;
  requiredFeatureKey?: string;
  sortOrder: number;
  sectionHeader: boolean;
  parentId?: string;
}

export interface UpdateMenuRequest {
  label: string;
  icon?: string;
  route?: string;
  requiredFeatureKey?: string;
  sortOrder: number;
  visible: boolean;
  sectionHeader: boolean;
  parentId?: string;
}

export interface ReorderItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

// API functions

// Public: get filtered menu for current user
export async function getMyMenu(): Promise<MenuNode[]> {
  const res: AxiosResponse<MenuNode[]> = await api.get('/api/v1/menu');
  return res.data;
}

// Admin: feature definitions
export async function getAllFeatures(): Promise<FeatureDefinition[]> {
  const res: AxiosResponse<FeatureDefinition[]> = await api.get('/api/v1/admin/features');
  return res.data;
}

export async function createFeature(data: CreateFeatureRequest): Promise<FeatureDefinition> {
  const res: AxiosResponse<FeatureDefinition> = await api.post('/api/v1/admin/features', data);
  return res.data;
}

export async function updateFeature(id: string, data: UpdateFeatureRequest): Promise<FeatureDefinition> {
  const res: AxiosResponse<FeatureDefinition> = await api.put(`/api/v1/admin/features/${id}`, data);
  return res.data;
}

export async function deleteFeature(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/features/${id}`);
}

// Admin: feature assignments
export async function getAssignments(params?: {
  level?: string;
  targetId?: string;
}): Promise<FeatureAssignment[]> {
  const res: AxiosResponse<FeatureAssignment[]> = await api.get('/api/v1/admin/features/assignments', { params });
  return res.data;
}

export async function createAssignment(data: CreateAssignmentRequest): Promise<FeatureAssignment> {
  const res: AxiosResponse<FeatureAssignment> = await api.post('/api/v1/admin/features/assignments', data);
  return res.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/features/assignments/${id}`);
}

// Admin: menu management
export async function getFullMenu(): Promise<MenuDefinition[]> {
  const res: AxiosResponse<MenuDefinition[]> = await api.get('/api/v1/admin/menu');
  return res.data;
}

export async function createMenuItem(data: CreateMenuRequest): Promise<MenuDefinition> {
  const res: AxiosResponse<MenuDefinition> = await api.post('/api/v1/admin/menu', data);
  return res.data;
}

export async function updateMenuItem(id: string, data: UpdateMenuRequest): Promise<MenuDefinition> {
  const res: AxiosResponse<MenuDefinition> = await api.put(`/api/v1/admin/menu/${id}`, data);
  return res.data;
}

export async function deleteMenuItem(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/menu/${id}`);
}

export async function reorderMenu(items: ReorderItem[]): Promise<void> {
  await api.put('/api/v1/admin/menu/reorder', items);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/features.ts
git commit -m "feat: add features API client with all admin and public endpoints"
```

---

### Task 11: Frontend — useFeatures Hook

**Files:**
- Create: `frontend/src/hooks/useFeatures.ts`

- [ ] **Step 1: Write useFeatures hook**

```typescript
import { useContext } from 'react';
import { AuthContext } from '../context/smartpos/AuthContext';

export function useFeatures() {
  const { user } = useContext(AuthContext);

  const features: string[] = user?.features ?? [];

  const hasFeature = (key: string): boolean => {
    if (user?.roles?.includes('SUPER_ADMIN')) return true;
    return features.includes(key);
  };

  const hasAnyFeature = (keys: string[]): boolean => {
    if (user?.roles?.includes('SUPER_ADMIN')) return true;
    return keys.some((k) => features.includes(k));
  };

  const hasAllFeatures = (keys: string[]): boolean => {
    if (user?.roles?.includes('SUPER_ADMIN')) return true;
    return keys.every((k) => features.includes(k));
  };

  return { features, hasFeature, hasAnyFeature, hasAllFeatures };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useFeatures.ts
git commit -m "feat: add useFeatures hook with hasFeature, hasAnyFeature, hasAllFeature guards"
```

---

### Task 12: Frontend — Update AuthContext

**Files:**
- Modify: `frontend/src/context/smartpos/AuthContext.tsx`

- [ ] **Step 1: Read existing AuthContext**

Read the file to understand the current User type and context value shape.

- [ ] **Step 2: Add features and menu to AuthContext state**

In the User interface (or AuthState type), add:

```typescript
interface User {
  // ... existing fields
  features: string[];
  menu: import('../../api/smartpos/features').MenuNode[];
}
```

In the login flow, after fetching `/api/v1/auth/me` and `/api/v1/users/{id}`, add a call to fetch the menu:

```typescript
// After existing login data fetching:
import { getMyMenu } from '../../api/smartpos/features';

const menu = await getMyMenu();

setUser({
  ...existingUserData,
  features: authMeResponse.features ?? [],
  menu,
});
```

- [ ] **Step 3: Replace hasPlan() with passthrough (keep for backward compat, mark deprecated)**

```typescript
// Keep the method but implement via features
const hasPlan = (minPlan: string): boolean => {
  // Plans are now resolved as features — SUPER_ADMIN always has everything
  if (user?.roles?.includes('SUPER_ADMIN')) return true;
  return true; // Dynamic features handle gating now
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/smartpos/AuthContext.tsx
git commit -m "feat: load features and menu into AuthContext on login"
```

---

### Task 13: Frontend — Dynamic Sidebar from API

**Files:**
- Modify: `frontend/src/layouts/full/vertical/sidebar/SidebarItems.tsx`

- [ ] **Step 1: Read the existing SidebarItems.tsx**

- [ ] **Step 2: Rewrite SidebarItems to render from AuthContext menu**

```tsx
import { useContext } from 'react';
import { AuthContext } from '../../../../context/smartpos/AuthContext';
import { NavGroup } from './NavGroup';
import { NavItem } from './NavItem';
import { NavCollapse } from './NavCollapse';
import type { MenuNode } from '../../../../api/smartpos/features';
import { useNavigate } from 'react-router-dom';

export default function SidebarItems() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const menu: MenuNode[] = user?.menu ?? [];

  const renderMenuItem = (item: MenuNode, depth: number = 0): React.ReactNode => {
    if (item.sectionHeader) {
      return (
        <NavGroup key={item.id} title={item.label}>
          {item.children.map((child) => renderMenuItem(child, depth + 1))}
        </NavGroup>
      );
    }

    if (item.children.length > 0) {
      return (
        <NavCollapse
          key={item.id}
          title={item.label}
          icon={item.icon ?? undefined}
          onClick={() => item.route && navigate(item.route)}
        >
          {item.children.map((child) => renderMenuItem(child, depth + 1))}
        </NavCollapse>
      );
    }

    if (depth === 0 && item.route) {
      // Top-level menu item with no children — section header with single item
      return (
        <NavGroup key={item.id} title={item.label}>
          <NavItem
            icon={item.icon ?? undefined}
            title={item.label}
            onClick={() => navigate(item.route!)}
          />
        </NavGroup>
      );
    }

    return (
      <NavItem
        key={item.id}
        icon={item.icon ?? undefined}
        title={item.label}
        onClick={() => item.route && navigate(item.route!)}
      />
    );
  };

  return <>{menu.map((item) => renderMenuItem(item))}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layouts/full/vertical/sidebar/SidebarItems.tsx
git commit -m "feat: render sidebar dynamically from API menu response"
```

---

### Task 14: Frontend — Admin Feature Manager UI

**Files:**
- Create: `frontend/src/views/smartpos/admin/FeatureManager.tsx`
- Create: `frontend/src/views/smartpos/admin/FeatureManager.css`

- [ ] **Step 1: Write FeatureManager page (3-tab workspace)**

```tsx
import { useState } from 'react';
import {
  Box, Tabs, Tab, Typography, Paper
} from '@mui/material';
import PlanComparison from './PlanComparison';
import FeatureCatalog from './FeatureCatalog';
import TenantUserOverrides from './TenantUserOverrides';

export default function FeatureManager() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Feature & Menu Manager
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Plan Comparison" icon={<span>📋</span>} iconPosition="start" />
          <Tab label="Feature Catalog" icon={<span>🏷️</span>} iconPosition="start" />
          <Tab label="Tenant & User Overrides" icon={<span>👤</span>} iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 0 && <PlanComparison />}
      {tab === 1 && <FeatureCatalog />}
      {tab === 2 && <TenantUserOverrides />}
    </Box>
  );
}
```

- [ ] **Step 2: Write PlanComparison component**

File: `frontend/src/views/smartpos/admin/PlanComparison.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Chip, TextField, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  getAllFeatures, getAssignments, createAssignment, deleteAssignment,
  type FeatureDefinition, type FeatureAssignment
} from '../../../api/smartpos/features';

const PLANS = ['STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'];
const PLAN_COLORS: Record<string, string> = {
  STARTER: '#f9e2af',
  BUSINESS: '#89b4fa',
  PROFESSIONAL: '#cba6f7',
  ENTERPRISE: '#f38ba8',
};
const CATEGORIES = ['All', 'SALES', 'PRODUCTS', 'STOCK', 'PURCHASING', 'FINANCE', 'HRM', 'CRM', 'AI', 'ADMIN', 'MARKETING', 'INTEGRATIONS', 'REPORTS', 'NOTIFICATIONS'];

export default function PlanComparison() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [assignments, setAssignments] = useState<FeatureAssignment[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [feats, assigns] = await Promise.all([getAllFeatures(), getAssignments()]);
    setFeatures(feats);
    setAssignments(assigns);
  };

  const getPlanFeatures = (planCode: string): FeatureDefinition[] => {
    const planFeatureKeys = new Set(
      assignments
        .filter((a) => a.assignmentLevel === 'PLAN' && a.targetId === planCode && a.granted)
        .map((a) => a.featureKey)
    );
    return features.filter((f) => planFeatureKeys.has(f.key));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const featureKey = active.id as string;
    const targetPlan = over.id as string;

    if (!PLANS.includes(targetPlan)) return;

    // Check if already assigned
    const existing = assignments.find(
      (a) => a.featureKey === featureKey && a.assignmentLevel === 'PLAN' && a.targetId === targetPlan
    );

    if (!existing) {
      await createAssignment({
        featureKey,
        assignmentLevel: 'PLAN',
        targetId: targetPlan,
        granted: true,
      });
      await loadData();
    }
  };

  const handleRemoveFeature = async (featureKey: string, planCode: string) => {
    const assignment = assignments.find(
      (a) => a.featureKey === featureKey && a.assignmentLevel === 'PLAN' && a.targetId === planCode
    );
    if (assignment) {
      await deleteAssignment(assignment.id);
      await loadData();
    }
  };

  const filteredFeatures = features.filter((f) => {
    if (categoryFilter !== 'All' && f.category !== categoryFilter) return false;
    if (search && !f.label.toLowerCase().includes(search.toLowerCase()) && !f.key.includes(search)) return false;
    return true;
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, minHeight: 500, overflow: 'auto' }}>
        {PLANS.map((plan) => {
          const planFeatures = getPlanFeatures(plan);
          return (
            <Paper
              key={plan}
              id={plan}
              sx={{
                flex: 1, minWidth: 240, bgcolor: '#11111b',
                border: '1px solid #313244', borderRadius: 2, overflow: 'hidden'
              }}
            >
              <Box sx={{ background: `linear-gradient(135deg, ${PLAN_COLORS[plan]}, ${PLAN_COLORS[plan]}cc)`, p: 2 }}>
                <Typography sx={{ color: '#1e1e2e', fontWeight: 800, fontSize: 14 }}>
                  {plan}
                </Typography>
                <Typography sx={{ color: '#1e1e2e', fontSize: 11, opacity: 0.7 }}>
                  {planFeatures.length} features
                </Typography>
              </Box>

              <Box sx={{ p: 1 }}>
                <SortableContext items={planFeatures.map((f) => f.key)} strategy={verticalListSortingStrategy}>
                  {planFeatures.map((feature) => (
                    <Paper
                      key={feature.key}
                      sx={{
                        p: 1, mb: 0.5, bgcolor: '#1e1e2e',
                        borderLeft: '3px solid #a6e3a1',
                        cursor: 'grab', display: 'flex', alignItems: 'center', gap: 1
                      }}
                    >
                      <Typography sx={{ color: '#6c7086', fontSize: 10 }}>⋮⋮</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: '#cdd6f4', fontSize: 12 }}>{feature.label}</Typography>
                        <Typography sx={{ color: '#6c7086', fontSize: 10 }}>{feature.key}</Typography>
                      </Box>
                      <Chip
                        label="✕"
                        size="small"
                        onClick={() => handleRemoveFeature(feature.key, plan)}
                        sx={{ color: '#f38ba8', cursor: 'pointer', minWidth: 24 }}
                      />
                    </Paper>
                  ))}
                </SortableContext>

                {/* Drop zone */}
                <Box
                  sx={{
                    p: 3, mt: 1, border: '2px dashed #45475a',
                    borderRadius: 2, textAlign: 'center'
                  }}
                >
                  <Typography sx={{ color: '#6c7086', fontSize: 11 }}>
                    Drop features here to add to <strong>{plan}</strong>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Feature bank at bottom */}
      <Paper sx={{ mt: 2, p: 2, bgcolor: '#1e1e2e', border: '1px solid #313244' }}>
        <Typography variant="subtitle2" sx={{ color: '#6c7086', mb: 1 }}>
          Available Features — drag to a plan column above
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {filteredFeatures.map((f) => (
            <Chip
              key={f.key}
              label={`${f.label} (${f.key})`}
              size="small"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', f.key)}
              sx={{ bgcolor: '#313244', color: '#cdd6f4' }}
            />
          ))}
        </Box>
      </Paper>
    </DndContext>
  );
}
```

- [ ] **Step 3: Write FeatureCatalog component**

File: `frontend/src/views/smartpos/admin/FeatureCatalog.tsx`

```tsx
import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from '@mui/material';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import {
  getAllFeatures, createFeature, updateFeature, deleteFeature,
  type FeatureDefinition, type CreateFeatureRequest, type UpdateFeatureRequest
} from '../../../api/smartpos/features';

const CATEGORIES = ['SALES', 'PRODUCTS', 'STOCK', 'PURCHASING', 'FINANCE', 'HRM', 'CRM', 'AI', 'ADMIN', 'MARKETING', 'INTEGRATIONS', 'REPORTS', 'NOTIFICATIONS'];

export default function FeatureCatalog() {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureDefinition | null>(null);
  const [form, setForm] = useState<CreateFeatureRequest>({ key: '', label: '', description: '', category: 'SALES', sortOrder: 0 });

  useEffect(() => { loadFeatures(); }, []);

  const loadFeatures = async () => {
    setFeatures(await getAllFeatures());
  };

  const handleSave = async () => {
    if (editing) {
      await updateFeature(editing.id, { ...form, active: true });
    } else {
      await createFeature(form);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ key: '', label: '', description: '', category: 'SALES', sortOrder: 0 });
    await loadFeatures();
  };

  const handleDelete = async (id: string) => {
    await deleteFeature(id);
    await loadFeatures();
  };

  const openEdit = (f: FeatureDefinition) => {
    setEditing(f);
    setForm({ key: f.key, label: f.label, description: f.description ?? '', category: f.category, sortOrder: f.sortOrder });
    setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Feature Catalog</Typography>
        <Button startIcon={<IconPlus />} variant="contained" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Create Feature
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Feature Key</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Sort Order</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {features.map((f) => (
              <TableRow key={f.id}>
                <TableCell sx={{ fontFamily: 'monospace', color: '#f9e2af' }}>{f.key}</TableCell>
                <TableCell>{f.label}</TableCell>
                <TableCell><Chip label={f.category} size="small" /></TableCell>
                <TableCell>{f.sortOrder}</TableCell>
                <TableCell>
                  <Chip label={f.active ? 'Active' : 'Inactive'} color={f.active ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(f)}><IconEdit size={16} /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(f.id)}><IconTrash size={16} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
        <DialogContent>
          <TextField label="Key" fullWidth margin="dense" value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            disabled={!!editing} helperText="e.g., hrm.payroll.view" />
          <TextField label="Label" fullWidth margin="dense" value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <TextField label="Description" fullWidth margin="dense" multiline rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label="Category" select fullWidth margin="dense" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField label="Sort Order" type="number" fullWidth margin="dense" value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Write TenantUserOverrides component**

File: `frontend/src/views/smartpos/admin/TenantUserOverrides.tsx`

```tsx
import { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Chip, MenuItem, Select, FormControl, InputLabel, Divider
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  getAssignments, createAssignment, deleteAssignment,
  type FeatureAssignment, type FeatureDefinition
} from '../../../api/smartpos/features';

export default function TenantUserOverrides() {
  const [searchTenant, setSearchTenant] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; type: 'TENANT' | 'USER'; name: string } | null>(null);
  const [assignments, setAssignments] = useState<FeatureAssignment[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDefinition[]>([]);

  const handleSearch = async (type: 'TENANT' | 'USER') => {
    const query = type === 'TENANT' ? searchTenant : searchUser;
    if (!query) return;
    // In production, search tenants/users via their respective APIs
    // For now, use the ID directly as target
    setSelectedTarget({ id: query, type, name: query });
    const assigns = await getAssignments({ level: type, targetId: query });
    setAssignments(assigns);
  };

  const handleAddOverride = async (featureKey: string, granted: boolean) => {
    if (!selectedTarget) return;
    await createAssignment({
      featureKey,
      assignmentLevel: selectedTarget.type,
      targetId: selectedTarget.id,
      granted,
    });
    const assigns = await getAssignments({ level: selectedTarget.type, targetId: selectedTarget.id });
    setAssignments(assigns);
  };

  const handleRemoveOverride = async (assignmentId: string) => {
    await deleteAssignment(assignmentId);
    const assigns = await getAssignments({ level: selectedTarget!.type, targetId: selectedTarget!.id });
    setAssignments(assigns);
  };

  const extraFeatures = assignments.filter((a) => a.granted);
  const deniedFeatures = assignments.filter((a) => !a.granted);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Search Tenant</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" fullWidth placeholder="Tenant ID or name"
              value={searchTenant} onChange={(e) => setSearchTenant(e.target.value)} />
            <Button variant="outlined" onClick={() => handleSearch('TENANT')}>Search</Button>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Search User</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" fullWidth placeholder="User email or ID"
              value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
            <Button variant="outlined" onClick={() => handleSearch('USER')}>Search</Button>
          </Box>
        </Box>
      </Box>

      {selectedTarget && (
        <Paper sx={{ p: 2, bgcolor: '#313244', borderLeft: '4px solid #89b4fa' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {selectedTarget.type === 'TENANT' ? 'Tenant' : 'User'}: {selectedTarget.name}
          </Typography>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                EXTRA FEATURES (granted beyond plan)
              </Typography>
              {extraFeatures.map((a) => (
                <Chip key={a.id} label={`+ ${a.featureKey}`}
                  onDelete={() => handleRemoveOverride(a.id)}
                  color="success" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
              <Box sx={{ mt: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Add feature override</InputLabel>
                  <Select label="Add feature override" onChange={(e) => {
                    if (e.target.value) handleAddOverride(e.target.value as string, true);
                  }}>
                    {allFeatures.filter((f) => !extraFeatures.some((a) => a.featureKey === f.key))
                      .map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
                DENIED FEATURES (removed despite plan)
              </Typography>
              {deniedFeatures.map((a) => (
                <Chip key={a.id} label={`- ${a.featureKey}`}
                  onDelete={() => handleRemoveOverride(a.id)}
                  color="error" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/smartpos/admin/FeatureManager.tsx \
        frontend/src/views/smartpos/admin/PlanComparison.tsx \
        frontend/src/views/smartpos/admin/FeatureCatalog.tsx \
        frontend/src/views/smartpos/admin/TenantUserOverrides.tsx
git commit -m "feat: add admin feature manager UI with 3-tab workspace and drag-drop plan comparison"
```

---

### Task 15: Frontend — Add Admin Route for Feature Manager

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Read existing Router.tsx to find admin route definitions**

- [ ] **Step 2: Add FeatureManager route**

Inside the admin routes section (likely protected by `RequireAdmin`), add:

```tsx
import FeatureManager from '../views/smartpos/admin/FeatureManager';

// Inside the admin route group:
<Route path="/admin/features" element={<FeatureManager />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add /admin/features route for feature manager"
```

---

### Task 16: Frontend — Replace PlanGate with hasFeature

**Files:**
- Modify: `frontend/src/routes/Router.tsx`
- Modify: Various route files that use `<PlanGate>`

- [ ] **Step 1: Read Router.tsx to find all `<PlanGate>` usages**

Search for `<PlanGate` across the frontend.

- [ ] **Step 2: Replace each PlanGate with hasFeature-based guard**

Example replacement pattern:

```tsx
// Before:
<Route path="/hrm" element={<PlanGate minPlan="PROFESSIONAL"><HrmDashboard /></PlanGate>} />

// After — using useFeatures hook inside a wrapper:
import { useFeatures } from '../../hooks/useFeatures';

function FeatureGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { hasFeature } = useFeatures();
  if (!hasFeature(feature)) {
    return <Navigate to="/pricing" replace />;
  }
  return <>{children}</>;
}

// Route becomes:
<Route path="/hrm" element={<FeatureGate feature="hrm.module"><HrmDashboard /></FeatureGate>} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: replace PlanGate with dynamic FeatureGate using hasFeature"
```

---

### Task 17: Frontend — Cleanup Old Files

**Files:**
- Remove: `frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts`
- Remove: `frontend/src/config/planGates.ts`
- Remove: `frontend/src/routes/smartpos/PlanGate.tsx`

- [ ] **Step 1: Remove the files**

```bash
git rm frontend/src/layouts/full/vertical/sidebar/SmartPosMenuItems.ts
git rm frontend/src/config/planGates.ts
git rm frontend/src/routes/smartpos/PlanGate.tsx
```

- [ ] **Step 2: Verify no broken imports**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "SmartPosMenuItems|planGates|PlanGate" || echo "No broken imports found"
```

Expected: "No broken imports found" — or fix any remaining references.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: remove hardcoded SmartPosMenuItems, planGates, and PlanGate — replaced by dynamic feature system"
```

---

### Task 18: Backend — Cleanup Old FeatureGateFilter

**Files:**
- Remove: `backend/gateway/src/main/java/io/smartpos/gateway/FeatureGateFilter.java`

This was already removed in Task 9. Verify:

- [ ] **Step 1: Confirm FeatureGateFilter.java is deleted**

```bash
ls backend/gateway/src/main/java/io/smartpos/gateway/FeatureGateFilter.java 2>&1 || echo "File removed — OK"
```

Expected: "File removed — OK"

- [ ] **Step 2: Verify gateway compiles**

```bash
cd backend/gateway && mvn compile
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit if needed** (likely already committed in Task 9)

---

### Task 19: End-to-End Build Verification

- [ ] **Step 1: Build all backend services**

```bash
cd backend && mvn compile -pl auth-service,user-service,gateway,billing-service -am
```

Expected: BUILD SUCCESS for all modules.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify test suites**

```bash
cd backend && mvn test -pl user-service
cd frontend && npm test -- --passWithNoTests
```

Expected: Existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final build verification — backend and frontend compile successfully"
```

---

### Task 20: Install dnd-kit Dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install @dnd-kit packages**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add @dnd-kit packages for drag-and-drop plan comparison"
```

---

## Verification Checklist

After all tasks complete, verify:

1. **Super Admin logs in** → navigates to `/admin/features` → sees 3-tab workspace
2. **Super Admin drags** "AI Insights" feature into STARTER column → assignment created in DB
3. **STARTER tenant user logs in** → sees AI menu item in sidebar → can access `/ai` route
4. **Super Admin removes** "AI Insights" from STARTER → STARTER user refreshes → AI menu gone, `/ai` returns 402
5. **Super Admin gives tenant override** (adds "HRM" to a specific BUSINESS tenant) → that tenant's users see HRM, other BUSINESS tenants don't
6. **Tenant Admin** assigns a role to a user → user sees correct features
7. **Tenant Admin** toggles a per-user override → user's features update on next token refresh
8. **Menu reordering** works via drag-and-drop in the plan comparison view
9. **New feature creation** in Feature Catalog tab works and feature appears in plan columns
10. **Existing tenants** see the exact same features as before migration (no regression)
