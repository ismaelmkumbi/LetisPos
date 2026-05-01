-- Product Service V2 — Stocky parity enhancements
-- Adds: warranty/guarantee, dimensions/weight, IMEI & serial tracking flags,
-- and a serial/IMEI registry table. Combo composition table (V1) was already
-- created but had no JPA mapping; we add `position` to support ordered display.

-- ------------------------------------------------------------------
-- Product attributes
-- ------------------------------------------------------------------
ALTER TABLE products
    ADD COLUMN warranty_months    INT,
    ADD COLUMN guarantee_months   INT,
    ADD COLUMN length_cm          NUMERIC(10,2),
    ADD COLUMN width_cm           NUMERIC(10,2),
    ADD COLUMN height_cm          NUMERIC(10,2),
    ADD COLUMN weight_grams       NUMERIC(12,3),
    ADD COLUMN track_serial       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN track_imei         BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN sellable           BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_products_track_serial ON products (track_serial) WHERE track_serial = TRUE;
CREATE INDEX idx_products_track_imei   ON products (track_imei)   WHERE track_imei   = TRUE;

-- ------------------------------------------------------------------
-- Combo items — add ordering column on existing V1 table
-- ------------------------------------------------------------------
ALTER TABLE product_combo_items
    ADD COLUMN position    INT          NOT NULL DEFAULT 0,
    ADD COLUMN unit_cost   NUMERIC(19,4),
    ADD COLUMN unit_price  NUMERIC(19,4),
    ADD COLUMN created_at  TIMESTAMPTZ  NOT NULL DEFAULT now();

CREATE INDEX idx_combo_items_combo     ON product_combo_items (combo_product_id);
CREATE INDEX idx_combo_items_component ON product_combo_items (component_product_id);

-- ------------------------------------------------------------------
-- Serial / IMEI registry — one row per serialized unit
-- Status moves: IN_STOCK → SOLD → RETURNED (or DEFECTIVE)
-- ------------------------------------------------------------------
CREATE TABLE product_serials (
    id              UUID         PRIMARY KEY,
    product_id      UUID         NOT NULL REFERENCES products(id)        ON DELETE CASCADE,
    variant_id      UUID         REFERENCES product_variants(id)         ON DELETE SET NULL,
    warehouse_id    UUID,                                              -- references inventory-service.warehouses (no FK across services)
    serial_number   VARCHAR(128) NOT NULL,
    serial_type     VARCHAR(16)  NOT NULL DEFAULT 'SERIAL',            -- SERIAL | IMEI | MAC
    status          VARCHAR(20)  NOT NULL DEFAULT 'IN_STOCK',          -- IN_STOCK | RESERVED | SOLD | RETURNED | DEFECTIVE
    purchase_ref    VARCHAR(64),                                       -- inbound reference (PO/Adjustment)
    sale_ref        VARCHAR(64),                                       -- outbound reference (Sale id)
    warranty_start  DATE,
    warranty_end    DATE,
    notes           TEXT,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT product_serials_type_chk   CHECK (serial_type IN ('SERIAL','IMEI','MAC')),
    CONSTRAINT product_serials_status_chk CHECK (status      IN ('IN_STOCK','RESERVED','SOLD','RETURNED','DEFECTIVE'))
);
CREATE UNIQUE INDEX idx_serials_tenant_number ON product_serials (tenant_id, serial_number);
CREATE INDEX idx_serials_product   ON product_serials (product_id);
CREATE INDEX idx_serials_status    ON product_serials (status);
CREATE INDEX idx_serials_warehouse ON product_serials (warehouse_id);
CREATE INDEX idx_serials_sale      ON product_serials (sale_ref) WHERE sale_ref IS NOT NULL;
