import React from 'react';
import { Box } from '@mui/material';
import { LpThemeProvider } from './LandingpageTheme';
import ThemeToggle from './components/ThemeToggle';
import Header from './sections/Header';
import Hero from './sections/Hero';
import TrustBar from './sections/TrustBar';
import ModulesGrid from './sections/ModulesGrid';
import HowItWorks from './sections/HowItWorks';
import AiHighlight from './sections/AiHighlight';
import Testimonials from './sections/Testimonials';
import Pricing from './sections/Pricing';
import Faq from './sections/Faq';
import FinalCta from './sections/FinalCta';
import Footer from './sections/Footer';
import './Landingpage.css';

const Landingpage: React.FC = () => {
  return (
    <LpThemeProvider>
      <Box className="lp-page">
        <Header />
        <main>
          <Hero />
          <TrustBar />
          <ModulesGrid />
          <HowItWorks />
          <AiHighlight />
          <Testimonials />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
        <ThemeToggle />
      </Box>
    </LpThemeProvider>
  );
};

export default Landingpage;
