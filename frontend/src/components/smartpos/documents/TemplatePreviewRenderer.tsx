import { useEffect, useRef } from 'react';
import Handlebars from 'handlebars';

interface TemplatePreviewRendererProps {
  templateHtml: string;
  data: Record<string, unknown>;
}

export default function TemplatePreviewRenderer({
  templateHtml,
  data,
}: TemplatePreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      // Register the {{inc}} helper for 1-based row numbering
      Handlebars.registerHelper('inc', (index: number) => index + 1);

      const template = Handlebars.compile(templateHtml);
      const html = template(data);

      // Write to shadow DOM to avoid style leaks
      const shadow =
        containerRef.current.shadowRoot ??
        containerRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
    } catch (err) {
      console.error('TemplatePreviewRenderer error', err);
      if (containerRef.current.shadowRoot) {
        containerRef.current.shadowRoot.innerHTML =
          '<p style="color:red;padding:16px;">Template rendering error</p>';
      } else {
        const shadow = containerRef.current.attachShadow({ mode: 'open' });
        shadow.innerHTML =
          '<p style="color:red;padding:16px;">Template rendering error</p>';
      }
    }
  }, [templateHtml, data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 400,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'auto',
        background: '#fff',
      }}
    />
  );
}
