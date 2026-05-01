import { Box } from '@mui/material';
import { Outlet } from 'react-router';

export default function ProductsLayout() {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 180px)',
        width: '100%',
        maxWidth: 1680,
        mx: 'auto',
        pb: 3,
        '& .MuiTextField-root .MuiOutlinedInput-root': {
          borderRadius: '10px',
        },
      }}
    >
      <Outlet />
    </Box>
  );
}
