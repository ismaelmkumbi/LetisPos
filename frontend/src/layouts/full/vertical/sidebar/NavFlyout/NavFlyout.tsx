import { useRef, useEffect, type FC, type ReactNode, type ElementType } from 'react';
import { Popover, Grow, Box, Typography, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface NavFlyoutProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  title?: string;
  titleIcon?: ElementType;
  children: ReactNode;
}

const NavFlyout: FC<NavFlyoutProps> = ({ anchorEl, open, onClose, title, titleIcon: TitleIcon, children }) => {
  const theme = useTheme();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(onClose, 200);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      TransitionComponent={Grow}
      transitionDuration={{ enter: 250, exit: 200 }}
      disableRestoreFocus
      sx={{ pointerEvents: 'none' }}
      slotProps={{
        paper: {
          sx: {
            pointerEvents: 'auto',
            ml: 1.5,
            mt: -0.5,
            minWidth: 220,
            maxWidth: 280,
            p: 1,
            borderRadius: '14px',
            boxShadow: theme.shadows[8],
            transformOrigin: '0 0 0',
          },
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        },
      }}
    >
      <Box>
        {title && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75 }}>
              {TitleIcon && <TitleIcon stroke={1.5} size={16} />}
              <Typography variant="body2" fontWeight={600} noWrap>
                {title}
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
          </>
        )}
        {children}
      </Box>
    </Popover>
  );
};

export default NavFlyout;
