import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { IconArrowRight, IconLogin2 } from '@tabler/icons-react';
import { LpThemeProvider } from './LandingpageTheme';
import { DemoDialogProvider } from './components/DemoDialog';
import LazySection from './components/LazySection';
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
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('lp-scrollbar');

    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      html.classList.add('scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => {
        html.classList.remove('scrolling');
      }, 1500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      html.classList.remove('lp-scrollbar', 'scrolling');
    };
  }, []);

  return (
    <LpThemeProvider>
      <DemoDialogProvider>
        <Box className="lp-page" sx={{ pb: { xs: 9, md: 0 } }}>
          <Header />
          <main>
            <Hero />
            <TrustBar />
            <ModulesGrid />
            <HowItWorks />
            <LazySection minHeight="300px"><AiHighlight /></LazySection>
            <LazySection minHeight="250px"><Testimonials /></LazySection>
            <LazySection minHeight="400px"><Pricing variant="default" /></LazySection>
            <LazySection minHeight="300px"><Faq /></LazySection>
            <LazySection minHeight="200px"><FinalCta /></LazySection>
          </main>
          <Footer />
          <ThemeToggle />
          <Box
            sx={{
              display: { xs: 'grid', md: 'none' },
              gridTemplateColumns: '0.82fr 1.18fr',
              gap: 1,
              position: 'fixed',
              left: 12,
              right: 12,
              bottom: 12,
              zIndex: 1200,
              p: 0.75,
              borderRadius: '16px',
              border: '1px solid var(--lp-border)',
              bgcolor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            }}
          >
            <Box
              component="a"
              href="/auth/login"
              sx={{
                minHeight: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <IconLogin2 size={17} />
              Sign in
            </Box>
            <Box
              component="a"
              href="/auth/login?plan=starter"
              sx={{
                minHeight: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                bgcolor: 'var(--lp-cta-bg)',
                color: 'var(--lp-cta-text)',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 900,
              }}
            >
              Start free
              <IconArrowRight size={17} />
            </Box>
          </Box>
        </Box>
      </DemoDialogProvider>
    </LpThemeProvider>
  );
};

export default Landingpage;
