-- Polish global default email templates with the Letis brand shell.
-- Tenant custom templates are intentionally untouched.

UPDATE notification_templates
SET body = $email$
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border:1px solid #DDEBE4;border-radius:20px;overflow:hidden;">
<tr><td style="padding:34px 36px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
<tr>
<td style="width:40px;height:40px;vertical-align:middle;">
<svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Letis POS"><defs><linearGradient id="letis-sale" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0F9F60"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="15" fill="url(#letis-sale)"/><path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill="#FFFFFF" opacity="0.97"/><path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill="#FFFFFF" opacity="0.6"/><rect x="41" y="11" width="14" height="10" rx="3" fill="#BBF7D0" opacity="0.95"/></svg>
</td>
<td style="width:12px;"></td>
<td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;letter-spacing:-0.6px;">Letis</td>
<td style="width:8px;"></td>
<td><span style="display:inline-block;background:#16A34A;color:#FFFFFF;border-radius:8px;padding:4px 7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:850;letter-spacing:1px;">POS</span></td>
</tr>
</table>
<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#64748B;">Receipt</p>
<h1 style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0F172A;letter-spacing:-0.8px;">Thanks for your purchase, {{customer_name}}</h1>
<p style="margin:0 0 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">Your receipt {{ref}} from {{company_name}} is ready.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;"><tr><td style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#166534;">Total paid</td><td align="right" style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;">{{total}}</td></tr></table>
<p style="margin:22px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#94A3B8;">Keep this email for your records.</p>
</td></tr>
</table>
</td></tr>
</table>
$email$
WHERE tenant_id IS NULL
  AND channel = 'EMAIL'
  AND code = 'SALE_RECEIPT';

UPDATE notification_templates
SET body = $email$
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border:1px solid #DDEBE4;border-radius:20px;overflow:hidden;">
<tr><td style="padding:34px 36px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td style="width:40px;height:40px;vertical-align:middle;"><svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Letis POS"><defs><linearGradient id="letis-quote" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0F9F60"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="15" fill="url(#letis-quote)"/><path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill="#FFFFFF" opacity="0.97"/><path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill="#FFFFFF" opacity="0.6"/><rect x="41" y="11" width="14" height="10" rx="3" fill="#BBF7D0" opacity="0.95"/></svg></td><td style="width:12px;"></td><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;letter-spacing:-0.6px;">Letis</td><td style="width:8px;"></td><td><span style="display:inline-block;background:#16A34A;color:#FFFFFF;border-radius:8px;padding:4px 7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:850;letter-spacing:1px;">POS</span></td></tr></table>
<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#64748B;">Quotation</p>
<h1 style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0F172A;letter-spacing:-0.8px;">Quotation {{ref}} is ready</h1>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">Hi {{customer_name}}, please find your quotation from {{company_name}} attached or linked with this email.</p>
</td></tr>
</table>
</td></tr>
</table>
$email$
WHERE tenant_id IS NULL
  AND channel = 'EMAIL'
  AND code = 'QUOTATION_SENT';

UPDATE notification_templates
SET body = $email$
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border:1px solid #DDEBE4;border-radius:20px;overflow:hidden;">
<tr><td style="padding:34px 36px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td style="width:40px;height:40px;vertical-align:middle;"><svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Letis POS"><defs><linearGradient id="letis-po" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0F9F60"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="15" fill="url(#letis-po)"/><path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill="#FFFFFF" opacity="0.97"/><path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill="#FFFFFF" opacity="0.6"/><rect x="41" y="11" width="14" height="10" rx="3" fill="#BBF7D0" opacity="0.95"/></svg></td><td style="width:12px;"></td><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;letter-spacing:-0.6px;">Letis</td><td style="width:8px;"></td><td><span style="display:inline-block;background:#16A34A;color:#FFFFFF;border-radius:8px;padding:4px 7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:850;letter-spacing:1px;">POS</span></td></tr></table>
<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#64748B;">Purchase order</p>
<h1 style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0F172A;letter-spacing:-0.8px;">Purchase order {{ref}}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;"><tr><td style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#64748B;">Total</td><td align="right" style="padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;">{{total}}</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
$email$
WHERE tenant_id IS NULL
  AND channel = 'EMAIL'
  AND code = 'PURCHASE_ORDER';

UPDATE notification_templates
SET body = $email$
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;background:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border:1px solid #DDEBE4;border-radius:20px;overflow:hidden;">
<tr><td style="padding:34px 36px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr><td style="width:40px;height:40px;vertical-align:middle;"><svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Letis POS"><defs><linearGradient id="letis-return" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0F9F60"/><stop offset="1" stop-color="#16A34A"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="15" fill="url(#letis-return)"/><path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill="#FFFFFF" opacity="0.97"/><path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill="#FFFFFF" opacity="0.6"/><rect x="41" y="11" width="14" height="10" rx="3" fill="#BBF7D0" opacity="0.95"/></svg></td><td style="width:12px;"></td><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:850;color:#0F172A;letter-spacing:-0.6px;">Letis</td><td style="width:8px;"></td><td><span style="display:inline-block;background:#16A34A;color:#FFFFFF;border-radius:8px;padding:4px 7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:850;letter-spacing:1px;">POS</span></td></tr></table>
<p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#64748B;">Return confirmation</p>
<h1 style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:28px;line-height:1.2;color:#0F172A;letter-spacing:-0.8px;">Return {{ref}} processed</h1>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#334155;">Your return has been processed. Keep this confirmation for your records.</p>
</td></tr>
</table>
</td></tr>
</table>
$email$
WHERE tenant_id IS NULL
  AND channel = 'EMAIL'
  AND code = 'RETURN_CONFIRM';
