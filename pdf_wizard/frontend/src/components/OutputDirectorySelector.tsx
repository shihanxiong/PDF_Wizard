import { Box, Button, Typography } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { t, type Translations } from '../utils/i18n';

interface OutputDirectorySelectorProps {
  directory: string;
  onSelect: () => void;
  labelKey: keyof Translations;
  disabled?: boolean;
}

/**
 * Shared component for output directory selection with display
 */
export const OutputDirectorySelector = ({ directory, onSelect, labelKey, disabled }: OutputDirectorySelectorProps) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Button variant="outlined" startIcon={<FolderIcon />} onClick={onSelect} sx={{ mb: 1 }} disabled={disabled}>
        {t(labelKey)}
      </Button>
      {directory && (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          {directory}
        </Typography>
      )}
    </Box>
  );
};
