/**
 * Compact language switcher (English / Swahili).
 *
 * Drop anywhere — navbar, settings, login. Uses the SmartPOS i18n
 * module so the choice is persisted to localStorage.
 */
import { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import {
  SMARTPOS_LOCALES, setSmartPosLocale, getSmartPosLocale,
  type SmartPosLocale,
} from 'src/i18n/smartpos';

export default function LanguageSwitcher({ color = 'inherit' }: { color?: 'inherit' | 'primary' }) {
  const { t } = useTranslation('smartpos');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = getSmartPosLocale();

  const pick = (code: SmartPosLocale) => {
    setSmartPosLocale(code);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title={t('common.language')}>
        <IconButton
          aria-label={t('common.language')}
          onClick={(e) => setAnchor(e.currentTarget)}
          color={color}
          size="small"
        >
          <IconLanguage size={20} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {SMARTPOS_LOCALES.map((l) => (
          <MenuItem
            key={l.code}
            selected={l.code === current}
            onClick={() => pick(l.code)}
            sx={{ minWidth: 160, gap: 1.5 }}
          >
            <Typography component="span" sx={{ fontSize: 18 }}>{l.flag}</Typography>
            <Typography>{l.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
