import { useEffect, useRef, useState } from 'react';
import { Box, Button, Fade, Paper, Stack, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

interface TourStepProps {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onNext: () => void;
  onSkip: () => void;
  active: boolean;
}

export default function TourStep({
  targetRef,
  title,
  description,
  stepNumber,
  totalSteps,
  placement = 'bottom',
  onNext,
  onSkip,
  active,
}: TourStepProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = targetRef.current;
    if (!el) return;

    const updatePosition = () => {
      const rect = el.getBoundingClientRect();
      const paper = paperRef.current;
      const pw = paper?.offsetWidth ?? 320;
      const ph = paper?.offsetHeight ?? 120;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom':
          top = rect.bottom + 12;
          left = rect.left + rect.width / 2 - pw / 2;
          break;
        case 'top':
          top = rect.top - ph - 12;
          left = rect.left + rect.width / 2 - pw / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - ph / 2;
          left = rect.left - pw - 12;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - ph / 2;
          left = rect.right + 12;
          break;
      }

      // Clamp to viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      left = Math.max(12, Math.min(left, vw - pw - 12));
      top = Math.max(12, Math.min(top, vh - ph - 12));

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [active, targetRef, placement]);

  if (!active) return null;

  return (
    <Fade in={active} timeout={300}>
      <Paper
        ref={paperRef}
        elevation={6}
        sx={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 9999,
          width: 320,
          p: 2.5,
          borderRadius: '14px',
          border: `1px solid ${brand.primary[200]}`,
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 15, color: brand.neutral[900], mb: 0.5 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: brand.neutral[500], mb: 2, lineHeight: 1.5 }}>
          {description}
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.primary[600] }}>
            {stepNumber} / {totalSteps}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={onSkip}
              sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[500] }}
            >
              Skip tour
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={onNext}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: brand.primary[600],
                borderRadius: '8px',
              }}
            >
              {stepNumber === totalSteps ? 'Done' : 'Next'}
            </Button>
          </Stack>
        </Stack>

        {/* Arrow */}
        <Box
          sx={{
            position: 'absolute',
            width: 12,
            height: 12,
            bgcolor: '#fff',
            borderTop: placement === 'bottom' ? `1px solid ${brand.primary[200]}` : 'none',
            borderLeft: placement === 'right' ? `1px solid ${brand.primary[200]}` : 'none',
            borderRight: placement === 'left' ? `1px solid ${brand.primary[200]}` : 'none',
            borderBottom: placement === 'top' ? `1px solid ${brand.primary[200]}` : 'none',
            ...(placement === 'bottom' && {
              top: -6,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              borderRight: 'none',
              borderBottom: 'none',
            }),
            ...(placement === 'top' && {
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              borderTop: 'none',
              borderLeft: 'none',
            }),
            ...(placement === 'left' && {
              right: -6,
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              borderLeft: 'none',
              borderBottom: 'none',
            }),
            ...(placement === 'right' && {
              left: -6,
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              borderTop: 'none',
              borderRight: 'none',
            }),
          }}
        />
      </Paper>
    </Fade>
  );
}
