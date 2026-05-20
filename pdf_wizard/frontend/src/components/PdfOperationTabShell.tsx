import { Box, Button, Typography, Alert, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { SelectedPDF } from '../types';
import { useI18n, type Translations } from '../utils/i18n';
import { PDFInfoCard } from './PDFInfoCard';
import { FilenameInput } from './FilenameInput';
import { OutputDirectorySelector } from './OutputDirectorySelector';
import { NoPDFSelected } from './NoPDFSelected';

export interface PdfOperationTabShellProps {
  selectedPDF: SelectedPDF | null;
  onSelectPDF: () => void;
  onFileDrop: (handler: (paths: string[]) => void) => void;
  error: string | null;
  onClearError: () => void;
  success: string | null;
  onClearSuccess: () => void;
  isProcessing: boolean;
  outputDirectory: string;
  onSelectOutputDirectory: () => void;
  outputFilename?: string;
  onOutputFilenameChange?: (val: string) => void;
  actionLabel: string;
  actionLoadingLabel: string;
  canExecute: boolean;
  onExecute: () => void;
  children: React.ReactNode;
  selectPDFLabel?: keyof Translations;
  outputDirectoryLabel?: keyof Translations;
  showFilenameInput?: boolean;
  filenamePlaceholder?: string;
}

/**
 * Shared shell layout for single-PDF operation tabs (Split, Rotate, Lock, PdfToText).
 * Renders the standard layout: file picker, alerts, PDF info card, children (tab-specific
 * content), and a sticky bottom section with output directory, filename input, and action button.
 */
export const PdfOperationTabShell = ({
  selectedPDF,
  onSelectPDF,
  onFileDrop,
  error,
  onClearError,
  success,
  onClearSuccess,
  isProcessing,
  outputDirectory,
  onSelectOutputDirectory,
  outputFilename,
  onOutputFilenameChange,
  actionLabel,
  actionLoadingLabel,
  canExecute,
  onExecute,
  children,
  selectPDFLabel = 'selectPDFFile',
  outputDirectoryLabel = 'selectOutputDirectoryRotate',
  showFilenameInput = true,
  filenamePlaceholder,
}: PdfOperationTabShellProps) => {
  const { t } = useI18n();
  void onFileDrop;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, overflow: 'hidden' }}>
      {/* PDF Selection Section */}
      <Box sx={{ mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={onSelectPDF}
          sx={{ mb: 2 }}
          disabled={isProcessing}
        >
          {t(selectPDFLabel)}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('dragDropPDFHint')}
        </Typography>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" onClose={onClearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={onClearSuccess} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Selected PDF Information + Tab-specific content */}
      {selectedPDF ? (
        <>
          <PDFInfoCard pdf={selectedPDF} />
          {children}
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
          flexShrink: 0,
        }}
      >
        <OutputDirectorySelector
          directory={outputDirectory}
          onSelect={onSelectOutputDirectory}
          labelKey={outputDirectoryLabel}
          disabled={isProcessing}
        />

        {showFilenameInput && outputFilename !== undefined && onOutputFilenameChange && (
          <FilenameInput
            value={outputFilename}
            onChange={onOutputFilenameChange}
            placeholder={filenamePlaceholder}
            disabled={isProcessing}
          />
        )}

        <Button
          variant="contained"
          onClick={onExecute}
          disabled={!canExecute}
          fullWidth
          sx={{ py: 1.5, mb: 2 }}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isProcessing ? actionLoadingLabel : actionLabel}
        </Button>
      </Box>
    </Box>
  );
};
