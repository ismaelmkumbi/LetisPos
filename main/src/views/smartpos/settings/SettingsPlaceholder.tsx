import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PageHeader from 'src/components/smartpos/PageHeader';
import {
  SMARTPOS_LOCALES, setSmartPosLocale, getSmartPosLocale, type SmartPosLocale,
} from 'src/i18n/smartpos';
import { brand } from 'src/theme/smartpos/brand';

/**
 * Shared placeholder used by settings sub-pages (Users, Tenants, Locale,
 * Preferences) that ship in Phase 7d. Each one gets its own file when we
 * flesh out the admin UX, but for now the sidebar points here.
 */
export function SettingsPlaceholder({
  title, subtitle, info,
}: { title: string; subtitle: string; info: string }) {
  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} />
      <Alert severity="info">{info}</Alert>
    </Box>
  );
}

export default function SettingsHome() {
  return (
    <SettingsPlaceholder
      title="Preferences"
      subtitle="Workspace-wide settings"
      info="Preferences, tax rules, currency defaults, receipt templates — coming in Phase 7d."
    />
  );
}

export function UsersRolesSettings() {
  return (
    <SettingsPlaceholder
      title="Users & Roles"
      subtitle="Team members, role assignments, permissions"
      info="User management (invite/revoke/roles) is landing in Phase 7d. The backend permission model is already in place; the UI is next."
    />
  );
}

export function TenantsSettings() {
  return (
    <SettingsPlaceholder
      title="Tenants"
      subtitle="Multi-tenant isolation and billing"
      info="Tenant administration lands in Phase 7d. Once exposed, each tenant will have its own data scope, users, and billing plan."
    />
  );
}

export function LocaleSettings() {
  // Re-render on locale change by depending on i18next; the component is
  // simple enough that a full mount is fine on pick.
  useTranslation('smartpos');
  const current = getSmartPosLocale();

  const pick = (code: SmartPosLocale) => setSmartPosLocale(code);

  return (
    <Box>
      <PageHeader
        title="Localization"
        subtitle="Language, currency format, tax rules"
      />
      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, maxWidth: 560 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Display language
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2 }}>
            Applies to every page in this browser. Saved to local storage.
          </Typography>

          <Stack spacing={1.5}>
            {SMARTPOS_LOCALES.map((l) => {
              const selected = l.code === current;
              return (
                <Box
                  key={l.code}
                  onClick={() => pick(l.code)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 2, borderRadius: 2, cursor: 'pointer',
                    border: `1px solid ${selected ? brand.primary[500] : brand.neutral[200]}`,
                    bgcolor: selected ? brand.primary[50] : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: brand.primary[500] },
                  }}
                >
                  <Typography component="span" sx={{ fontSize: 28 }}>{l.flag}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{l.label}</Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      {l.code.toUpperCase()}
                    </Typography>
                  </Box>
                  {selected && (
                    <Typography
                      variant="caption"
                      sx={{ color: brand.primary[700], fontWeight: 700, letterSpacing: '0.08em' }}
                    >
                      ACTIVE
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
      <Alert severity="info" sx={{ mt: 2, maxWidth: 560 }}>
        Per-user persistence, currency formatting, and tax-rule presets land in a later phase.
      </Alert>
    </Box>
  );
}
