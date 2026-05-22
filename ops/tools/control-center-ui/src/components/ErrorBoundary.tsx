import { Component } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ErrorOutlined } from '@mui/icons-material';
import { brand } from '../theme';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: brand.neutral[900], p: 3 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 480 }}>
            <ErrorOutlined sx={{ fontSize: 48, color: brand.error.main, mb: 2 }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: brand.neutral[50], mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography sx={{ color: brand.neutral[400], fontSize: '0.85rem', mb: 3 }}>
              {this.state.error.message}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => this.setState({ error: null })}
              sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none', color: brand.neutral[50], borderColor: brand.neutral[600] }}
            >
              Retry
            </Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}
