import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Alert, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
import { SelectPDFFiles, GetFileMetadata, MergePDFs } from '../../wailsjs/go/main/App';
import { SelectedFile } from '../types';
import { formatFileSize, formatDate, convertToSelectedFile } from '../utils/formatters';
import { t } from '../utils/i18n';
import { usePDFDrop } from '../hooks/usePDFDrop';
import { useOutputDirectory } from '../hooks/useOutputDirectory';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { FilenameInput } from './FilenameInput';
import { OutputDirectorySelector } from './OutputDirectorySelector';
import { NoPDFSelected } from './NoPDFSelected';

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
  const [outputFilename, setOutputFilename] = useState<string>('merged');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { handlePDFDrop } = usePDFDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory('failedToSelectOutputDirectory');
  const { error, setError, handleError } = useErrorHandler();

  // Register drag and drop handler with App component
  useEffect(() => {
    const handleDroppedFiles = (paths: string[]) => {
      handlePDFDrop(paths, {
        allowMultiple: true,
        onSuccess: (newFiles) => {
          setFiles((prev) => [...prev, ...(newFiles as SelectedFile[])]);
          setError(null);
        },
        onError: (errorMsg) => {
          setError(`${t('failedToLoadFiles')} ${errorMsg}`);
        },
      });
    };
    onFileDrop(handleDroppedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (err) {
      handleError(err, 'failedToSelectFiles');
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
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : String(err) || 'Unknown error occurred';
      setError(`${t('mergeFailed')} ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canMerge = files.length > 0 && outputDirectory.length > 0 && outputFilename.trim().length > 0 && !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      {/* File Selection Section */}
      <Box sx={{ mb: 1 }}>
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
      {files.length > 0 ? (
        <Paper
          sx={{
            flex: 1,
            overflow: 'auto',
            mb: 3,
            minHeight: 200,
          }}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map((f) => f.path)} strategy={verticalListSortingStrategy}>
              {files.map((file, index) => (
                <SortableFileItem key={file.path} file={file} index={index} onRemove={() => handleRemoveFile(index)} />
              ))}
            </SortableContext>
          </DndContext>
        </Paper>
      ) : (
        <NoPDFSelected />
      )}

      {/* Output Configuration Section */}
      <Box sx={{ mt: 'auto', pt: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <OutputDirectorySelector
          directory={outputDirectory}
          onSelect={selectDirectory}
          labelKey="selectOutputDirectory"
          disabled={isProcessing}
        />

        <FilenameInput
          value={outputFilename}
          onChange={setOutputFilename}
          placeholder="merged"
          disabled={isProcessing}
        />

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
