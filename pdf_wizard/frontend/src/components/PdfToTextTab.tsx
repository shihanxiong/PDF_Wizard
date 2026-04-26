import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { SelectedPDF } from '../types';
import { formatDate, formatFileSize } from '../utils/formatters';
import { useI18n } from '../utils/i18n';
import { models } from '../../wailsjs/go/models';
import { ExtractPDFText, GetPDFMetadata, SelectPDFFile } from '../../wailsjs/go/main/App';
import { NoPDFSelected } from './NoPDFSelected';

interface PdfToTextTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const PdfToTextTab = ({ onFileDrop }: PdfToTextTabProps) => {
  const { t } = useI18n();
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadPDF = useCallback(async (path: string) => {
    setExtractedText('');
    setInfo(null);
    const metadata = await GetPDFMetadata(path);
    setSelectedPDF({
      path: metadata.path,
      name: metadata.name,
      size: metadata.size,
      lastModified: new Date(metadata.lastModified),
      totalPages: metadata.totalPages,
    });
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
        setError(`${t('pdfToTextFailedToLoadPDF')} ${message}`);
      }
    },
    [loadPDF, t],
  );

  useEffect(() => {
    onFileDrop(handleDroppedPDF);
  }, [onFileDrop, handleDroppedPDF]);

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile(
        new models.FileDialogLabels({
          title: t('selectPDFFile'),
          filterDisplayName: t('fileDialogFilterPdfFiles'),
        }),
      );
      if (!path) {
        return;
      }
      await loadPDF(path);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('pdfToTextFailedToSelectPDF')} ${message}`);
    }
  };

  const handleExtract = async () => {
    if (!selectedPDF) {
      return;
    }
    setIsExtracting(true);
    setError(null);
    setInfo(null);
    try {
      const text = await ExtractPDFText(selectedPDF.path);
      setExtractedText(text);
      if (!text.trim()) {
        setInfo(t('pdfToTextEmptyResult'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('pdfToTextExtractFailed')} ${message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(extractedText);
      setInfo(t('pdfToTextCopied'));
    } catch {
      setError(t('pdfToTextCopyFailed'));
    }
  };

  const handleSelectAll = () => {
    const el = textAreaRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.select();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      <Box sx={{ mb: 1, flexShrink: 0 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isExtracting}
        >
          {t('selectPDFFile')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('pdfToTextScannedHint')}
        </Alert>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" onClose={() => setInfo(null)} sx={{ mb: 2, flexShrink: 0 }}>
          {info}
        </Alert>
      )}

      {selectedPDF ? (
        <Card sx={{ mb: 2, flexShrink: 0 }}>
          <CardContent>
            <Typography variant="subtitle1" component="div" sx={{ mb: 1, textAlign: 'center' }}>
              📄 {selectedPDF.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedPDF.path}
            </Typography>
            <Typography variant="body2">
              {formatFileSize(selectedPDF.size)} • {selectedPDF.totalPages} {t('pages')} • {t('modified')}{' '}
              {formatDate(selectedPDF.lastModified)}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <NoPDFSelected />
      )}

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexShrink: 0, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleExtract}
          disabled={!selectedPDF || isExtracting}
          startIcon={isExtracting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isExtracting ? t('pdfToTextExtracting') : t('pdfToTextExtract')}
        </Button>
        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={!extractedText}>
          {t('pdfToTextCopy')}
        </Button>
        <Button variant="outlined" startIcon={<SelectAllIcon />} onClick={handleSelectAll} disabled={!extractedText}>
          {t('pdfToTextSelectAll')}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, pb: 2, marginBottom: '20px' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('pdfToTextOutputLabel')}
        </Typography>
        <Box
          sx={{
            height: 'calc(100% - 28px)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            backgroundColor: 'background.paper',
            p: 1.5,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <Box
            component="textarea"
            ref={textAreaRef}
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            aria-label={t('pdfToTextAriaLabel')}
            sx={{
              width: '100%',
              height: '100%',
              border: 0,
              outline: 0,
              resize: 'none',
              overflow: 'auto',
              backgroundColor: 'transparent',
              color: 'text.primary',
              font: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              pb: 1,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
