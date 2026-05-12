import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Grid, CircularProgress } from '@mui/material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { SeoDefaults } from '../../../types/commerce';

const SeoSettings: React.FC = () => {
  const [seo, setSeo] = useState<SeoDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    commerceAdmin.getSeo().then(setSeo).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!seo) return;
    setSaving(true);
    await commerceAdmin.updateSeo(seo);
    setSaving(false);
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>SEO Settings</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Site Title" value={seo?.siteTitle || ''} size="small"
              onChange={e => setSeo(prev => prev ? { ...prev, siteTitle: e.target.value } : null)} helperText="Appears in browser tab and search results. Max 70 characters." /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Site Description" value={seo?.siteDescription || ''} size="small" multiline rows={2}
              onChange={e => setSeo(prev => prev ? { ...prev, siteDescription: e.target.value } : null)} helperText="Default meta description. Max 320 characters." /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="OG Image URL" value={seo?.ogImageUrl || ''} size="small"
              onChange={e => setSeo(prev => prev ? { ...prev, ogImageUrl: e.target.value } : null)} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Twitter Handle" value={seo?.twitterHandle || ''} size="small"
              onChange={e => setSeo(prev => prev ? { ...prev, twitterHandle: e.target.value } : null)} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Google Analytics ID" value={seo?.googleAnalyticsId || ''} size="small"
              onChange={e => setSeo(prev => prev ? { ...prev, googleAnalyticsId: e.target.value } : null)} placeholder="G-XXXXXXXXXX" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Google Site Verification" value={seo?.googleSiteVerification || ''} size="small"
              onChange={e => setSeo(prev => prev ? { ...prev, googleSiteVerification: e.target.value } : null)} /></Grid>
          </Grid>
        </CardContent>
      </Card>
      <Box mt={3}><Button variant="contained" onClick={handleSave} disabled={saving}>Save SEO Settings</Button></Box>
    </Box>
  );
};

export default SeoSettings;
