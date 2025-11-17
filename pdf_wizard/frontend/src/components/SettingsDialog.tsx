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
} from '@mui/material';
import { GetLanguage, SetLanguage } from '../../wailsjs/go/main/App';
import { t, setLanguage, getLanguage, getNativeLanguageName, type Language } from '../utils/i18n';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onLanguageChange: (language: Language) => void;
}

export const SettingsDialog = ({ open, onClose, onLanguageChange }: SettingsDialogProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(false);

  // Load current language setting when dialog opens
  useEffect(() => {
    if (open) {
      loadLanguage();
    }
  }, [open]);

  const loadLanguage = async () => {
    try {
      const lang = await GetLanguage();
      // Validate language code and default to 'en' if invalid
      const validLanguages: Language[] = ['en', 'zh', 'zh-TW', 'ar', 'fr', 'ja', 'hi', 'es', 'pt', 'ru', 'ko', 'de'];
      const language = (validLanguages.includes(lang as Language) ? lang : 'en') as Language;
      setSelectedLanguage(language);
    } catch (err) {
      console.error('Failed to load language:', err);
    }
  };

  const handleLanguageChange = async (event: any) => {
    const newLanguage = event.target.value as Language;
    setSelectedLanguage(newLanguage);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await SetLanguage(selectedLanguage);
      setLanguage(selectedLanguage);
      onLanguageChange(selectedLanguage);
      onClose();
    } catch (err) {
      console.error('Failed to save language:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to current language
    loadLanguage();
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
              <MenuItem value="en">{getNativeLanguageName('en')}</MenuItem>
              <MenuItem value="zh">{getNativeLanguageName('zh')}</MenuItem>
              <MenuItem value="zh-TW">{getNativeLanguageName('zh-TW')}</MenuItem>
              <MenuItem value="ar">{getNativeLanguageName('ar')}</MenuItem>
              <MenuItem value="fr">{getNativeLanguageName('fr')}</MenuItem>
              <MenuItem value="ja">{getNativeLanguageName('ja')}</MenuItem>
              <MenuItem value="hi">{getNativeLanguageName('hi')}</MenuItem>
              <MenuItem value="es">{getNativeLanguageName('es')}</MenuItem>
              <MenuItem value="pt">{getNativeLanguageName('pt')}</MenuItem>
              <MenuItem value="ru">{getNativeLanguageName('ru')}</MenuItem>
              <MenuItem value="ko">{getNativeLanguageName('ko')}</MenuItem>
              <MenuItem value="de">{getNativeLanguageName('de')}</MenuItem>
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
