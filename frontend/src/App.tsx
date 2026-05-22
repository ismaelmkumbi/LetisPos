import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { SmartPosAuthProvider } from 'src/context/smartpos/AuthContext';
import { OnboardingProvider } from 'src/context/smartpos/OnboardingContext';
import OfflineBanner from 'src/components/smartpos/OfflineBanner';
import ChunkErrorBoundary from 'src/components/smartpos/ChunkErrorBoundary';
import 'src/i18n/smartpos'; // registers SmartPOS namespace + Swahili
import { useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s — dashboard data fresh enough
      gcTime: 5 * 60_000,       // 5min garbage collection (former cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
