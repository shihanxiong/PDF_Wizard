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
import FolderIcon from '@mui/icons-material/Folder';
import { SelectPDFFile, GetPDFMetadata, SelectOutputDirectory, RotatePDF } from '../../wailsjs/go/main/App';
import { SelectedPDF, RotateDefinition } from '../types';
import { formatFileSize, formatDate } from '../utils/formatters';
import { models } from '../../wailsjs/go/models';

const MAX_ROTATIONS = 10;

interface RotateTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

export const RotateTab = ({ onFileDrop }: RotateTabProps) => {
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [rotations, setRotations] = useState<RotateDefinition[]>([]);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('rotated');
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
      setError('No PDF files found in dropped files');
      return;
    }
    if (pdfPaths.length > 1) {
      setError('Please drop only one PDF file');
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
      // Clear existing rotations when new PDF is selected
      setRotations([]);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load PDF: ${err.message}`);
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
        // Clear existing rotations when new PDF is selected
        setRotations([]);
        setError(null);
      }
    } catch (err: any) {
      setError(`Failed to select PDF: ${err.message}`);
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

  const handleSelectOutputDirectory = async () => {
    try {
      const dir = await SelectOutputDirectory();
      if (dir) {
        setOutputDirectory(dir);
        setError(null);
      }
    } catch (err: any) {
      setError(`Failed to select output directory: ${err.message}`);
    }
  };

  const handleRotate = async () => {
    if (!selectedPDF || rotations.length === 0 || !outputDirectory || !outputFilename.trim()) return;

    // Validate all rotations
    const invalidRotations = rotations.filter((rotation) => !validateRotate(rotation));
    if (invalidRotations.length > 0) {
      setError('Please fix invalid rotation configurations before proceeding');
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
      setSuccess(`PDF rotated successfully! Output: ${outputDirectory}/${outputFilename.trim()}.pdf`);
      // Clear selected PDF, rotations, and reset filename after successful rotation
      setSelectedPDF(null);
      setRotations([]);
      setOutputFilename('rotated');
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error occurred';
      setError(`Rotation failed: ${errorMessage}`);
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
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        >
          Select PDF File
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Or drag and drop a PDF file anywhere on the window
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
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                📄 {selectedPDF.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedPDF.path}
              </Typography>
              <Typography variant="body2">
                {formatFileSize(selectedPDF.size)} • {selectedPDF.totalPages} pages • Modified:{' '}
                {formatDate(selectedPDF.lastModified)}
              </Typography>
            </CardContent>
          </Card>

          {/* Add Rotate Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Button onClick={handleAddRotate} disabled={!canAddRotate} startIcon={<AddIcon />} variant="outlined">
              Add Rotate
            </Button>
            <Typography variant="body2" color="text.secondary">
              {rotations.length} / {MAX_ROTATIONS} rotations
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
                <Typography>No rotations defined. Click "Add Rotate" to create one.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {rotations.map((rotation, index) => {
                  const isValid = validateRotate(rotation);
                  const pageCount = rotation.endPage - rotation.startPage + 1;
                  const rotationLabel =
                    rotation.rotation === 90 ? '+90°' : rotation.rotation === -90 ? '-90°' : '180°';

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
                          <Typography variant="subtitle1">Rotation {index + 1}</Typography>
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
                            label="Start Page"
                            type="number"
                            value={rotation.startPage}
                            onChange={(e) => handleUpdateRotate(rotation.id, 'startPage', parseInt(e.target.value) || 1)}
                            inputProps={{ min: 1, max: selectedPDF.totalPages }}
                            size="small"
                            error={!isValid && (rotation.startPage < 1 || rotation.startPage > selectedPDF.totalPages)}
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <TextField
                            label="End Page"
                            type="number"
                            value={rotation.endPage}
                            onChange={(e) => handleUpdateRotate(rotation.id, 'endPage', parseInt(e.target.value) || 1)}
                            inputProps={{ min: rotation.startPage, max: selectedPDF.totalPages }}
                            size="small"
                            error={
                              !isValid && (rotation.endPage < rotation.startPage || rotation.endPage > selectedPDF.totalPages)
                            }
                            disabled={isProcessing}
                            sx={{ width: '120px' }}
                          />
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Rotation</InputLabel>
                            <Select
                              value={rotation.rotation}
                              label="Rotation"
                              onChange={(e) => handleUpdateRotate(rotation.id, 'rotation', Number(e.target.value))}
                              disabled={isProcessing}
                            >
                              <MenuItem value={90}>+90° (Clockwise)</MenuItem>
                              <MenuItem value={-90}>-90° (Counter-clockwise)</MenuItem>
                              <MenuItem value={180}>180° (Upside down)</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          Pages {rotation.startPage}-{rotation.endPage} ({pageCount} {pageCount === 1 ? 'page' : 'pages'}) •{' '}
                          {rotationLabel}
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
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={handleSelectOutputDirectory}
            sx={{ mb: 1 }}
            disabled={isProcessing}
          >
            Select Output Directory
          </Button>
          {outputDirectory && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {outputDirectory}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2">Output Filename:</Typography>
          <TextField
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            size="small"
            placeholder="rotated"
            sx={{ width: '200px' }}
            disabled={isProcessing}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleRotate}
          disabled={!canRotate}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? 'Rotating...' : 'Rotate PDF'}
        </Button>
      </Box>
    </Box>
  );
};

