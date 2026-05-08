import React from 'react';
import { Box } from '@mui/material';
import { LpThemeProvider } from './LandingpageTheme';
import { DemoDialogProvider } from './components/DemoDialog';
import ThemeToggle from './components/ThemeToggle';
import LazySection from './components/LazySection';
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
      <DemoDialogProvider>
      <Box className="lp-page">
        <Header />
        <main>
          <Hero />
          <TrustBar />
          <LazySection minHeight="500px"><ModulesGrid /></LazySection>
          <LazySection minHeight="300px"><HowItWorks /></LazySection>
          <LazySection minHeight="400px"><AiHighlight /></LazySection>
          <LazySection minHeight="350px"><Testimonials /></LazySection>
          <LazySection minHeight="550px"><Pricing /></LazySection>
          <LazySection minHeight="400px"><Faq /></LazySection>
          <LazySection minHeight="300px"><FinalCta /></LazySection>
        </main>
        <LazySection minHeight="300px"><Footer /></LazySection>
        <ThemeToggle />
      </Box>
      </DemoDialogProvider>
    </LpThemeProvider>
  );
};

export default Landingpage;
