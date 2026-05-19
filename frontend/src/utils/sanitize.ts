import DOMPurify from 'dompurify';

const sanitize = DOMPurify.sanitize;

/** Sanitize admin-provided HTML — strips scripts, event handlers, javascript: URLs */
export function safeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

/** Render sanitized HTML inline — wraps safeHtml for components */
export function sanitizeHtml(dirty: string | null | undefined): { __html: string } {
  return { __html: safeHtml(dirty) };
}
