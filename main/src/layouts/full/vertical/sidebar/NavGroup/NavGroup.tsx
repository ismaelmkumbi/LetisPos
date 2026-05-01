import { Box, Typography } from '@mui/material';
import { IconDots } from '@tabler/icons-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { brand } from 'src/theme/smartpos/brand';

type NavGroup = {
  navlabel?: boolean;
  subheader?: string;
};

interface ItemType {
  item: NavGroup;
  hideMenu: string | boolean;
}

const NavGroup = ({ item, hideMenu }: ItemType) => {
  if (hideMenu) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5, opacity: 0.35 }}>
        <IconDots size={14} color={brand.neutral[500]} />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2, pt: 2.5, pb: 0.5 }}>
      <Typography
        variant="overline"
        sx={{
          color: brand.neutral[400],
          fontWeight: 700,
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          lineHeight: 1,
          display: 'block',
        }}
      >
        {item?.subheader}
      </Typography>
    </Box>
  );
};

export default NavGroup;
