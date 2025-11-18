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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SelectPDFFile, GetPDFMetadata, SplitPDF } from '../../wailsjs/go/main/App';
import { SelectedPDF, SplitDefinition } from '../types';
import { models } from '../../wailsjs/go/models';
import { t } from '../utils/i18n';
import { MAX_SPLITS } from '../utils/constants';
import { usePDFDrop } from '../hooks/usePDFDrop';
import { useOutputDirectory } from '../hooks/useOutputDirectory';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { PDFInfoCard } from './PDFInfoCard';
import { OutputDirectorySelector } from './OutputDirectorySelector';

interface SplitTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const SplitTab = ({ onFileDrop }: SplitTabProps) => {
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [splits, setSplits] = useState<SplitDefinition[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { handlePDFDrop } = usePDFDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory('failedToSelectOutputDirectorySplit');
  const { error, setError, handleError } = useErrorHandler();

  // Register drag and drop handler with App component
  useEffect(() => {
    const handleDroppedPDF = (paths: string[]) => {
      handlePDFDrop(paths, {
        allowMultiple: false,
        onSuccess: (pdf) => {
          setSelectedPDF(pdf as SelectedPDF);
          setSplits([]); // Clear existing splits when new PDF is selected
          setError(null);
        },
        onError: (errorMsg) => {
          setError(`${t('failedToLoadPDF')} ${errorMsg}`);
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
        // Clear existing splits when new PDF is selected
        setSplits([]);
        setError(null);
      }
    } catch (err) {
      handleError(err, 'failedToSelectPDF');
    }
  };

  const handleAddSplit = () => {
    if (splits.length >= MAX_SPLITS || !selectedPDF) return;

    const splitNumber = splits.length + 1;
    const lastEndPage = splits.length > 0 ? splits[splits.length - 1].endPage : 0;

    const newSplit: SplitDefinition = {
      id: `split-${Date.now()}-${splitNumber}`,
      startPage: Math.min(lastEndPage + 1, selectedPDF.totalPages),
      endPage: Math.min(lastEndPage + 10, selectedPDF.totalPages),
      filename: `file_${splitNumber}`,
    };

    setSplits((prev) => [...prev, newSplit]);
  };

  const handleRemoveSplit = (id: string) => {
    setSplits((prev) => prev.filter((split) => split.id !== id));
  };

  const handleUpdateSplit = (id: string, field: keyof SplitDefinition, value: string | number) => {
    setSplits((prev) => prev.map((split) => (split.id === id ? { ...split, [field]: value } : split)));
  };

  const validateSplit = (split: SplitDefinition): boolean => {
    if (!selectedPDF) return false;
    return (
      split.startPage >= 1 &&
      split.startPage <= selectedPDF.totalPages &&
      split.endPage >= split.startPage &&
      split.endPage <= selectedPDF.totalPages &&
      split.filename.trim().length > 0
    );
  };

  const handleSplit = async () => {
    if (!selectedPDF || splits.length === 0 || !outputDirectory) return;

    // Validate all splits
    const invalidSplits = splits.filter((split) => !validateSplit(split));
    if (invalidSplits.length > 0) {
      setError(t('pleaseFixInvalidSplits'));
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const splitDefinitions: models.SplitDefinition[] = splits.map((split) => ({
        startPage: split.startPage,
        endPage: split.endPage,
        filename: split.filename.trim(),
      }));

      await SplitPDF(selectedPDF.path, splitDefinitions, outputDirectory);
      const outputFiles = splits.map((s) => `${s.filename.trim()}.pdf`).join(', ');
      setSuccess(`${t('pdfSplitSuccessfully')} ${splits.length} ${t('createdFiles')} ${outputFiles}`);
      // Clear splits after successful split
      setSplits([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : err?.toString() || 'Unknown error occurred';
      setError(`${t('splitFailed')} ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canAddSplit = splits.length < MAX_SPLITS && selectedPDF !== null && !isProcessing;
  const canSplit =
    selectedPDF !== null &&
    splits.length > 0 &&
    outputDirectory.length > 0 &&
    splits.every(validateSplit) &&
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
      {selectedPDF && (
        <>
          <PDFInfoCard pdf={selectedPDF} />

          {/* Add Split Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Button onClick={handleAddSplit} disabled={!canAddSplit} startIcon={<AddIcon />} variant="outlined">
              {t('addSplit')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {splits.length} / {MAX_SPLITS} {t('splits')}
            </Typography>
          </Box>

          {/* Split Definitions List */}
          <Paper
            sx={{
              flex: 1,
              overflow: 'auto',
              mb: 3,
              minHeight: 200,
              p: 2,
            }}
          >
            {splits.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>{t('noSplitsDefined')}</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {splits.map((split, index) => {
                  const isValid = validateSplit(split);
                  const pageCount = split.endPage - split.startPage + 1;

                  return (
                    <Card
                      key={split.id}
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
                            {t('split')} {index + 1}
                          </Typography>
                          <IconButton
                            onClick={() => handleRemoveSplit(split.id)}
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
                            value={split.startPage}
                            onChange={(e) => handleUpdateSplit(split.id, 'startPage', parseInt(e.target.value) || 1)}
                            inputProps={{ min: 1, max: selectedPDF.totalPages }}
                            size="small"
                            error={!isValid && (split.startPage < 1 || split.startPage > selectedPDF.totalPages)}
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <TextField
                            label={t('endPage')}
                            type="number"
                            value={split.endPage}
                            onChange={(e) => handleUpdateSplit(split.id, 'endPage', parseInt(e.target.value) || 1)}
                            inputProps={{ min: split.startPage, max: selectedPDF.totalPages }}
                            size="small"
                            error={
                              !isValid && (split.endPage < split.startPage || split.endPage > selectedPDF.totalPages)
                            }
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{t('fileName')}</Typography>
                            <TextField
                              value={split.filename}
                              onChange={(e) => handleUpdateSplit(split.id, 'filename', e.target.value)}
                              placeholder="file_1"
                              size="small"
                              error={split.filename.trim().length === 0}
                              disabled={isProcessing}
                              sx={{ width: '200px' }}
                            />
                            <Typography variant="body2">.pdf</Typography>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {t('pages')} {split.startPage}-{split.endPage} ({pageCount}{' '}
                          {pageCount === 1 ? t('page') : t('pages')})
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Paper>
        </>
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
          labelKey="selectOutputDirectorySplit"
          disabled={isProcessing}
        />

        <Button
          variant="contained"
          onClick={handleSplit}
          disabled={!canSplit}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? t('splitting') : t('splitPDF')}
        </Button>
      </Box>
    </Box>
  );
};
