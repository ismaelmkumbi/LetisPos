/**
 * Sidebar logo slot — renders the Letis POS brand mark.
 *
 * Adapts to the customizer:
 *  - mini-sidebar (collapsed, no hover) → just the square monogram
 *  - full sidebar                       → monogram + wordmark
 *  - dark theme                         → onDark colour treatment
 */
import { FC, useContext } from 'react';
import { Link } from 'react-router';
import { Box, styled } from '@mui/material';

import config from 'src/context/config';
import { CustomizerContext } from 'src/context/CustomizerContext';
import BrandLogo, { LetisMark } from 'src/components/smartpos/BrandLogo';

const Logo: FC = () => {
  const { isCollapse, activeMode } = useContext(CustomizerContext);
  const collapsed = isCollapse === 'mini-sidebar';

  const LinkStyled = styled(Link)(() => ({
    height: config.topbarHeight,
    width: collapsed ? 48 : 210,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: collapsed ? 0 : 2,
    justifyContent: collapsed ? 'center' : 'flex-start',
    textDecoration: 'none',
    flexShrink: 0,
  }));

  const onDark = activeMode === 'dark';

  return (
    <LinkStyled to="/smartpos/dashboard" aria-label="Letis POS">
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {collapsed
          ? <LetisMark size={36} color={onDark ? 'onDark' : 'default'} />
          : <BrandLogo variant="inline" size="md" color={onDark ? 'onDark' : 'default'} />}
      </Box>
    </LinkStyled>
  );
};

export default Logo;
