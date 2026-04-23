import { Card, CardContent, Typography } from '@mui/material';
import { SelectedPDF } from '../types';
import { formatFileSize, formatDate } from '../utils/formatters';
import { useI18n } from '../utils/i18n';

interface PDFInfoCardProps {
  pdf: SelectedPDF;
}

/**
 * Shared component for displaying PDF file information
 */
export const PDFInfoCard = ({ pdf }: PDFInfoCardProps) => {
  const { t } = useI18n();
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          📄 {pdf.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {pdf.path}
        </Typography>
        <Typography variant="body2">
          {formatFileSize(pdf.size)} • {pdf.totalPages} {t('pages')} • {t('modified')}{' '}
          {formatDate(pdf.lastModified)}
        </Typography>
      </CardContent>
    </Card>
  );
};

