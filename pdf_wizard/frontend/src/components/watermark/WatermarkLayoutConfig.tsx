import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useI18n } from '../../utils/i18n';

export interface WatermarkLayoutConfigProps {
  rotation: number;
  onRotationChange: (value: number) => void;
  position: string;
  onPositionChange: (value: string) => void;
  fontFamily: string;
  onFontFamilyChange: (value: string) => void;
  isProcessing: boolean;
}

const fontFamilyOptions = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Symbol',
];

const getFontStyle = (fontName: string) => {
  if (fontName === 'Helvetica' || fontName === 'Times-Roman' || fontName === 'Courier') {
    return {
      fontFamily:
        fontName === 'Helvetica'
          ? 'Helvetica, Arial, sans-serif'
          : fontName === 'Times-Roman'
          ? 'Times, "Times New Roman", serif'
          : 'Courier, "Courier New", monospace',
    };
  } else if (fontName.includes('Bold') && fontName.includes('Oblique')) {
    return {
      fontFamily: fontName.startsWith('Helvetica')
        ? 'Helvetica, Arial, sans-serif'
        : fontName.startsWith('Times')
        ? 'Times, "Times New Roman", serif'
        : 'Courier, "Courier New", monospace',
      fontWeight: 'bold',
      fontStyle: 'italic',
    };
  } else if (fontName.includes('Bold')) {
    return {
      fontFamily: fontName.startsWith('Helvetica')
        ? 'Helvetica, Arial, sans-serif'
        : fontName.startsWith('Times')
        ? 'Times, "Times New Roman", serif'
        : 'Courier, "Courier New", monospace',
      fontWeight: 'bold',
    };
  } else if (fontName.includes('Oblique') || fontName.includes('Italic')) {
    return {
      fontFamily: fontName.startsWith('Helvetica')
        ? 'Helvetica, Arial, sans-serif'
        : fontName.startsWith('Times')
        ? 'Times, "Times New Roman", serif'
        : 'Courier, "Courier New", monospace',
      fontStyle: 'italic',
    };
  } else if (fontName === 'Symbol') {
    return {
      fontFamily: 'Symbol, serif',
    };
  }
  return {};
};

export const WatermarkLayoutConfig = ({
  rotation,
  onRotationChange,
  position,
  onPositionChange,
  fontFamily,
  onFontFamilyChange,
  isProcessing,
}: WatermarkLayoutConfigProps) => {
  const { t } = useI18n();

  const positionOptions = [
    { value: 'center', label: t('positionCenter') },
    { value: 'top-left', label: t('positionTopLeft') },
    { value: 'top-center', label: t('positionTopCenter') },
    { value: 'top-right', label: t('positionTopRight') },
    { value: 'middle-left', label: t('positionMiddleLeft') },
    { value: 'middle-right', label: t('positionMiddleRight') },
    { value: 'bottom-left', label: t('positionBottomLeft') },
    { value: 'bottom-center', label: t('positionBottomCenter') },
    { value: 'bottom-right', label: t('positionBottomRight') },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {/* Rotation */}
      <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
        <InputLabel>{t('rotation')}</InputLabel>
        <Select
          value={rotation}
          label={t('rotation')}
          onChange={(e) => onRotationChange(Number(e.target.value))}
          disabled={isProcessing}
        >
          <MenuItem value={0}>0°</MenuItem>
          <MenuItem value={45}>45°</MenuItem>
          <MenuItem value={90}>90°</MenuItem>
          <MenuItem value={-45}>-45°</MenuItem>
          <MenuItem value={-90}>-90°</MenuItem>
          <MenuItem value={180}>180°</MenuItem>
        </Select>
      </FormControl>

      {/* Position */}
      <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
        <InputLabel>{t('position')}</InputLabel>
        <Select
          value={position}
          label={t('position')}
          onChange={(e) => onPositionChange(e.target.value)}
          disabled={isProcessing}
        >
          {positionOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Font Family */}
      <FormControl size="small" sx={{ flex: 1, minWidth: 150 }}>
        <InputLabel>{t('fontFamily')}</InputLabel>
        <Select
          value={fontFamily}
          label={t('fontFamily')}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          disabled={isProcessing}
        >
          {fontFamilyOptions.map((font) => (
            <MenuItem key={font} value={font} sx={getFontStyle(font)}>
              {font}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
