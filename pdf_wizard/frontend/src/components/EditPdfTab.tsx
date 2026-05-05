import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { models } from '../../wailsjs/go/models';
import {
  FillPDFForm,
  GetPDFMetadata,
  ListPDFFormFields,
  SelectOutputDirectory,
  SelectPDFFile,
} from '../../wailsjs/go/main/App';
import { useI18n } from '../utils/i18n';
import { NoPDFSelected } from './NoPDFSelected';

interface EditPdfTabProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

type EditableField = models.PDFFormField & { currentValue: string };

function parentDirectory(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  if (i <= 0) {
    return '';
  }
  return filePath.slice(0, i);
}

export const EditPdfTab = ({ onFileDrop }: EditPdfTabProps) => {
  const { t } = useI18n();
  const [selectedPDFPath, setSelectedPDFPath] = useState('');
  const [selectedPDFName, setSelectedPDFName] = useState('');
  const [fields, setFields] = useState<EditableField[]>([]);
  const [outputDirectory, setOutputDirectory] = useState('');
  const [outputFilename, setOutputFilename] = useState('filled_form');
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPDFForm = useCallback(
    async (path: string) => {
      setIsLoadingFields(true);
      setError(null);
      setSuccess(null);
      try {
        const [metadata, formFields] = await Promise.all([GetPDFMetadata(path), ListPDFFormFields(path)]);
        setSelectedPDFPath(metadata.path);
        setSelectedPDFName(metadata.name);
        setFields(
          formFields.map((field) => ({
            ...field,
            currentValue: field.value ?? '',
          })),
        );
        const outDir = parentDirectory(path);
        if (outDir) {
          setOutputDirectory(outDir);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
        setError(`${t('formFillLoadFailed')} ${message}`);
      } finally {
        setIsLoadingFields(false);
      }
    },
    [t],
  );

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile(
        new models.FileDialogLabels({
          title: t('selectPDFFile'),
          filterDisplayName: t('fileDialogFilterPdfFiles'),
        }),
      );
      if (!path) {
        return;
      }
      await loadPDFForm(path);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('formFillSelectPDFFailed')} ${message}`);
    }
  };

  const handleDroppedPDF = useCallback(
    async (paths: string[]) => {
      const pdfPaths = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));
      if (pdfPaths.length === 0) {
        setError(t('noPDFFilesFound'));
        return;
      }
      if (pdfPaths.length > 1) {
        setError(t('pleaseDropOnlyOnePDF'));
        return;
      }
      await loadPDFForm(pdfPaths[0]);
    },
    [loadPDFForm, t],
  );

  useEffect(() => {
    onFileDrop(handleDroppedPDF);
  }, [handleDroppedPDF, onFileDrop]);

  const handleSelectOutputDirectory = async () => {
    try {
      const dir = await SelectOutputDirectory(
        new models.FileDialogLabels({ title: t('formFillSelectOutputDirectory'), filterDisplayName: '' }),
      );
      if (!dir) {
        return;
      }
      setOutputDirectory(dir);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('formFillSelectOutputDirectoryFailed')} ${message}`);
    }
  };

  const updateFieldValue = (id: string, value: string) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, currentValue: value } : field)));
  };

  const canSubmit = useMemo(
    () =>
      selectedPDFPath.length > 0 &&
      fields.length > 0 &&
      outputDirectory.length > 0 &&
      outputFilename.trim().length > 0 &&
      !isLoadingFields &&
      !isProcessing,
    [fields.length, isLoadingFields, isProcessing, outputDirectory.length, outputFilename, selectedPDFPath.length],
  );

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      await FillPDFForm(
        selectedPDFPath,
        fields.map((field) => new models.PDFFormFieldValue({ id: field.id, value: field.currentValue })),
        outputDirectory,
        outputFilename.trim(),
      );
      setSuccess(`${t('formFillSuccess')} ${outputDirectory}/${outputFilename.trim()}.pdf`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err) || 'Unknown error occurred';
      setError(`${t('formFillSubmitFailed')} ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFieldEditor = (field: EditableField) => {
    if (field.locked) {
      return (
        <TextField
          key={field.id}
          label={field.name || field.id}
          value={field.currentValue}
          size="small"
          fullWidth
          disabled
          helperText={t('formFillFieldLocked')}
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <FormControlLabel
          key={field.id}
          control={
            <Checkbox
              checked={field.currentValue.toLowerCase() === 'true' || field.currentValue === '1'}
              onChange={(event) => updateFieldValue(field.id, event.target.checked ? 'true' : 'false')}
            />
          }
          label={field.name || field.id}
        />
      );
    }

    if ((field.type === 'radio' || field.type === 'combo' || field.type === 'list') && field.options?.length) {
      return (
        <FormControl key={field.id} size="small" fullWidth>
          <InputLabel>{field.name || field.id}</InputLabel>
          <Select
            label={field.name || field.id}
            value={field.currentValue}
            onChange={(event) => updateFieldValue(field.id, String(event.target.value))}
          >
            {field.options.map((opt) => (
              <MenuItem key={`${field.id}-${opt}`} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.id}
        label={field.name || field.id}
        value={field.currentValue}
        onChange={(event) => updateFieldValue(field.id, event.target.value)}
        size="small"
        fullWidth
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, pb: 2, overflowY: 'auto' }}>
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleSelectPDF}
          sx={{ mb: 2 }}
          disabled={isLoadingFields || isProcessing}
        >
          {t('selectPDFFile')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
      </Box>

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

      {selectedPDFPath ? (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {selectedPDFName || selectedPDFPath}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedPDFPath}
          </Typography>
        </>
      ) : (
        <NoPDFSelected />
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
        {isLoadingFields ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">{t('formFillLoadingFields')}</Typography>
          </Box>
        ) : fields.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>{fields.map((field) => renderFieldEditor(field))}</Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('formFillNoFields')}
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 2, mb: 1, flexShrink: 0 }}>
        <Button
          variant="outlined"
          startIcon={<FolderIcon />}
          onClick={handleSelectOutputDirectory}
          sx={{ mb: 1 }}
          disabled={isLoadingFields || isProcessing}
        >
          {t('formFillSelectOutputDirectory')}
        </Button>
        {outputDirectory && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {outputDirectory}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">{t('outputFilename')}</Typography>
          <TextField
            value={outputFilename}
            onChange={(event) => setOutputFilename(event.target.value)}
            size="small"
            sx={{ width: '220px' }}
            disabled={isLoadingFields || isProcessing}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          fullWidth
          sx={{ py: 1.5 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? t('formFillSubmitting') : t('formFillSubmit')}
        </Button>
      </Box>
    </Box>
  );
};
