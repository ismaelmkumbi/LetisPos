import { Component, type ReactNode } from 'react';
import { Box, Button, Typography, Alert, AlertTitle } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  retryCount: number;
}

const CHUNK_FAILED = 'Failed to fetch dynamically imported module';

export default class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Auto-retry once — network blips can also cause this
    if (error.message.includes(CHUNK_FAILED) && this.state.retryCount < 1) {
      this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }));
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isChunkError = this.state.error.message.includes(CHUNK_FAILED);

    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        px={3}
      >
        <Alert severity={isChunkError ? 'info' : 'error'} sx={{ maxWidth: 520, mb: 2 }}>
          <AlertTitle>
            {isChunkError ? 'New version available' : 'Something went wrong'}
          </AlertTitle>
          {isChunkError
            ? 'A new version of LetisPos has been deployed. Please refresh the page to continue.'
            : 'An unexpected error occurred while loading this page.'}
        </Alert>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={this.handleRefresh}
          size="large"
        >
          Refresh Page
        </Button>
        {!isChunkError && (
          <Typography variant="caption" color="text.secondary" mt={2}>
            {this.state.error.message}
          </Typography>
        )}
      </Box>
    );
  }
}
