import { useRef, useEffect, useMemo, type FC, type ReactNode, type ElementType } from 'react';
import { Popover, Grow, Box, Typography, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface NavFlyoutProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  title?: string;
  titleIcon?: ElementType;
  children: ReactNode;
}

const NavFlyout: FC<NavFlyoutProps> = ({
  anchorEl,
  open,
  onClose,
  onMouseEnter,
  onMouseLeave,
  title,
  titleIcon: TitleIcon,
  children,
}) => {
  const theme = useTheme();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorPosition = useMemo(() => {
    if (!anchorEl) return undefined;
    const rect = anchorEl.getBoundingClientRect();
    const viewportPadding = 12;
    const estimatedMenuHeight = 260;
    const top = Math.min(
      Math.max(rect.top - 12, viewportPadding),
      window.innerHeight - viewportPadding - estimatedMenuHeight,
    );

    return {
      top: Math.max(viewportPadding, top),
      left: rect.right + 8,
    };
  }, [anchorEl]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    onMouseLeave?.();
    closeTimer.current = setTimeout(onClose, 200);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
      anchorPosition={anchorPosition}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      TransitionComponent={Grow}
      transitionDuration={{ enter: 160, exit: 120 }}
      disableRestoreFocus
      marginThreshold={8}
      sx={{
        pointerEvents: 'none',
        '& .MuiPopover-paper': {
          transformOrigin: 'left top !important',
        },
      }}
      slotProps={{
        paper: {
          sx: {
            pointerEvents: 'auto',
            ml: 0,
            mt: 0,
            minWidth: 236,
            maxWidth: 320,
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            p: 1,
            borderRadius: '14px',
            boxShadow: theme.shadows[8],
            transformOrigin: '0 0 0',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -12,
              top: 0,
              width: 12,
              height: '100%',
            },
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
