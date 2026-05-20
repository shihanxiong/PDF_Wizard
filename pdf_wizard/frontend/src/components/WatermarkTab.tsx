import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { NoPDFSelected } from './NoPDFSelected';
import { WatermarkTextConfig } from './watermark/WatermarkTextConfig';
import { WatermarkLayoutConfig } from './watermark/WatermarkLayoutConfig';
import { WatermarkPageRange, validatePageRange } from './watermark/WatermarkPageRange';
import { SelectPDFFile, GetPDFMetadata, SelectOutputDirectory, ApplyWatermark } from '../../wailsjs/go/main/App';
import { SelectedPDF } from '../types';
import { formatFileSize, formatDate } from '../utils/formatters';
import { models } from '../../wailsjs/go/models';
import { useI18n } from '../utils/i18n';

interface WatermarkTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const WatermarkTab = ({ onFileDrop }: WatermarkTabProps) => {
  const { t } = useI18n();
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState<number>(24);
  const [fontSizeInput, setFontSizeInput] = useState<string>('24');
  const [fontColor, setFontColor] = useState<string>('#808080');
  const [opacity, setOpacity] = useState<number>(0.5);
  const [opacityInput, setOpacityInput] = useState<string>('50');
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<string>('center');
  const [fontFamily, setFontFamily] = useState<string>('Helvetica');
  const [pageRangeType, setPageRangeType] = useState<'all' | 'specific'>('all');
  const [pageRange, setPageRange] = useState<string>('');
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('watermarked');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        const path = pdfPaths[0];
        const metadata = await GetPDFMetadata(path);
        setSelectedPDF({
          path: metadata.path,
          name: metadata.name,
          size: metadata.size,
          lastModified: new Date(metadata.lastModified),
          totalPages: metadata.totalPages,
        });
        setError(null);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error occurred';
        setError(`${t('failedToLoadPDFWatermark')} ${errorMessage}`);
      }
    },
    [t]
  );

  useEffect(() => {
    onFileDrop(handleDroppedPDF);
  }, [onFileDrop, handleDroppedPDF]);

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile(
        new models.FileDialogLabels({
          title: t('selectPDFFileWatermark'),
          filterDisplayName: t('fileDialogFilterPdfFiles'),
        }),
      );
      if (path) {
        const metadata = await GetPDFMetadata(path);
        setSelectedPDF({
          path: metadata.path,
          name: metadata.name,
          size: metadata.size,
          lastModified: new Date(metadata.lastModified),
          totalPages: metadata.totalPages,
        });
        setError(null);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error occurred';
      setError(`${t('failedToSelectPDFWatermark')} ${errorMessage}`);
    }
  };

  const handleSelectOutputDirectory = async () => {
    try {
      const dir = await SelectOutputDirectory(
        new models.FileDialogLabels({ title: t('selectOutputDirectoryWatermark'), filterDisplayName: '' }),
      );
      if (dir) {
        setOutputDirectory(dir);
        setError(null);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error occurred';
      setError(`${t('failedToSelectOutputDirectoryWatermark')} ${errorMessage}`);
    }
  };

  const handleApplyWatermark = async () => {
    if (!selectedPDF || !outputDirectory || !outputFilename.trim()) return;

    if (!watermarkText.trim()) {
      setError('Watermark text cannot be empty');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const watermark = models.WatermarkDefinition.createFrom({
        textConfig: {
          text: watermarkText.trim(),
          fontSize: fontSize,
          fontColor: fontColor,
          opacity: opacity,
          rotation: rotation,
          position: position,
          fontFamily: fontFamily,
        },
        pageRange: pageRangeType === 'all' ? 'all' : pageRange.trim(),
      });

      await ApplyWatermark(selectedPDF.path, watermark, outputDirectory, outputFilename.trim());
      setSuccess(`${t('watermarkAppliedSuccessfully')} ${outputDirectory}/${outputFilename.trim()}.pdf`);
      setSelectedPDF(null);
      setOutputFilename('watermarked');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : String(err) || 'Unknown error occurred';
      setError(`${t('watermarkFailed')} ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFontSizeInputChange = (value: string) => {
    setFontSizeInput(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 12 && numValue <= 72) {
      setFontSize(numValue);
    }
  };

  const handleFontSizeBlur = () => {
    const numValue = parseInt(fontSizeInput);
    if (isNaN(numValue) || numValue < 12 || numValue > 72) {
      setFontSizeInput(fontSize.toString());
    }
  };

  const handleOpacityInputChange = (value: string) => {
    setOpacityInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setOpacity(numValue / 100);
    }
  };

  const handleOpacityBlur = () => {
    const numValue = parseFloat(opacityInput);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      setOpacityInput(Math.round(opacity * 100).toString());
    }
  };

  const isFontSizeValid = (() => {
    const numValue = parseInt(fontSizeInput);
    return !isNaN(numValue) && numValue >= 12 && numValue <= 72;
  })();

  const isOpacityValid = (() => {
    const numValue = parseFloat(opacityInput);
    return !isNaN(numValue) && numValue >= 0 && numValue <= 100;
  })();

  const pageRangeValidation =
    selectedPDF && pageRangeType === 'specific'
      ? validatePageRange(pageRange, selectedPDF.totalPages)
      : { isValid: true, error: '' };

  const isPageRangeValid = pageRangeType === 'all' || pageRangeValidation.isValid;

  const canApplyWatermark =
    selectedPDF !== null &&
    watermarkText.trim().length > 0 &&
    isFontSizeValid &&
    isOpacityValid &&
    outputDirectory.length > 0 &&
    outputFilename.trim().length > 0 &&
    isPageRangeValid &&
    !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      {/* PDF Selection Section */}
      <Box sx={{ mb: 1, flexShrink: 0 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        >
          {t('selectPDFFileWatermark')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
      </Box>

      {/* Error/Success Messages */}
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

      {/* Selected PDF Information */}
      {selectedPDF && (
        <Card sx={{ mb: 3, flexShrink: 0 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
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
      )}

      {/* Watermark Configuration - Scrollable Area */}
      {selectedPDF ? (
        <Box sx={{ flex: 1, overflow: 'auto', mb: 3 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <WatermarkTextConfig
                  watermarkText={watermarkText}
                  onWatermarkTextChange={setWatermarkText}
                  fontSizeInput={fontSizeInput}
                  onFontSizeInputChange={handleFontSizeInputChange}
                  fontSize={fontSize}
                  onFontSizeBlur={handleFontSizeBlur}
                  fontColor={fontColor}
                  onFontColorChange={setFontColor}
                  opacityInput={opacityInput}
                  onOpacityInputChange={handleOpacityInputChange}
                  onOpacityBlur={handleOpacityBlur}
                  isProcessing={isProcessing}
                />

                <WatermarkLayoutConfig
                  rotation={rotation}
                  onRotationChange={setRotation}
                  position={position}
                  onPositionChange={setPosition}
                  fontFamily={fontFamily}
                  onFontFamilyChange={setFontFamily}
                  isProcessing={isProcessing}
                />

                <WatermarkPageRange
                  pageRangeType={pageRangeType}
                  onPageRangeTypeChange={setPageRangeType}
                  pageRange={pageRange}
                  onPageRangeChange={setPageRange}
                  totalPages={selectedPDF.totalPages}
                  isProcessing={isProcessing}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <NoPDFSelected />
      )}

      {/* Output Configuration Section */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={handleSelectOutputDirectory}
            sx={{ mb: 1 }}
            disabled={isProcessing}
          >
            {t('selectOutputDirectoryWatermark')}
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
            placeholder="watermarked"
            sx={{ width: '200px' }}
            disabled={isProcessing}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleApplyWatermark}
          disabled={!canApplyWatermark}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? t('applying') : t('applyWatermark')}
        </Button>
      </Box>
    </Box>
  );
};
