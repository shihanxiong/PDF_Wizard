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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SelectPDFFiles, GetFileMetadata, SelectOutputDirectory, MergePDFs } from '../../wailsjs/go/main/App';
import { SelectedFile } from '../types';
import { formatFileSize, formatDate, convertToSelectedFile } from '../utils/formatters';
import { t } from '../utils/i18n';

interface MergeTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

interface SortableFileItemProps {
  file: SelectedFile;
  index: number;
  onRemove: () => void;
}

// Sortable file item component using @dnd-kit
const SortableFileItem = ({ file, index, onRemove }: SortableFileItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.path,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: isDragging ? 'action.selected' : 'background.paper',
        display: 'flex',
        alignItems: 'center',
        p: 2,
      }}
    >
      {/* Drag handle - only this area is draggable */}
      <Box
        {...listeners}
        sx={{
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
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
          {formatFileSize(file.size)} • {t('modified')} {formatDate(file.lastModified)}
        </Typography>
      </Box>
      <IconButton
        edge="end"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove();
        }}
        color="error"
        size="small"
        sx={{ ml: 2 }}
      >
        <DeleteIcon />
      </IconButton>
    </Box>
  );
};

export const MergeTab = ({ onFileDrop }: MergeTabProps) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('merged');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Register drag and drop handler with App component
  useEffect(() => {
    onFileDrop(handleDroppedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDroppedFiles = async (paths: string[]) => {
    const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));
    if (pdfPaths.length === 0) {
      setError(t('noPDFFilesFound'));
      return;
    }

    try {
      const metadataPromises = pdfPaths.map((path) => GetFileMetadata(path));
      const metadataResults = await Promise.all(metadataPromises);
      const newFiles = metadataResults.map(convertToSelectedFile);
      setFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    } catch (err: any) {
      setError(`${t('failedToLoadFiles')} ${err.message}`);
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
      setError(`${t('failedToSelectFiles')} ${err.message}`);
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
      setError(`${t('failedToSelectOutputDirectory')} ${err.message}`);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((item) => item.path === active.id);
        const newIndex = items.findIndex((item) => item.path === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
      setSuccess(`${t('pdfsMergedSuccessfully')} ${outputDirectory}/${outputFilename}.pdf`);
      // Clear files after successful merge
      setFiles([]);
      setOutputFilename('merged');
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error occurred';
      setError(`${t('mergeFailed')} ${errorMessage}`);
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
          {t('selectPDFFiles')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropHint')}
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
            <Typography>{t('noFilesSelected')}</Typography>
          </Box>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map((f) => f.path)} strategy={verticalListSortingStrategy}>
              {files.map((file, index) => (
                <SortableFileItem key={file.path} file={file} index={index} onRemove={() => handleRemoveFile(index)} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Paper>

      {/* Output Configuration Section */}
      <Box sx={{ mt: 'auto', pt: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<FolderIcon />} onClick={handleSelectOutputDirectory} sx={{ mb: 1 }}>
            {t('selectOutputDirectory')}
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
          {isProcessing ? t('merging') : t('mergePDF')}
        </Button>
      </Box>
    </Box>
  );
};
