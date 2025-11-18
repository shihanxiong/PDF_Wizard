import { Box, TextField, Typography } from '@mui/material';
import { t } from '../utils/i18n';

interface FilenameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Shared component for filename input with .pdf extension display
 */
export const FilenameInput = ({ value, onChange, placeholder, disabled }: FilenameInputProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography variant="body2">{t('outputFilename')}</Typography>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        placeholder={placeholder}
        sx={{ width: '200px' }}
        disabled={disabled}
      />
      <Typography variant="body2">.pdf</Typography>
    </Box>
  );
};

