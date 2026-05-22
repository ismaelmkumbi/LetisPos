import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from '@mui/material';
import { isAuthenticated } from './api/client';
import ErrorBoundary from './components/ErrorBoundary';
import { brand } from './theme';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: brand.primary[500] },
    background: { default: brand.neutral[900], paper: brand.neutral[800] },
    text: { primary: brand.neutral[50], secondary: brand.neutral[400] },
    divider: brand.neutral[700],
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h6: { fontWeight: 800, letterSpacing: '-0.02em' },
    caption: { fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${brand.neutral[700]}`, boxShadow: '0 4px 24px rgba(0,0,0,0.25)' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, borderRadius: 10 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: brand.neutral[700] }, '&:hover fieldset': { borderColor: brand.neutral[500] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiInputLabel-root': { color: brand.neutral[400] }, '& .MuiInputBase-input': { color: brand.neutral[50] } } } },
  },
});

function Loader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: brand.neutral[900] }}>
      <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
    </Box>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
