import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface CtaButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary';
  href?: string;
}

const CtaButton: React.FC<CtaButtonProps> = ({
  variant = 'primary',
  href,
  children,
  sx,
  ...rest
}) => {
  const isPrimary = variant === 'primary';

  const baseSx = {
    px: 4,
    py: 1.5,
    fontFamily: 'var(--lp-font-body)',
    fontSize: '0.938rem',
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    ...(isPrimary
      ? {
          bgcolor: 'var(--lp-cta-bg)',
          color: 'var(--lp-cta-text)',
          '&:hover': {
            bgcolor: 'var(--lp-accent-hover)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
          },
        }
      : {
          bgcolor: 'var(--lp-cta-secondary-bg)',
          color: 'var(--lp-cta-secondary-text)',
          border: '1px solid var(--lp-cta-secondary-border)',
          '&:hover': {
            bgcolor: 'var(--lp-accent-soft)',
            transform: 'translateY(-1px)',
          },
        }),
    ...sx,
  };

  if (href) {
    return (
      <Button variant="text" href={href} sx={baseSx} {...rest}>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="text" sx={baseSx} {...rest}>
      {children}
    </Button>
  );
};

export default CtaButton;
