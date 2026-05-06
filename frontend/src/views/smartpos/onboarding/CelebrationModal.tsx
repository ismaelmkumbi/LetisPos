import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

const CONFETTI_COLORS = [
  brand.primary[500],
  brand.primary[400],
  brand.success.main,
  brand.info.main,
  brand.warning.main,
  '#F472B6',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      vr: number;
      life: number;
    }>
  >([]);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    // Create particles
    particles.current = Array.from({ length: 120 }, () => ({
      x: w / 2,
      y: h / 2 - 40,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 6 + 3,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    }));

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      let alive = false;

      for (const p of particles.current) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rotation += p.vr;
        p.life -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (alive) {
        raf.current = requestAnimationFrame(draw);
      }
    };

    raf.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

export default function CelebrationModal({ open, onClose }: Props) {
  const [showConfetti, setShowConfetti] = useState(open);

  useEffect(() => {
    if (open) setShowConfetti(true);
    else {
      const t = setTimeout(() => setShowConfetti(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
        },
      }}
    >
      {showConfetti && <ConfettiCanvas />}
      <DialogContent sx={{ textAlign: 'center', p: 5, position: 'relative', zIndex: 2 }}>
        <Typography
          sx={{
            fontSize: 56,
            lineHeight: 1,
            mb: 2,
          }}
        >
          🎉
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
          You are all set!
        </Typography>
        <Typography sx={{ color: brand.neutral[500], mb: 3, fontSize: 15 }}>
          Your workspace is fully configured. Here is what you can do next:
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            component={Link}
            to="/smartpos/pos"
            onClick={onClose}
            sx={{
              py: 1.4,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: brand.primary[600],
            }}
          >
            Make your first sale
          </Button>
          <Button
            variant="outlined"
            component={Link}
            to="/smartpos/products"
            onClick={onClose}
            sx={{
              py: 1.4,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              borderColor: brand.neutral[200],
              color: brand.neutral[700],
            }}
          >
            Add more products
          </Button>
          <Button
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: brand.neutral[500],
              mt: 0.5,
            }}
            onClick={onClose}
          >
            Go to Dashboard
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
