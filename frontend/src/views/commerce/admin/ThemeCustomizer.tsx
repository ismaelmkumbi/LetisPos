import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  Switch, FormControlLabel, CircularProgress, Alert,
} from '@mui/material';
import { useCommerceAdmin } from '../../../context/CommerceContext';
import type { ThemeSettings } from '../../../types/commerce';

const defaultSettings: ThemeSettings = {
  colors: { primary: '#1976d2', secondary: '#f57c00', accent: '#10b981', background: '#ffffff', text: '#1a1a1a' },
  fonts: { heading: 'Inter', body: 'Inter' },
  homepage: { heroLayout: 'fullwidth', featuredCount: 8 },
  header: { style: 'centered', sticky: true },
  footer: { style: 'three_column', showSocial: true },
  cssOverrides: '',
};

const ThemeCustomizer: React.FC = () => {
  const { theme, loading, error, refreshTheme, updateTheme } = useCommerceAdmin();
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (theme?.settings) setSettings(theme.settings);
  }, [theme]);

  const updateColor = (key: keyof ThemeSettings['colors'], value: string) => {
    setSettings(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTheme(settings);
      setMessage('Theme saved successfully.');
    } catch {
      setMessage('Failed to save theme.');
    } finally { setSaving(false); }
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error" action={<Button onClick={refreshTheme}>Retry</Button>}>{error.message}</Alert></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Theme Customizer</Typography>
      {message && <Alert severity={message.includes('Failed') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Colors</Typography>
          <Grid container spacing={2}>
            {Object.entries(settings.colors).map(([key, value]) => (
              <Grid size={{ xs: 12, sm: 4 }} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: value, border: '1px solid #ccc' }} />
                  <TextField fullWidth label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} size="small"
                    onChange={e => updateColor(key as keyof ThemeSettings['colors'], e.target.value)} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Typography</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Heading Font" value={settings.fonts.heading} size="small"
                onChange={e => setSettings(prev => ({ ...prev, fonts: { ...prev.fonts, heading: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Body Font" value={settings.fonts.body} size="small"
                onChange={e => setSettings(prev => ({ ...prev, fonts: { ...prev.fonts, body: e.target.value } }))} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Layout</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Hero Layout" value={settings.homepage.heroLayout} size="small"
                onChange={e => setSettings(prev => ({ ...prev, homepage: { ...prev.homepage, heroLayout: e.target.value } }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Featured Products Count" type="number" value={settings.homepage.featuredCount} size="small"
                onChange={e => setSettings(prev => ({ ...prev, homepage: { ...prev.homepage, featuredCount: parseInt(e.target.value) || 8 } }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel control={<Switch checked={settings.header.sticky}
                onChange={e => setSettings(prev => ({ ...prev, header: { ...prev.header, sticky: e.target.checked } }))} />}
                label="Sticky Header" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel control={<Switch checked={settings.footer.showSocial}
                onChange={e => setSettings(prev => ({ ...prev, footer: { ...prev.footer, showSocial: e.target.checked } }))} />}
                label="Show Social Links in Footer" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Custom CSS</Typography>
          <TextField fullWidth multiline rows={5} label="Custom CSS" value={settings.cssOverrides} size="small"
            onChange={e => setSettings(prev => ({ ...prev, cssOverrides: e.target.value }))}
            placeholder="/* Add custom CSS here */" />
        </CardContent>
      </Card>

      <Button variant="contained" onClick={handleSave} disabled={saving}
        sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
        {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Theme'}
      </Button>
    </Box>
  );
};

export default ThemeCustomizer;
