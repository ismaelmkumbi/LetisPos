import React, { useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { motion, useInView } from 'framer-motion';

interface SectionWrapperProps extends BoxProps {
  children: React.ReactNode;
  id?: string;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  id,
  sx,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <Box
      ref={ref}
      id={id}
      component={motion.div}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      sx={{ py: { xs: 8, md: 12 }, ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default SectionWrapper;
