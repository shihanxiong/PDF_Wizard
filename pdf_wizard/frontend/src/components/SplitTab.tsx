import { Box, Typography, Paper } from '@mui/material';

export const SplitTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Split PDFs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          This feature will be implemented in a future phase.
        </Typography>
      </Paper>
    </Box>
  );
};

