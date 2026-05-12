import React from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const faqs = [
  {
    question: 'Does Letis work offline?',
    answer: 'Yes. The POS terminal works fully offline. Sales are processed locally and synced automatically when you reconnect. Your internet going down does not stop your business.',
  },
  {
    question: 'What hardware do I need?',
    answer: 'Letis runs on any modern web browser — desktop, laptop, or tablet. For the POS terminal, we recommend a touchscreen device with a barcode scanner and receipt printer. Most standard POS hardware is compatible.',
  },
  {
    question: 'Can I migrate data from my current system?',
    answer: 'Yes. We support bulk import for products, customers, suppliers, and opening stock via CSV or Excel. Our support team can help with complex migrations from legacy systems.',
  },
  {
    question: 'How does multi-store work?',
    answer: 'Each store operates independently with its own inventory and POS terminal. A centralized dashboard gives you consolidated reporting, cross-location inventory visibility, and inter-store transfers. Permissions are role-based per store.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support with a 24-hour response time. Professional plans get priority support (4-hour response). Enterprise customers get a dedicated account manager and 24/7 phone support.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We run automated backups every hour. You can export your data at any time in standard formats — your data is yours.',
  },
];

const Faq: React.FC = () => {
  return (
    <SectionWrapper>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Frequently asked questions
          </Typography>
        </Box>

        {faqs.map((faq, idx) => (
          <Accordion
            key={idx}
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              color: 'var(--lp-text)',
              borderBottom: '1px solid var(--lp-border)',
              '&:before': { display: 'none' },
              '&:first-of-type': { borderTop: '1px solid var(--lp-border)' },
            }}
          >
            <AccordionSummary
              expandIcon={<IconChevronDown size={18} style={{ color: 'var(--lp-text-muted)' }} />}
              sx={{
                py: 1,
                '& .MuiAccordionSummary-content': { my: 2 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '1.063rem',
                  fontWeight: 600,
                  color: 'var(--lp-text)',
                }}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.938rem',
                  color: 'var(--lp-text-muted)',
                  lineHeight: 1.7,
                  pb: 2,
                }}
              >
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </SectionWrapper>
  );
};

export default Faq;
