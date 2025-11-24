import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SelectPDFFile, GetPDFMetadata, RotatePDF } from '../../wailsjs/go/main/App';
import { SelectedPDF, RotateDefinition } from '../types';
import { models } from '../../wailsjs/go/models';
import { t } from '../utils/i18n';
import { MAX_ROTATIONS } from '../utils/constants';
import { usePDFDrop } from '../hooks/usePDFDrop';
import { useOutputDirectory } from '../hooks/useOutputDirectory';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { PDFInfoCard } from './PDFInfoCard';
import { FilenameInput } from './FilenameInput';
import { OutputDirectorySelector } from './OutputDirectorySelector';
import { NoPDFSelected } from './NoPDFSelected';

interface RotateTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const RotateTab = ({ onFileDrop }: RotateTabProps) => {
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [rotations, setRotations] = useState<RotateDefinition[]>([]);
  const [outputFilename, setOutputFilename] = useState<string>('rotated');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { handlePDFDrop } = usePDFDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory('failedToSelectOutputDirectoryRotate');
  const { error, setError, handleError } = useErrorHandler();

  // Register drag and drop handler with App component
  useEffect(() => {
    const handleDroppedPDF = (paths: string[]) => {
      handlePDFDrop(paths, {
        allowMultiple: false,
        onSuccess: (pdf) => {
          setSelectedPDF(pdf as SelectedPDF);
          setRotations([]); // Clear existing rotations when new PDF is selected
          setError(null);
        },
        onError: (errorMsg) => {
          setError(`${t('failedToLoadPDFRotate')} ${errorMsg}`);
        },
      });
    };
    onFileDrop(handleDroppedPDF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Clear existing rotations when new PDF is selected
        setRotations([]);
        setError(null);
      }
    } catch (err) {
      handleError(err, 'failedToSelectPDFRotate');
    }
  };

  const handleAddRotate = () => {
    if (rotations.length >= MAX_ROTATIONS || !selectedPDF) return;

    const rotationNumber = rotations.length + 1;
    const lastEndPage = rotations.length > 0 ? rotations[rotations.length - 1].endPage : 0;

    const newRotation: RotateDefinition = {
      id: `rotate-${Date.now()}-${rotationNumber}`,
      startPage: Math.min(lastEndPage + 1, selectedPDF.totalPages),
      endPage: Math.min(lastEndPage + 10, selectedPDF.totalPages),
      rotation: 90, // Default to +90 degrees
    };

    setRotations((prev) => [...prev, newRotation]);
  };

  const handleRemoveRotate = (id: string) => {
    setRotations((prev) => prev.filter((rotation) => rotation.id !== id));
  };

  const handleUpdateRotate = (id: string, field: keyof RotateDefinition, value: string | number) => {
    setRotations((prev) => prev.map((rotation) => (rotation.id === id ? { ...rotation, [field]: value } : rotation)));
  };

  const validateRotate = (rotation: RotateDefinition): boolean => {
    if (!selectedPDF) return false;
    return (
      rotation.startPage >= 1 &&
      rotation.startPage <= selectedPDF.totalPages &&
      rotation.endPage >= rotation.startPage &&
      rotation.endPage <= selectedPDF.totalPages &&
      (rotation.rotation === 90 || rotation.rotation === -90 || rotation.rotation === 180)
    );
  };

