import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, TextField, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { SelectedPDF } from '../types';
import { formatDate, formatFileSize } from '../utils/formatters';
import { useI18n } from '../utils/i18n';
import { isPDFError, PDFErrorCode } from '../utils/pdfErrors';
import { models } from '../../wailsjs/go/models';
import { GetFileMetadata, GetPDFMetadata, LockPDF, SelectOutputDirectory, SelectPDFFile, UnlockPDF } from '../../wailsjs/go/main/App';
import { NoPDFSelected } from './NoPDFSelected';

interface LockUnlockTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

type Mode = 'lock' | 'unlock';

function parentDirectory(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  if (i <= 0) {
    return '';
  }
  return filePath.slice(0, i);
}

export const LockUnlockTab = ({ onFileDrop }: LockUnlockTabProps) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('lock');
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [password, setPassword] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [outputFilename, setOutputFilename] = useState('locked');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const defaultFilename = mode === 'lock' ? 'locked' : 'unlocked';

  useEffect(() => {
    setOutputFilename(defaultFilename);
  }, [defaultFilename]);

  /** Try opening the PDF without a password: encrypted → unlock mode; readable → lock mode. */
  const loadPDF = useCallback(async (path: string) => {
    setPassword('');
    try {
      const metadata = await GetPDFMetadata(path);
      setMode('lock');
      setSelectedPDF({
        path: metadata.path,
        name: metadata.name,
        size: metadata.size,
        lastModified: new Date(metadata.lastModified),
        totalPages: metadata.totalPages,
      });
    } catch (err: unknown) {
      if (!isPDFError(err, PDFErrorCode.PASSWORD_REQUIRED)) {
        // Legacy fallback: if the error is not a structured PDFError,
        // check for password/encrypt substrings for backward compatibility.
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (!msg.includes('password') && !msg.includes('encrypt')) {
          throw err;
        }
      }
      setMode('unlock');
      const metadata = await GetFileMetadata(path);
      setSelectedPDF({
        path: metadata.path,
        name: metadata.name,
        size: metadata.size,
        lastModified: new Date(metadata.lastModified),
        totalPages: 0,
      });
    }
    const outDir = parentDirectory(path);
    if (outDir) {
      setOutputDirectory(outDir);
    }
    setError(null);
  }, []);

  const handleDroppedPDF = useCallback(
    async (paths: string[]) => {
      const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));
      if (pdfPaths.length === 0) {
        setError(t('noPDFFilesFound'));
        return;
      }
      if (pdfPaths.length > 1) {
        setError(t('pleaseDropOnlyOnePDF'));
        return;
      }
      try {
        await loadPDF(pdfPaths[0]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
        setError(`${t('lockUnlockFailedToLoadPDF')} ${message}`);
      }
    },
    [loadPDF, t]
  );

  useEffect(() => {
    onFileDrop(handleDroppedPDF);
  }, [onFileDrop, handleDroppedPDF]);

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile(
        new models.FileDialogLabels({
          title: t('lockUnlockSelectPDF'),
          filterDisplayName: t('fileDialogFilterPdfFiles'),
        }),
      );
      if (!path) {
        return;
      }
      await loadPDF(path);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('lockUnlockFailedToSelectPDF')} ${message}`);
    }
  };

  const handleSelectOutputDirectory = async () => {
    try {
      const dir = await SelectOutputDirectory(
        new models.FileDialogLabels({ title: t('lockUnlockSelectOutputDirectory'), filterDisplayName: '' }),
      );
      if (!dir) {
        return;
      }
      setOutputDirectory(dir);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('lockUnlockFailedToSelectOutputDirectory')} ${message}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPDF || !outputDirectory || !outputFilename.trim() || !password.trim()) {
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'lock') {
        await LockPDF(selectedPDF.path, password, outputDirectory, outputFilename.trim());
      } else {
        await UnlockPDF(selectedPDF.path, password, outputDirectory, outputFilename.trim());
      }
      setSuccess(`${t(mode === 'lock' ? 'lockUnlockSuccessLocked' : 'lockUnlockSuccessUnlocked')} ${outputDirectory}/${outputFilename.trim()}.pdf`);
      setSelectedPDF(null);
      setPassword('');
      setOutputFilename(defaultFilename);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t(mode === 'lock' ? 'lockUnlockLockFailed' : 'lockUnlockUnlockFailed')} ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit =
    selectedPDF !== null &&
    password.trim().length > 0 &&
    outputDirectory.length > 0 &&
    outputFilename.trim().length > 0 &&
    !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      <Box sx={{ mb: 1, flexShrink: 0 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        >
          {t('lockUnlockSelectPDF')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2, flexShrink: 0 }}>
          {success}
        </Alert>
      )}

      {selectedPDF ? (
        <Card sx={{ mb: 2, flexShrink: 0 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
                flexWrap: 'wrap',
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle1" component="span" sx={{ minWidth: 0 }}>
                📄 {selectedPDF.name}
              </Typography>
              <Chip
                size="small"
                label={mode === 'unlock' ? t('lockUnlockStatusLocked') : t('lockUnlockStatusUnlocked')}
                color={mode === 'unlock' ? 'warning' : 'success'}
                variant="filled"
                sx={{ fontWeight: 600, flexShrink: 0 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedPDF.path}
            </Typography>
            <Typography variant="body2">
              {formatFileSize(selectedPDF.size)}
              {selectedPDF.totalPages > 0 ? ` • ${selectedPDF.totalPages} ${t('pages')}` : ''} • {t('modified')}{' '}
              {formatDate(selectedPDF.lastModified)}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <NoPDFSelected />
      )}

      <Box sx={{ mt: 'auto', pt: 2, pb: 2, flexShrink: 0 }}>
        <TextField
          label={t('lockUnlockPassword')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          disabled={isProcessing}
        />
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={handleSelectOutputDirectory}
            sx={{ mb: 1 }}
            disabled={isProcessing}
          >
            {t('lockUnlockSelectOutputDirectory')}
          </Button>
          {outputDirectory && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {outputDirectory}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2">{t('outputFilename')}</Typography>
          <TextField
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            size="small"
            sx={{ width: '220px' }}
            disabled={isProcessing}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>
        {selectedPDF && !outputDirectory && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('lockUnlockSelectOutputDirectory')}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing
            ? t(mode === 'lock' ? 'lockUnlockLocking' : 'lockUnlockUnlocking')
            : t(mode === 'lock' ? 'lockUnlockActionLock' : 'lockUnlockActionUnlock')}
        </Button>
      </Box>
    </Box>
  );
};
