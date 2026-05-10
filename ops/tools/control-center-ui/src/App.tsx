import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { isAuthenticated } from './api/client';
import { brand } from './theme';

const letheme = createTheme({
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={letheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
