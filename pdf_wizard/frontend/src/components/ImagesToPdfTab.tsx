import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Alert, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ImageIcon from '@mui/icons-material/Image';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import QRCode from 'qrcode';
import { EventsOn } from '../../wailsjs/runtime/runtime';
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
import {
  SelectImageFiles,
  GetFileMetadata,
  ImagesToPDF,
  StartImagesPhoneUpload,
  StopImagesPhoneUpload,
} from '../../wailsjs/go/main/App';
import { models } from '../../wailsjs/go/models';
import { SelectedFile } from '../types';
import { formatFileSize, formatDate, convertToSelectedFile } from '../utils/formatters';
import { useI18n } from '../utils/i18n';

/** Must match services.PhoneUploadMaxFilesPerSession in the Go LAN upload handler. */
const PHONE_UPLOAD_MAX_FILES = 25;
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
        data-testid={`images-to-pdf-drag-${index}`}
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
  const { t, language } = useI18n();
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [outputFilename, setOutputFilename] = useState<string>('from_images');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneUploadURL, setPhoneUploadURL] = useState<string | null>(null);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);

  const { handleImageDrop } = useImageDrop();
  const { outputDirectory, selectDirectory } = useOutputDirectory('failedToSelectOutputDirectory', 'selectOutputDirectory');
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

  useEffect(() => {
    if (!phoneUploadURL) {
      setQrDataURL(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(phoneUploadURL, { width: 220, margin: 2, errorCorrectionLevel: 'M' }).then((dataUrl) => {
      if (!cancelled) {
        setQrDataURL(dataUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phoneUploadURL]);

  useEffect(() => {
    const unsubscribe = EventsOn('images-phone-upload', async (data: string) => {
      let paths: unknown;
      try {
        paths = JSON.parse(data);
      } catch {
        return;
      }
      if (!Array.isArray(paths) || paths.length === 0) {
        return;
      }
      const strPaths = paths.filter((p): p is string => typeof p === 'string');
      if (strPaths.length === 0) {
        return;
      }
      try {
        const metadataResults = await Promise.all(strPaths.map((path) => GetFileMetadata(path)));
        const newFiles = metadataResults.map(convertToSelectedFile);
        setFiles((prev) => [...prev, ...newFiles]);
        setError(null);
        setPhoneUploadURL(null);
      } catch (err) {
        handleError(err, 'failedToLoadFiles');
      }
    });
    return () => unsubscribe();
  }, [handleError, setError]);

  const handleStartPhoneUpload = async () => {
    try {
      setError(null);
      const page = new models.PhoneUploadPageCopy({
        lang: language,
        dir: language === 'ar' ? 'rtl' : 'ltr',
        title: t('imagesPhonePageTitle'),
        heading: t('appTitle'),
        intro: t('imagesPhoneReceiveHint'),
        photosLabel: t('imagesPhonePagePhotosLabel'),
        chooseFiles: t('imagesPhonePageChooseFiles'),
        upload: t('imagesPhonePageUpload'),
        doneTitle: t('imagesPhonePageDoneTitle'),
        doneBody: t('imagesPhonePageDoneBody'),
        noFiles: t('imagesPhonePageNoFiles'),
        retry: t('imagesPhonePageRetry'),
        selectedCountLine: t('imagesPhonePageSelectedCount'),
        tooManyFiles: t('imagesPhonePageTooManyFiles').replace(/__MAX__/g, String(PHONE_UPLOAD_MAX_FILES)),
        sessionClosedTitle: t('imagesPhonePageSessionClosedTitle'),
        sessionClosedBody: t('imagesPhonePageSessionClosedBody'),
      });
      const url = await StartImagesPhoneUpload(page);
      setPhoneUploadURL(url);
    } catch (err) {
      handleError(err, 'imagesPhoneReceiveFailed');
    }
  };

  const handleStopPhoneUpload = async () => {
    try {
      await StopImagesPhoneUpload();
      setPhoneUploadURL(null);
    } catch (err) {
      handleError(err, 'imagesPhoneReceiveFailed');
    }
  };

  const handleSelectFiles = async () => {
    try {
      const paths = await SelectImageFiles(
        new models.FileDialogLabels({
          title: t('selectImageFiles'),
          filterDisplayName: t('fileDialogFilterImages'),
        }),
      );
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
      <Box sx={{ mb: 1, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <Button variant="contained" startIcon={<ImageIcon />} onClick={handleSelectFiles} disabled={isProcessing}>
            {t('selectImageFiles')}
          </Button>
          {phoneUploadURL ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SmartphoneIcon />}
              onClick={handleStopPhoneUpload}
              disabled={isProcessing}
            >
              {t('imagesPhoneReceiveStop')}
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<SmartphoneIcon />}
              onClick={handleStartPhoneUpload}
              disabled={isProcessing}
            >
              {t('imagesPhoneReceive')}
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('dragDropImagesHint')}
        </Typography>
        {phoneUploadURL && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              maxWidth: 360,
              mx: 'auto',
              textAlign: 'left',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('imagesPhoneReceiveHint')}
            </Typography>
            {qrDataURL && (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 1 }}>
                <Box
                  component="img"
                  src={qrDataURL}
                  alt=""
                  sx={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                />
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
              {phoneUploadURL}
            </Typography>
          </Box>
        )}
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

      <Box sx={{ mt: 'auto', pt: 2, pb: 2, flexShrink: 0 }}>
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
