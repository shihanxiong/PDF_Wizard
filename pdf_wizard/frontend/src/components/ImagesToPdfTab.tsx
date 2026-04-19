import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Alert, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ImageIcon from '@mui/icons-material/Image';
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
import { SelectImageFiles, GetFileMetadata, ImagesToPDF } from '../../wailsjs/go/main/App';
import { SelectedFile } from '../types';
import { formatFileSize, formatDate, convertToSelectedFile } from '../utils/formatters';
import { useI18n } from '../utils/i18n';
import { useImageDrop } from '../hooks/useImageDrop';
import { useOutputDirectory } from '../hooks/useOutputDirectory';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { FilenameInput } from './FilenameInput';
import { OutputDirectorySelector } from './OutputDirectorySelector';
import { NoPDFSelected } from './NoPDFSelected';

interface ImagesToPdfTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

interface SortableImageItemProps {
  file: SelectedFile;
  index: number;
  onRemove: () => void;
}

const SortableImageItem = ({ file, index, onRemove }: SortableImageItemProps) => {
  const { t } = useI18n();
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
      <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
        <ImageIcon color="action" />
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

export const ImagesToPdfTab = ({ onFileDrop }: ImagesToPdfTabProps) => {
  const { t } = useI18n();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [outputFilename, setOutputFilename] = useState<string>('from_images');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);

  const { handleImageDrop } = useImageDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory('failedToSelectOutputDirectory');
  const { error, setError, handleError } = useErrorHandler();

  useEffect(() => {
    const handleDroppedFiles = (paths: string[]) => {
      handleImageDrop(paths, {
        onSuccess: (newFiles) => {
          setFiles((prev) => [...prev, ...newFiles]);
          setError(null);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
        },
      });
    };
    onFileDrop(handleDroppedFiles);
  }, [t, handleImageDrop, onFileDrop, setError]);

  const handleSelectFiles = async () => {
    try {
      const paths = await SelectImageFiles();
      if (paths && paths.length > 0) {
        const metadataPromises = paths.map((path) => GetFileMetadata(path));
        const metadataResults = await Promise.all(metadataPromises);
        const newFiles = metadataResults.map(convertToSelectedFile);
        setFiles((prev) => [...prev, ...newFiles]);
        setError(null);
      }
    } catch (err) {
      handleError(err, 'failedToSelectImageFiles');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  const handleCreatePdf = async () => {
    if (files.length === 0 || !outputDirectory || !outputFilename.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const paths = files.map((f) => f.path);
      await ImagesToPDF(paths, outputDirectory, outputFilename.trim());
      setSuccess(`${t('imagesToPdfSuccessfully')} ${outputDirectory}/${outputFilename.trim()}.pdf`);
      setFiles([]);
      setOutputFilename('from_images');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : typeof err === 'string' ? err : String(err) || 'Unknown error occurred';
      setError(`${t('imagesToPdfFailed')} ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const canCreate = files.length > 0 && outputDirectory.length > 0 && outputFilename.trim().length > 0 && !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      <Box sx={{ mb: 1 }}>
        <Button variant="contained" startIcon={<ImageIcon />} onClick={handleSelectFiles} sx={{ mb: 2 }} disabled={isProcessing}>
          {t('selectImageFiles')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropImagesHint')}
        </Typography>
      </Box>

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

      {files.length > 0 ? (
        <Paper sx={{ flex: 1, overflow: 'auto', mb: 3, minHeight: 200 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map((f) => f.path)} strategy={verticalListSortingStrategy}>
              {files.map((file, index) => (
                <SortableImageItem key={file.path} file={file} index={index} onRemove={() => handleRemoveFile(index)} />
              ))}
            </SortableContext>
          </DndContext>
        </Paper>
      ) : (
        <NoPDFSelected />
      )}

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
          placeholder="from_images"
          disabled={isProcessing}
        />

        <Button
          variant="contained"
          onClick={handleCreatePdf}
          disabled={!canCreate}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? t('convertingImagesToPdf') : t('imagesToPdf')}
        </Button>
      </Box>
    </Box>
  );
};
