import { Box, Paper, Typography } from '@mui/material';
import { useI18n } from '../utils/i18n';

/**
 * Shared component for displaying "No PDF selected" empty state
 */
export const NoPDFSelected = () => {
  const { t } = useI18n();
  return (
    <Paper
      sx={{
        flex: 1,
        overflow: 'auto',
        mb: 3,
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>{t('noFilesSelected')}</Typography>
      </Box>
    </Paper>
  );
};