  const handleRotate = async () => {
    if (!selectedPDF || rotations.length === 0 || !outputDirectory || !outputFilename.trim()) return;

    // Validate all rotations
    const invalidRotations = rotations.filter((rotation) => !validateRotate(rotation));
    if (invalidRotations.length > 0) {
      setError(t('pleaseFixInvalidRotations'));
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const rotateDefinitions: models.RotateDefinition[] = rotations.map((rotation) => ({
        startPage: rotation.startPage,
        endPage: rotation.endPage,
        rotation: rotation.rotation,
      }));

      await RotatePDF(selectedPDF.path, rotateDefinitions, outputDirectory, outputFilename.trim());
      setSuccess(`${t('pdfRotatedSuccessfully')} ${outputDirectory}/${outputFilename.trim()}.pdf`);
      // Clear selected PDF, rotations, and reset filename after successful rotation
      setSelectedPDF(null);
      setRotations([]);
      setOutputFilename('rotated');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : err?.toString() || 'Unknown error occurred';
      setError(`${t('rotateFailed')} ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canAddRotate = rotations.length < MAX_ROTATIONS && selectedPDF !== null && !isProcessing;
  const canRotate =
    selectedPDF !== null &&
    rotations.length > 0 &&
    outputDirectory.length > 0 &&
    outputFilename.trim().length > 0 &&
    rotations.every(validateRotate) &&
    !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      {/* PDF Selection Section */}
      <Box sx={{ mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        >
          {t('selectPDFFile')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Selected PDF Information */}
      {selectedPDF ? (
        <>
          <PDFInfoCard pdf={selectedPDF} />

          {/* Add Rotate Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Button onClick={handleAddRotate} disabled={!canAddRotate} startIcon={<AddIcon />} variant="outlined">
              {t('addRotate')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {rotations.length} / {MAX_ROTATIONS} {t('rotations')}
            </Typography>
          </Box>

          {/* Rotation Definitions List */}
          <Paper
            sx={{
              flex: 1,
              overflow: 'auto',
              mb: 3,
              minHeight: 200,
              p: 2,
            }}
          >
            {rotations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>{t('noRotationsDefined')}</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {rotations.map((rotation, index) => {
                  const isValid = validateRotate(rotation);
                  const pageCount = rotation.endPage - rotation.startPage + 1;
                  const rotationLabel =
                    rotation.rotation === 90
                      ? t('clockwise')
                      : rotation.rotation === -90
                      ? t('counterClockwise')
                      : t('upsideDown');

                  return (
                    <Card
                      key={rotation.id}
                      sx={{
                        border: isValid ? '1px solid' : '2px solid',
                        borderColor: isValid ? 'divider' : 'error.main',
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                          }}
                        >
                          <Typography variant="subtitle1">
                            {t('rotation')} {index + 1}
                          </Typography>
                          <IconButton
                            onClick={() => handleRemoveRotate(rotation.id)}
                            size="small"
                            disabled={isProcessing}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <TextField
                            label={t('startPage')}
                            type="number"
                            value={rotation.startPage}
                            onChange={(e) =>
                              handleUpdateRotate(rotation.id, 'startPage', parseInt(e.target.value) || 1)
                            }
                            inputProps={{ min: 1, max: selectedPDF.totalPages }}
                            size="small"
                            error={!isValid && (rotation.startPage < 1 || rotation.startPage > selectedPDF.totalPages)}
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <TextField
                            label={t('endPage')}
                            type="number"
                            value={rotation.endPage}
                            onChange={(e) => handleUpdateRotate(rotation.id, 'endPage', parseInt(e.target.value) || 1)}
                            inputProps={{ min: rotation.startPage, max: selectedPDF.totalPages }}
                            size="small"
                            error={
                              !isValid &&
                              (rotation.endPage < rotation.startPage || rotation.endPage > selectedPDF.totalPages)
                            }
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>{t('rotationLabel')}</InputLabel>
                            <Select
                              value={rotation.rotation}
                              label={t('rotationLabel')}
                              onChange={(e) => handleUpdateRotate(rotation.id, 'rotation', Number(e.target.value))}
                              disabled={isProcessing}
                            >
                              <MenuItem value={90}>{t('clockwise')}</MenuItem>
                              <MenuItem value={-90}>{t('counterClockwise')}</MenuItem>
                              <MenuItem value={180}>{t('upsideDown')}</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {t('pages')} {rotation.startPage}-{rotation.endPage} ({pageCount}{' '}
                          {pageCount === 1 ? t('page') : t('pages')}) • {rotationLabel}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Paper>
        </>
      ) : (
        <NoPDFSelected />
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
        <OutputDirectorySelector
          directory={outputDirectory}
          onSelect={selectDirectory}
          labelKey="selectOutputDirectoryRotate"
          disabled={isProcessing}
        />

        <FilenameInput
          value={outputFilename}
          onChange={setOutputFilename}
          placeholder="rotated"
          disabled={isProcessing}
        />

        <Button
          variant="contained"
          onClick={handleRotate}
          disabled={!canRotate}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? t('rotating') : t('rotatePDF')}
        </Button>
      </Box>
    </Box>
  );
};
