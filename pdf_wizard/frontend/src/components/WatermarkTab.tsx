import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { SelectPDFFile, GetPDFMetadata, SelectOutputDirectory, ApplyWatermark } from '../../wailsjs/go/main/App';
import { SelectedPDF } from '../types';
import { formatFileSize, formatDate } from '../utils/formatters';
import { models } from '../../wailsjs/go/models';
import { t } from '../utils/i18n';

interface WatermarkTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const WatermarkTab = ({ onFileDrop }: WatermarkTabProps) => {
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

  // Register drag and drop handler with App component
  useEffect(() => {
    onFileDrop(handleDroppedPDF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDroppedPDF = async (paths: string[]) => {
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
  };

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile();
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
      const dir = await SelectOutputDirectory();
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
      // Clear selected PDF and reset filename after successful watermark
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

  const isFontSizeValid = (() => {
    const numValue = parseInt(fontSizeInput);
    return !isNaN(numValue) && numValue >= 12 && numValue <= 72;
  })();

  const isOpacityValid = (() => {
    const numValue = parseFloat(opacityInput);
    return !isNaN(numValue) && numValue >= 0 && numValue <= 100;
  })();

  // Validate page range format and page numbers
  const validatePageRange = (range: string, totalPages: number): { isValid: boolean; error: string } => {
    if (range.trim() === '') {
      return { isValid: false, error: 'Page range cannot be empty' };
    }

    const parts = range.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === '') {
        continue;
      }

      // Check if it's a range (contains "-")
      if (trimmed.includes('-')) {
        const rangeParts = trimmed.split('-');
        if (rangeParts.length !== 2) {
          return { isValid: false, error: `Invalid page range format: ${trimmed}` };
        }

        const startStr = rangeParts[0].trim();
        const endStr = rangeParts[1].trim();

        if (startStr === '') {
          return { isValid: false, error: 'Start page cannot be empty' };
        }

        const start = parseInt(startStr, 10);
        if (isNaN(start) || start < 1 || start > totalPages) {
          return { isValid: false, error: `Start page ${startStr} is out of range (1-${totalPages})` };
        }

        if (endStr !== '') {
          const end = parseInt(endStr, 10);
          if (isNaN(end) || end < 1 || end > totalPages) {
            return { isValid: false, error: `End page ${endStr} is out of range (1-${totalPages})` };
          }
          if (start > end) {
            return { isValid: false, error: `Start page (${start}) must be less than or equal to end page (${end})` };
          }
        }
        // If endStr is empty, it's an open-ended range (e.g., "5-"), which is valid
      } else {
        // Single page number
        const page = parseInt(trimmed, 10);
        if (isNaN(page) || page < 1 || page > totalPages) {
          return { isValid: false, error: `Page ${trimmed} is out of range (1-${totalPages})` };
        }
      }
    }

    return { isValid: true, error: '' };
  };

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

  const positionOptions = [
    { value: 'center', label: t('positionCenter') },
    { value: 'top-left', label: t('positionTopLeft') },
    { value: 'top-center', label: t('positionTopCenter') },
    { value: 'top-right', label: t('positionTopRight') },
    { value: 'middle-left', label: t('positionMiddleLeft') },
    { value: 'middle-right', label: t('positionMiddleRight') },
    { value: 'bottom-left', label: t('positionBottomLeft') },
    { value: 'bottom-center', label: t('positionBottomCenter') },
    { value: 'bottom-right', label: t('positionBottomRight') },
  ];

  const fontFamilyOptions = [
    'Helvetica',
    'Helvetica-Bold',
    'Helvetica-Oblique',
    'Times-Roman',
    'Times-Bold',
    'Times-Italic',
    'Courier',
    'Courier-Bold',
    'Courier-Oblique',
    'Symbol',
  ];

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
            <Typography variant="h6" sx={{ mb: 1 }}>
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
      {selectedPDF && (
        <Box sx={{ flex: 1, overflow: 'auto', mb: 3 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Text Input */}
                <TextField
                  label={t('watermarkText')}
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={isProcessing}
                />

                {/* Font Size, Font Color, and Opacity in a row */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Font Size */}
                  <TextField
                    label={t('fontSize')}
                    type="number"
                    value={fontSizeInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFontSizeInput(value);
                      const numValue = parseInt(value);
                      if (!isNaN(numValue) && numValue >= 12 && numValue <= 72) {
                        setFontSize(numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const numValue = parseInt(e.target.value);
                      if (isNaN(numValue) || numValue < 12 || numValue > 72) {
                        // Reset to last valid value if invalid
                        setFontSizeInput(fontSize.toString());
                      }
                    }}
                    slotProps={{ htmlInput: { min: 12, max: 72 } }}
                    size="small"
                    sx={{ flex: 1, minWidth: 150 }}
                    disabled={isProcessing}
                    error={(() => {
                      const numValue = parseInt(fontSizeInput);
                      return fontSizeInput !== '' && (isNaN(numValue) || numValue < 12 || numValue > 72);
                    })()}
                    helperText={(() => {
                      const numValue = parseInt(fontSizeInput);
                      if (fontSizeInput === '') return '12-72 pt';
                      if (isNaN(numValue)) return 'Please enter a valid number';
                      if (numValue < 12) return 'Font size must be at least 12 pt';
                      if (numValue > 72) return 'Font size must be at most 72 pt';
                      return '12-72 pt';
                    })()}
                  />

                  {/* Font Color */}
                  <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ minWidth: 80, fontSize: '0.875rem' }}>{t('fontColor')}:</Typography>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      disabled={isProcessing}
                      style={{ width: '50px', height: '40px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                    />
                    <TextField
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      size="small"
                      sx={{ flex: 1, minWidth: 100 }}
                      disabled={isProcessing}
                      placeholder="#808080"
                    />
                  </Box>

                  {/* Opacity */}
                  <TextField
                    label={t('opacity')}
                    type="number"
                    value={opacityInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOpacityInput(value);
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        setOpacity(numValue / 100);
                      }
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
                        // Reset to last valid value if invalid
                        setOpacityInput(Math.round(opacity * 100).toString());
                      }
                    }}
                    slotProps={{
                      htmlInput: { min: 0, max: 100, step: 1 },
                      input: {
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      },
                    }}
                    size="small"
                    sx={{ flex: 1, minWidth: 150 }}
                    disabled={isProcessing}
                    error={(() => {
                      const numValue = parseFloat(opacityInput);
                      return opacityInput !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100);
                    })()}
                    helperText={(() => {
                      const numValue = parseFloat(opacityInput);
                      if (opacityInput === '') return '0-100%';
                      if (isNaN(numValue)) return 'Please enter a valid number';
                      if (numValue < 0) return 'Opacity must be at least 0%';
                      if (numValue > 100) return 'Opacity must be at most 100%';
                      return '0-100%';
                    })()}
                  />
                </Box>

                {/* Rotation, Position, and Font Family in a row */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {/* Rotation */}
                  <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
                    <InputLabel>{t('rotation')}</InputLabel>
                    <Select
                      value={rotation}
                      label={t('rotation')}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      disabled={isProcessing}
                    >
                      <MenuItem value={0}>0°</MenuItem>
                      <MenuItem value={45}>45°</MenuItem>
                      <MenuItem value={90}>90°</MenuItem>
                      <MenuItem value={-45}>-45°</MenuItem>
                      <MenuItem value={-90}>-90°</MenuItem>
                      <MenuItem value={180}>180°</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Position */}
                  <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
                    <InputLabel>{t('position')}</InputLabel>
                    <Select
                      value={position}
                      label={t('position')}
                      onChange={(e) => setPosition(e.target.value)}
                      disabled={isProcessing}
                    >
                      {positionOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Font Family */}
                  <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
                    <InputLabel>{t('fontFamily')}</InputLabel>
                    <Select
                      value={fontFamily}
                      label={t('fontFamily')}
                      onChange={(e) => setFontFamily(e.target.value)}
                      disabled={isProcessing}
                    >
                      {fontFamilyOptions.map((font) => {
                        // Map PDF font names to CSS font families and styles
                        const getFontStyle = (fontName: string) => {
                          if (fontName === 'Helvetica' || fontName === 'Times-Roman' || fontName === 'Courier') {
                            return {
                              fontFamily:
                                fontName === 'Helvetica'
                                  ? 'Helvetica, Arial, sans-serif'
                                  : fontName === 'Times-Roman'
                                  ? 'Times, "Times New Roman", serif'
                                  : 'Courier, "Courier New", monospace',
                            };
                          } else if (fontName.includes('Bold') && fontName.includes('Oblique')) {
                            return {
                              fontFamily: fontName.startsWith('Helvetica')
                                ? 'Helvetica, Arial, sans-serif'
                                : fontName.startsWith('Times')
                                ? 'Times, "Times New Roman", serif'
                                : 'Courier, "Courier New", monospace',
                              fontWeight: 'bold',
                              fontStyle: 'italic',
                            };
                          } else if (fontName.includes('Bold')) {
                            return {
                              fontFamily: fontName.startsWith('Helvetica')
                                ? 'Helvetica, Arial, sans-serif'
                                : fontName.startsWith('Times')
                                ? 'Times, "Times New Roman", serif'
                                : 'Courier, "Courier New", monospace',
                              fontWeight: 'bold',
                            };
                          } else if (fontName.includes('Oblique') || fontName.includes('Italic')) {
                            return {
                              fontFamily: fontName.startsWith('Helvetica')
                                ? 'Helvetica, Arial, sans-serif'
                                : fontName.startsWith('Times')
                                ? 'Times, "Times New Roman", serif'
                                : 'Courier, "Courier New", monospace',
                              fontStyle: 'italic',
                            };
                          } else if (fontName === 'Symbol') {
                            return {
                              fontFamily: 'Symbol, serif',
                            };
                          }
                          return {};
                        };

                        return (
                          <MenuItem key={font} value={font} sx={getFontStyle(font)}>
                            {font}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>

                {/* Page Range Selection */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap' }}>
                  <Typography variant="body2" sx={{ flexShrink: 0 }}>
                    {t('pageRange')}
                  </Typography>

                  <FormControl component="fieldset" sx={{ flexShrink: 0 }}>
                    <RadioGroup
                      row
                      value={pageRangeType}
                      onChange={(e) => setPageRangeType(e.target.value as 'all' | 'specific')}
                    >
                      <FormControlLabel value="all" control={<Radio />} label={t('allPages')} disabled={isProcessing} />
                      <FormControlLabel
                        value="specific"
                        control={<Radio />}
                        label={t('specificPages')}
                        disabled={isProcessing}
                      />
                    </RadioGroup>
                  </FormControl>

                  <Box sx={{ flex: 1, minWidth: 200, visibility: pageRangeType === 'specific' ? 'visible' : 'hidden' }}>
                    <TextField
                      label={t('pages')}
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="1,3,5-10"
                      size="small"
                      fullWidth
                      disabled={isProcessing}
                      error={!pageRangeValidation.isValid}
                      helperText={
                        !pageRangeValidation.isValid
                          ? pageRangeValidation.error
                          : `e.g., "1,3,5-10" (1-${selectedPDF?.totalPages || '?'})`
                      }
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Output Configuration Section */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          pb: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
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
