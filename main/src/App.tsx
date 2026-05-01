import { CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { RouterProvider } from 'react-router';
import router from './routes/Router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { SmartPosAuthProvider } from 'src/context/smartpos/AuthContext';
import OfflineBanner from 'src/components/smartpos/OfflineBanner';
import 'src/i18n/smartpos'; // registers SmartPOS namespace + Swahili
import { useContext } from 'react';



function App() {

  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);


  return (

    <ThemeProvider theme={theme}>
      <RTL direction={activeDir}>
        <CssBaseline />
        <OfflineBanner />
        <SmartPosAuthProvider>
          <RouterProvider router={router} />
        </SmartPosAuthProvider>
      </RTL>
    </ThemeProvider>
  );
}

export default App;
