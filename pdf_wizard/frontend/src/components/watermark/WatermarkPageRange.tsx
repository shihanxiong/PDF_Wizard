import { Box, Typography, TextField, FormControl, Radio, RadioGroup, FormControlLabel } from '@mui/material';
import { useI18n } from '../../utils/i18n';

export interface WatermarkPageRangeProps {
  pageRangeType: 'all' | 'specific';
  onPageRangeTypeChange: (value: 'all' | 'specific') => void;
  pageRange: string;
  onPageRangeChange: (value: string) => void;
  totalPages: number;
  isProcessing: boolean;
}

export const validatePageRange = (range: string, totalPages: number): { isValid: boolean; error: string } => {
  if (range.trim() === '') {
    return { isValid: false, error: 'Page range cannot be empty' };
  }

  const parts = range.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '') {
      continue;
    }

    if (trimmed.includes('-')) {
      const rangeParts = trimmed.split('-');
      if (rangeParts.length !== 2) {
        return { isValid: false, error: `Invalid page range format: ${trimmed}` };
      }

      const startStr = rangeParts[0].trim();
      const endStr = rangeParts[1].trim();

      if (startStr === '') {
        return { isValid: false, error: 'Start page cannot be empty' };
      }

      const start = parseInt(startStr, 10);
      if (isNaN(start) || start < 1 || start > totalPages) {
        return { isValid: false, error: `Start page ${startStr} is out of range (1-${totalPages})` };
      }

      if (endStr !== '') {
        const end = parseInt(endStr, 10);
        if (isNaN(end) || end < 1 || end > totalPages) {
          return { isValid: false, error: `End page ${endStr} is out of range (1-${totalPages})` };
        }
        if (start > end) {
          return { isValid: false, error: `Start page (${start}) must be less than or equal to end page (${end})` };
        }
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        return { isValid: false, error: `Page ${trimmed} is out of range (1-${totalPages})` };
      }
    }
  }

  return { isValid: true, error: '' };
};

export const WatermarkPageRange = ({
  pageRangeType,
  onPageRangeTypeChange,
  pageRange,
  onPageRangeChange,
  totalPages,
  isProcessing,
}: WatermarkPageRangeProps) => {
  const { t } = useI18n();

  const pageRangeValidation =
    pageRangeType === 'specific' ? validatePageRange(pageRange, totalPages) : { isValid: true, error: '' };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap' }}>
      <Typography variant="body2" sx={{ flexShrink: 0 }}>
        {t('pageRange')}
      </Typography>

      <FormControl component="fieldset" sx={{ flexShrink: 0 }}>
        <RadioGroup
          row
          value={pageRangeType}
          onChange={(e) => onPageRangeTypeChange(e.target.value as 'all' | 'specific')}
        >
          <FormControlLabel value="all" control={<Radio />} label={t('allPages')} disabled={isProcessing} />
          <FormControlLabel value="specific" control={<Radio />} label={t('specificPages')} disabled={isProcessing} />
        </RadioGroup>
      </FormControl>

      <Box sx={{ flex: 1, minWidth: 200, visibility: pageRangeType === 'specific' ? 'visible' : 'hidden' }}>
        <TextField
          label={t('pages')}
          value={pageRange}
          onChange={(e) => onPageRangeChange(e.target.value)}
          placeholder="1,3,5-10"
          size="small"
          fullWidth
          disabled={isProcessing}
          error={!pageRangeValidation.isValid}
          helperText={
            !pageRangeValidation.isValid
              ? pageRangeValidation.error
              : `e.g., "1,3,5-10" (1-${totalPages})`
          }
        />
      </Box>
    </Box>
  );
};
