CREATE TABLE pos_settings (
    id              UUID PRIMARY KEY,
    warehouse_id    UUID UNIQUE NOT NULL,

    -- Receipt layout & paper
    receipt_layout       SMALLINT  NOT NULL DEFAULT 1,  -- 1=Standard, 2=Compact, 3=Detailed
    receipt_paper_size   SMALLINT  NOT NULL DEFAULT 80, -- 58, 80, or 88 (mm)

    -- Receipt display toggles
    show_logo            BOOLEAN NOT NULL DEFAULT TRUE,
    logo_size            SMALLINT NOT NULL DEFAULT 60,
    show_store_name      BOOLEAN NOT NULL DEFAULT TRUE,
    show_store_address   BOOLEAN NOT NULL DEFAULT TRUE,
    show_store_phone     BOOLEAN NOT NULL DEFAULT TRUE,
    show_store_email     BOOLEAN NOT NULL DEFAULT FALSE,
    show_reference       BOOLEAN NOT NULL DEFAULT TRUE,
    show_date            BOOLEAN NOT NULL DEFAULT TRUE,
    show_seller          BOOLEAN NOT NULL DEFAULT FALSE,
    show_customer        BOOLEAN NOT NULL DEFAULT TRUE,
    show_warehouse       BOOLEAN NOT NULL DEFAULT FALSE,
    show_tax             BOOLEAN NOT NULL DEFAULT TRUE,
    show_discount        BOOLEAN NOT NULL DEFAULT TRUE,
    show_shipping        BOOLEAN NOT NULL DEFAULT FALSE,
    show_barcode         BOOLEAN NOT NULL DEFAULT FALSE,
    show_note            BOOLEAN NOT NULL DEFAULT FALSE,
    show_paid            BOOLEAN NOT NULL DEFAULT TRUE,
    show_due             BOOLEAN NOT NULL DEFAULT TRUE,
    show_payments        BOOLEAN NOT NULL DEFAULT TRUE,
    show_footer          BOOLEAN NOT NULL DEFAULT TRUE,

    -- Store info
    store_name           VARCHAR(255) NOT NULL DEFAULT 'LetisPOS',
    store_address        VARCHAR(255) NOT NULL DEFAULT '',
    store_phone          VARCHAR(64)  NOT NULL DEFAULT '',
    store_email          VARCHAR(128) NOT NULL DEFAULT '',
    store_tax_id         VARCHAR(64)  NOT NULL DEFAULT '',
    footer_message       VARCHAR(255) NOT NULL DEFAULT 'Thank you for your business.',

    -- Printing
    auto_print           BOOLEAN NOT NULL DEFAULT TRUE,

    -- POS behaviour
    products_per_page    SMALLINT NOT NULL DEFAULT 24,

    -- Tax defaults
    default_tax_rate     DECIMAL(5,2) NOT NULL DEFAULT 0,
    default_tax_method   VARCHAR(16) NOT NULL DEFAULT 'EXCLUSIVE', -- EXCLUSIVE or INCLUSIVE

    -- Currency
    currency_code        VARCHAR(8) NOT NULL DEFAULT 'TZS',
    currency_symbol      VARCHAR(8) NOT NULL DEFAULT '',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
