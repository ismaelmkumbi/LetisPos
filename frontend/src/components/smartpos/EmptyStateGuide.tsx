import { Box, Button, Paper, Typography } from '@mui/material';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface EmptyStateGuideProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: { label: string; to?: string; onClick?: () => void };
  onboardingStep?: string;
}

export default function EmptyStateGuide({
  title,
  subtitle,
  icon,
  action,
  onboardingStep,
}: EmptyStateGuideProps) {
  return (
    <Paper
      sx={{
        p: { xs: 4, md: 6 },
        textAlign: 'center',
        borderRadius: '16px',
        border: `1px dashed ${brand.neutral[300]}`,
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ color: brand.primary[600], mb: 2 }}>{icon}</Box>
      {onboardingStep && (
        <Typography
          sx={{
            display: 'inline-block',
            px: 1.5,
            py: 0.5,
            borderRadius: '6px',
            bgcolor: brand.primary[50],
            color: brand.primary[700],
            fontSize: 12,
            fontWeight: 700,
            mb: 2,
          }}
        >
          {onboardingStep}
        </Typography>
      )}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ color: brand.neutral[500], maxWidth: 400, mx: 'auto', mb: 3 }}>
        {subtitle}
      </Typography>
      {action && (
        <Button
          component={action.to ? Link : 'button'}
          to={action.to}
          onClick={action.onClick}
          variant="contained"
          sx={{
            borderRadius: '8px',
            fontWeight: 700,
            textTransform: 'none',
            background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
          }}
        >
          {action.label}
        </Button>
      )}
    </Paper>
  );
}
