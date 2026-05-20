import { Box, TextField, Typography, InputAdornment } from '@mui/material';
import { useI18n } from '../../utils/i18n';

export interface WatermarkTextConfigProps {
  watermarkText: string;
  onWatermarkTextChange: (value: string) => void;
  fontSizeInput: string;
  onFontSizeInputChange: (value: string) => void;
  fontSize: number;
  onFontSizeBlur: () => void;
  fontColor: string;
  onFontColorChange: (value: string) => void;
  opacityInput: string;
  onOpacityInputChange: (value: string) => void;
  onOpacityBlur: () => void;
  isProcessing: boolean;
}

export const WatermarkTextConfig = ({
  watermarkText,
  onWatermarkTextChange,
  fontSizeInput,
  onFontSizeInputChange,
  fontSize,
  onFontSizeBlur,
  fontColor,
  onFontColorChange,
  opacityInput,
  onOpacityInputChange,
  onOpacityBlur,
  isProcessing,
}: WatermarkTextConfigProps) => {
  const { t } = useI18n();

  return (
    <>
      {/* Text Input */}
      <TextField
        label={t('watermarkText')}
        value={watermarkText}
        onChange={(e) => onWatermarkTextChange(e.target.value)}
        fullWidth
        size="small"
        disabled={isProcessing}
      />

      {/* Font Size, Font Color, and Opacity in a row */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Font Size */}
        <TextField
          label={t('fontSize')}
          type="number"
          value={fontSizeInput}
          onChange={(e) => onFontSizeInputChange(e.target.value)}
          onBlur={onFontSizeBlur}
          slotProps={{ htmlInput: { min: 12, max: 72 } }}
          size="small"
          sx={{ flex: 1, minWidth: 150 }}
          disabled={isProcessing}
          error={(() => {
            const numValue = parseInt(fontSizeInput);
            return fontSizeInput !== '' && (isNaN(numValue) || numValue < 12 || numValue > 72);
          })()}
          helperText={(() => {
            const numValue = parseInt(fontSizeInput);
            if (fontSizeInput === '') return '12-72 pt';
            if (isNaN(numValue)) return 'Please enter a valid number';
            if (numValue < 12) return 'Font size must be at least 12 pt';
            if (numValue > 72) return 'Font size must be at most 72 pt';
            return '12-72 pt';
          })()}
        />

        {/* Font Color */}
        <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ minWidth: 80, fontSize: '0.875rem' }}>{t('fontColor')}:</Typography>
          <input
            type="color"
            value={fontColor}
            onChange={(e) => onFontColorChange(e.target.value)}
            disabled={isProcessing}
            style={{ width: '50px', height: '40px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          />
          <TextField
            value={fontColor}
            onChange={(e) => onFontColorChange(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 100 }}
            disabled={isProcessing}
            placeholder="#808080"
          />
        </Box>

        {/* Opacity */}
        <TextField
          label={t('opacity')}
          type="number"
          value={opacityInput}
          onChange={(e) => onOpacityInputChange(e.target.value)}
          onBlur={onOpacityBlur}
          slotProps={{
            htmlInput: { min: 0, max: 100, step: 1 },
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
          }}
          size="small"
          sx={{ flex: 1, minWidth: 150 }}
          disabled={isProcessing}
          error={(() => {
            const numValue = parseFloat(opacityInput);
            return opacityInput !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100);
          })()}
          helperText={(() => {
            const numValue = parseFloat(opacityInput);
            if (opacityInput === '') return '0-100%';
            if (isNaN(numValue)) return 'Please enter a valid number';
            if (numValue < 0) return 'Opacity must be at least 0%';
            if (numValue > 100) return 'Opacity must be at most 100%';
            return '0-100%';
          })()}
        />
      </Box>
    </>
  );
};
