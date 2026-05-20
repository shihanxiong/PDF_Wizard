import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Card,
  CardContent,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SelectPDFFile, GetPDFMetadata, RotatePDF } from '../../wailsjs/go/main/App';
import { SelectedPDF, RotateDefinition } from '../types';
import { models } from '../../wailsjs/go/models';
import { useI18n } from '../utils/i18n';
import { MAX_ROTATIONS } from '../utils/constants';
import { usePDFDrop } from '../hooks/usePDFDrop';
import { useOutputDirectory } from '../hooks/useOutputDirectory';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { getErrorMessage } from '../utils/errors';
import { PdfOperationTabShell } from './PdfOperationTabShell';

interface RotateTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const RotateTab = ({ onFileDrop }: RotateTabProps) => {
  const { t } = useI18n();
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [rotations, setRotations] = useState<RotateDefinition[]>([]);
  const [outputFilename, setOutputFilename] = useState<string>('rotated');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { handlePDFDrop } = usePDFDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory(
    'failedToSelectOutputDirectoryRotate',
    'selectOutputDirectoryRotate',
  );
  const { error, setError, handleError } = useErrorHandler();

  useEffect(() => {
    const handleDroppedPDF = (paths: string[]) => {
      handlePDFDrop(paths, {
        allowMultiple: false,
        onSuccess: (pdf) => {
          setSelectedPDF(pdf as SelectedPDF);
          setRotations([]);
          setError(null);
        },
        onError: (errorMsg) => {
          setError(`${t('failedToLoadPDFRotate')} ${errorMsg}`);
        },
      });
    };
    onFileDrop(handleDroppedPDF);
  }, [t, handlePDFDrop, onFileDrop, setError]);

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile(
        new models.FileDialogLabels({
          title: t('selectPDFFile'),
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
        setRotations([]);
        setError(null);
      }
    } catch (err: unknown) {
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
      rotation: 90,
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
      setSelectedPDF(null);
      setRotations([]);
      setOutputFilename('rotated');
    } catch (err: unknown) {
      setError(`${t('rotateFailed')} ${getErrorMessage(err)}`);
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
    <PdfOperationTabShell
      selectedPDF={selectedPDF}
      onSelectPDF={handleSelectPDF}
      onFileDrop={onFileDrop}
      error={error}
      onClearError={() => setError(null)}
      success={success}
      onClearSuccess={() => setSuccess(null)}
      isProcessing={isProcessing}
      outputDirectory={outputDirectory}
      onSelectOutputDirectory={selectDirectory}
      outputFilename={outputFilename}
      onOutputFilenameChange={setOutputFilename}
      actionLabel={t('rotatePDF')}
      actionLoadingLabel={t('rotating')}
      canExecute={canRotate}
      onExecute={handleRotate}
      outputDirectoryLabel="selectOutputDirectoryRotate"
      filenamePlaceholder="rotated"
    >
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
                        inputProps={{ min: 1, max: selectedPDF!.totalPages }}
                        size="small"
                        error={!isValid && (rotation.startPage < 1 || rotation.startPage > selectedPDF!.totalPages)}
                        disabled={isProcessing}
                        sx={{ width: '120px' }}
                      />
                      <TextField
                        label={t('endPage')}
                        type="number"
                        value={rotation.endPage}
                        onChange={(e) => handleUpdateRotate(rotation.id, 'endPage', parseInt(e.target.value) || 1)}
                        inputProps={{ min: rotation.startPage, max: selectedPDF!.totalPages }}
                        size="small"
                        error={
                          !isValid &&
                          (rotation.endPage < rotation.startPage || rotation.endPage > selectedPDF!.totalPages)
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
    </PdfOperationTabShell>
  );
};
