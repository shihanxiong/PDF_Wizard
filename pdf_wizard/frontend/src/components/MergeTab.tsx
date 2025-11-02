import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { StrictModeDroppable } from './StrictModeDroppable';
import { SelectPDFFiles, GetFileMetadata, SelectOutputDirectory, MergePDFs } from '../../wailsjs/go/main/App';
import { OnFileDrop } from '../../wailsjs/runtime/runtime';
import { SelectedFile } from '../types';
import { formatFileSize, formatDate, convertToSelectedFile } from '../utils/formatters';

export const MergeTab = () => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('merged');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Set up drag and drop for file selection
  useEffect(() => {
    OnFileDrop((x, y, paths) => {
      handleDroppedFiles(paths);
    }, false);

    // Note: OnFileDrop persists throughout app lifecycle
    // No cleanup needed unless we want to disable it
  }, []);

  const handleDroppedFiles = async (paths: string[]) => {
    const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));
    if (pdfPaths.length === 0) {
      setError('No PDF files found in dropped files');
      return;
    }

    try {
      const metadataPromises = pdfPaths.map((path) => GetFileMetadata(path));
      const metadataResults = await Promise.all(metadataPromises);
      const newFiles = metadataResults.map(convertToSelectedFile);
      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load files: ${err.message}`);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const paths = await SelectPDFFiles();
      if (paths && paths.length > 0) {
        const metadataPromises = paths.map((path) => GetFileMetadata(path));
        const metadataResults = await Promise.all(metadataPromises);
        const newFiles = metadataResults.map(convertToSelectedFile);
        setFiles((prev) => [...prev, ...newFiles]);
        setError(null);
      }
    } catch (err: any) {
      setError(`Failed to select files: ${err.message}`);
    }
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFiles(items);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length === 0 || !outputDirectory || !outputFilename.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const filePaths = files.map((f) => f.path);
      await MergePDFs(filePaths, outputDirectory, outputFilename.trim());
      setSuccess(`PDFs merged successfully! Output: ${outputDirectory}/${outputFilename}.pdf`);
      // Clear files after successful merge
      setFiles([]);
      setOutputFilename('merged');
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error occurred';
      setError(`Merge failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canMerge = files.length > 0 && outputDirectory.length > 0 && outputFilename.trim().length > 0 && !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      {/* File Selection Section */}
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleSelectFiles} sx={{ mb: 2 }}>
          Select PDF Files
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Or drag and drop PDF files anywhere on the window
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

      {/* File List */}
      <Paper
        sx={{
          flex: 1,
          overflow: 'auto',
          mb: 3,
          minHeight: 200,
        }}
      >
        {files.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>No files selected</Typography>
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="file-list">
              {(provided, snapshot) => (
                <Box
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                  }}
                >
                  {files.map((file, index) => (
                    <Draggable key={file.path} draggableId={file.path} index={index}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                            ...provided.draggableProps.style,
                          }}
                        >
                          <Box sx={{ mr: 2, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                            <DragIndicatorIcon color="action" />
                          </Box>
                          <Box sx={{ mr: 2, minWidth: 40 }}>
                            <Typography variant="caption" color="text.secondary">
                              {index + 1}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                              {file.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {file.path}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size)} • Modified: {formatDate(file.lastModified)}
                            </Typography>
                          </Box>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveFile(index)}
                            color="error"
                            size="small"
                            sx={{ ml: 2 }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        )}
      </Paper>

      {/* Output Configuration Section */}
      <Box sx={{ mt: 'auto', pt: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<FolderIcon />} onClick={handleSelectOutputDirectory} sx={{ mb: 1 }}>
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
            placeholder="merged"
            sx={{ width: '200px' }}
            disabled={isProcessing}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleMerge}
          disabled={!canMerge}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? 'Merging...' : 'Merge PDFs'}
        </Button>
      </Box>
    </Box>
  );
};
