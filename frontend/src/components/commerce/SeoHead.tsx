import React from 'react';
import { Helmet } from 'react-helmet';

interface SeoHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
}

const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  structuredData,
}) => (
  <Helmet>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta property="og:type" content={ogType} />
    {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    {structuredData && (
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    )}
  </Helmet>
);

export default SeoHead;
