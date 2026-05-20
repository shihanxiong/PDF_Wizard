import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  SelectChangeEvent,
} from '@mui/material';
import { useI18n, getNativeLanguageName, type Language } from '../utils/i18n';
import { SUPPORTED_LANGUAGES } from '../utils/i18n/constants';
import { usePersistedLanguage } from '../hooks/usePersistedLanguage';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { t } = useI18n();
  const { language, saveLanguage } = usePersistedLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedLanguage(language);
    }
  }, [open, language]);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = event.target.value as Language;
    setSelectedLanguage(newLanguage);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveLanguage(selectedLanguage);
      onClose();
    } catch (err) {
      console.error('Failed to save language:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedLanguage(language);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('settings')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="language-select-label">{t('language')}</InputLabel>
            <Select
              labelId="language-select-label"
              id="language-select"
              value={selectedLanguage}
              label={t('language')}
              onChange={handleLanguageChange}
              disabled={loading}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {getNativeLanguageName(lang)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
