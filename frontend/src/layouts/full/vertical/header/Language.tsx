import React, { useContext, useEffect } from 'react';
import { Avatar, IconButton, Menu, MenuItem, Typography, Stack } from '@mui/material';
import FlagEn from 'src/assets/images/flag/icon-flag-en.svg';
import FlagFr from 'src/assets/images/flag/icon-flag-fr.svg';
import FlagCn from 'src/assets/images/flag/icon-flag-cn.svg';
import FlagSa from 'src/assets/images/flag/icon-flag-sa.svg';
import { useTranslation } from 'react-i18next';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';

const Languages = [
  { flagname: 'English (UK)', icon: FlagEn, value: 'en' },
  { flagname: '中国人 (Chinese)', icon: FlagCn, value: 'ch' },
  { flagname: 'français (French)', icon: FlagFr, value: 'fr' },
  { flagname: 'عربي (Arabic)', icon: FlagSa, value: 'ar' },
];

const Language = () => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const { isLanguage, setIsLanguage, activeMode } = useContext(CustomizerContext);
  const currentLang = Languages.find((_lang) => _lang.value === isLanguage) || Languages[0];
  const { i18n } = useTranslation();
  const isDark = activeMode === 'dark';

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  useEffect(() => {
    i18n.changeLanguage(isLanguage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <IconButton
        aria-label="Select language"
        aria-controls={open ? 'language-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          border: `1px solid ${open ? (isDark ? brand.neutral[600] : brand.primary[300]) : isDark ? brand.neutral[700] : brand.neutral[200]}`,
          bgcolor: open ? (isDark ? brand.neutral[800] : brand.primary[50]) : isDark ? '#0C1421' : '#FFFFFF',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isDark ? brand.neutral[800] : brand.primary[50],
            borderColor: isDark ? brand.neutral[600] : brand.primary[200],
          },
        }}
      >
        <Avatar src={currentLang.icon} alt={currentLang.value} sx={{ width: 20, height: 20 }} />
      </IconButton>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 210,
              borderRadius: '14px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: '0 16px 40px rgba(15,23,42,0.10)',
            },
          },
        }}
      >
        {Languages.map((option, index) => (
          <MenuItem
            key={index}
            sx={{
              py: 1.5,
              px: 2.5,
              mx: 0.75,
              my: 0.25,
              borderRadius: '10px',
              '&:hover': { bgcolor: brand.primary[50] },
            }}
            onClick={() => { setIsLanguage(option.value); handleClose(); }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={option.icon} alt={option.value} sx={{ width: 20, height: 20 }} />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: brand.neutral[700] }}>
                {option.flagname}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default Language;
