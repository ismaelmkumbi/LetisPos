-- Gmail does not reliably render inline SVG in email bodies. Replace the
-- Letis inline mark in global defaults with a hosted PNG image.

UPDATE notification_templates
SET body = regexp_replace(
        body,
        '<svg[^>]*aria-label="Letis POS"[^>]*>.*</svg>',
        '<img src="https://letispos.com/email-logo.png" width="40" height="40" alt="Letis POS" style="display:block;width:40px;height:40px;border:0;outline:none;text-decoration:none;border-radius:11px;">',
        'g'
    )
WHERE tenant_id IS NULL
  AND channel = 'EMAIL'
  AND code IN ('SALE_RECEIPT', 'QUOTATION_SENT', 'PURCHASE_ORDER', 'RETURN_CONFIRM')
  AND body LIKE '%<svg%aria-label="Letis POS"%';
