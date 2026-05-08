import React, { useRef, useState } from 'react';
import { Box, BoxProps } from '@mui/material';
import { useInView } from 'framer-motion';

interface LazySectionProps extends BoxProps {
  children: React.ReactNode;
  /** Minimum height placeholder while content hasn't entered viewport */
  minHeight?: string | number;
}

const LazySection: React.FC<LazySectionProps> = ({
  children,
  minHeight = '200px',
  sx,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-200px' });
  const [hasRendered, setHasRendered] = useState(false);

  if (inView && !hasRendered) {
    setHasRendered(true);
  }

  return (
    <Box ref={ref} sx={{ minHeight: hasRendered ? 'auto' : minHeight, ...sx }} {...rest}>
      {hasRendered ? children : null}
    </Box>
  );
};

export default LazySection;
