import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { SmartPosAuthProvider } from 'src/context/smartpos/AuthContext';
import { OnboardingProvider } from 'src/context/smartpos/OnboardingContext';
import { BrandProvider, useBrand } from 'src/context/smartpos/BrandContext';
import ThemeInjector from 'src/branding/components/ThemeInjector';
import OfflineBanner from 'src/components/smartpos/OfflineBanner';
import ChunkErrorBoundary from 'src/components/smartpos/ChunkErrorBoundary';
import 'src/i18n/smartpos';
import { useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemedApp() {
  const { colors, profile } = useBrand();
  const theme = ThemeSettings({ brandColors: colors, brandProfile: profile });
  const { activeDir } = useContext(CustomizerContext);

  return (
    <ThemeProvider theme={theme}>
      <RTL direction={activeDir}>
        <CssBaseline />
        <OfflineBanner />
        <ChunkErrorBoundary>
          <SmartPosAuthProvider>
            <OnboardingProvider>
              <RouterProvider router={router} />
            </OnboardingProvider>
          </SmartPosAuthProvider>
        </ChunkErrorBoundary>
      </RTL>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <ThemedApp />
        <ThemeInjector />
      </BrandProvider>
    </QueryClientProvider>
  );
}

export default App;
