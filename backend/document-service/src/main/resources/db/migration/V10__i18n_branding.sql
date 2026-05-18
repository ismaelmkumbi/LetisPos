-- Document Service V10 — i18n & branding enhancements

-- 1. Add locale column to template_overrides for multi-language templates
ALTER TABLE template_overrides ADD COLUMN locale VARCHAR(8) DEFAULT 'en';
DROP INDEX IF EXISTS idx_to_tenant_type;
CREATE UNIQUE INDEX idx_to_tenant_type_locale ON template_overrides (tenant_id, document_type, locale);

-- 2. Seed i18n labels table for document labels (Invoice, Date, Subtotal, etc.)
CREATE TABLE i18n_labels (
    id              UUID          PRIMARY KEY,
    locale          VARCHAR(8)    NOT NULL,
    label_key       VARCHAR(80)   NOT NULL,
    label_value     VARCHAR(255)  NOT NULL,
    tenant_id       UUID,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT i18n_unique UNIQUE (tenant_id, locale, label_key)
);

CREATE INDEX idx_i18n_locale ON i18n_labels (locale);

-- Seed English defaults (global, tenant_id=NULL)
INSERT INTO i18n_labels (id, locale, label_key, label_value) VALUES
    (gen_random_uuid(), 'en', 'invoice', 'INVOICE'),
    (gen_random_uuid(), 'en', 'taxInvoice', 'TAX INVOICE'),
    (gen_random_uuid(), 'en', 'proformaInvoice', 'PROFORMA INVOICE'),
    (gen_random_uuid(), 'en', 'quotation', 'QUOTATION'),
    (gen_random_uuid(), 'en', 'receipt', 'RECEIPT'),
    (gen_random_uuid(), 'en', 'purchaseOrder', 'PURCHASE ORDER'),
    (gen_random_uuid(), 'en', 'deliveryNote', 'DELIVERY NOTE'),
    (gen_random_uuid(), 'en', 'creditNote', 'CREDIT NOTE'),
    (gen_random_uuid(), 'en', 'date', 'Date'),
    (gen_random_uuid(), 'en', 'dueDate', 'Due Date'),
    (gen_random_uuid(), 'en', 'invoiceNumber', 'Invoice #'),
    (gen_random_uuid(), 'en', 'billTo', 'Bill To'),
    (gen_random_uuid(), 'en', 'preparedBy', 'Prepared By'),
    (gen_random_uuid(), 'en', 'item', 'Item / Description'),
    (gen_random_uuid(), 'en', 'qty', 'Qty'),
    (gen_random_uuid(), 'en', 'unitPrice', 'Unit Price'),
    (gen_random_uuid(), 'en', 'tax', 'Tax %'),
    (gen_random_uuid(), 'en', 'total', 'Total'),
    (gen_random_uuid(), 'en', 'subtotal', 'Subtotal'),
    (gen_random_uuid(), 'en', 'discount', 'Discount'),
    (gen_random_uuid(), 'en', 'grandTotal', 'Grand Total'),
    (gen_random_uuid(), 'en', 'vatBreakdown', 'VAT Breakdown'),
    (gen_random_uuid(), 'en', 'bankDetails', 'Bank Details'),
    (gen_random_uuid(), 'en', 'terms', 'Terms & Conditions'),
    (gen_random_uuid(), 'en', 'authorizedSignatory', 'Authorized Signatory'),
    (gen_random_uuid(), 'en', 'customerAcceptance', 'Customer Acceptance'),
    (gen_random_uuid(), 'en', 'page', 'Page'),
    (gen_random_uuid(), 'en', 'generatedOn', 'Generated on'),
    (gen_random_uuid(), 'en', 'scanToVerify', 'Scan to verify this invoice'),
    (gen_random_uuid(), 'en', 'fiscalInfo', 'TRA Fiscal Information'),
    (gen_random_uuid(), 'en', 'validSignature', 'This invoice was electronically generated via VFD and is valid without a physical signature.');

-- Seed Swahili defaults
INSERT INTO i18n_labels (id, locale, label_key, label_value) VALUES
    (gen_random_uuid(), 'sw', 'invoice', 'ANKARA'),
    (gen_random_uuid(), 'sw', 'taxInvoice', 'ANKARA YA KODI'),
    (gen_random_uuid(), 'sw', 'proformaInvoice', 'ANKARA YA PROFORMA'),
    (gen_random_uuid(), 'sw', 'quotation', 'BEI YA KUKADIRIA'),
    (gen_random_uuid(), 'sw', 'receipt', 'RISITI'),
    (gen_random_uuid(), 'sw', 'purchaseOrder', 'ODA YA MANUNUZI'),
    (gen_random_uuid(), 'sw', 'deliveryNote', 'HATI YA UTOAJI'),
    (gen_random_uuid(), 'sw', 'creditNote', 'NOTI YA MAREJE'),
    (gen_random_uuid(), 'sw', 'date', 'Tarehe'),
    (gen_random_uuid(), 'sw', 'dueDate', 'Tarehe ya Mwisho'),
    (gen_random_uuid(), 'sw', 'invoiceNumber', 'Ankara #'),
    (gen_random_uuid(), 'sw', 'billTo', 'Mteja'),
    (gen_random_uuid(), 'sw', 'preparedBy', 'Imeandaliwa Na'),
    (gen_random_uuid(), 'sw', 'item', 'Bidhaa / Maelezo'),
    (gen_random_uuid(), 'sw', 'qty', 'Idadi'),
    (gen_random_uuid(), 'sw', 'unitPrice', 'Bei ya Kipande'),
    (gen_random_uuid(), 'sw', 'tax', 'Kodi %'),
    (gen_random_uuid(), 'sw', 'total', 'Jumla'),
    (gen_random_uuid(), 'sw', 'subtotal', 'Jumla Ndogo'),
    (gen_random_uuid(), 'sw', 'discount', 'Punguzo'),
    (gen_random_uuid(), 'sw', 'grandTotal', 'Jumla Kuu'),
    (gen_random_uuid(), 'sw', 'vatBreakdown', 'Mgawanyo wa VAT'),
    (gen_random_uuid(), 'sw', 'bankDetails', 'Maelezo ya Benki'),
    (gen_random_uuid(), 'sw', 'terms', 'Masharti'),
    (gen_random_uuid(), 'sw', 'authorizedSignatory', 'Saini Rasmi'),
    (gen_random_uuid(), 'sw', 'customerAcceptance', 'Saini ya Mteja'),
    (gen_random_uuid(), 'sw', 'page', 'Ukurasa'),
    (gen_random_uuid(), 'sw', 'generatedOn', 'Imetolewa'),
    (gen_random_uuid(), 'sw', 'scanToVerify', 'Chambua kuthibitisha ankara hii'),
    (gen_random_uuid(), 'sw', 'fiscalInfo', 'Taarifa za Kodi (TRA)'),
    (gen_random_uuid(), 'sw', 'validSignature', 'Ankara hii imetolewa kielektroniki kupitia VFD na ni halali bila saini.');
