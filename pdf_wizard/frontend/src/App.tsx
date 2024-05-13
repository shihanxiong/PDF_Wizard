import { useState } from 'react';
import './App.css';
import { styled } from '@mui/material/styles';
import { Greet } from '../wailsjs/go/main/App';
import { Box, Button, Container, TextField } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export const App = () => {
  const [filePath, setFilePath] = useState<String>('');
  const [startPage, setStartPage] = useState<Number | null>(null);
  const [endPage, setEndPage] = useState<Number | null>(null);

  const processPdf = () => {
    console.log('!!!!!!!!!', filePath, startPage, endPage);
  };

  return (
    <Container id="App">
      <Box sx={{ p: 5 }}>
        <Button component="label" role={undefined} variant="contained" startIcon={<CloudUploadIcon />}>
          Select files
          <VisuallyHiddenInput type="file" onChange={(e) => setFilePath(e.target.value)} />
        </Button>

        <Button component="label" role={undefined} variant="contained" startIcon={<CloudDownloadIcon />}>
          Select output directory
          <VisuallyHiddenInput type="file" onChange={(e) => setFilePath(e.target.value)} />
        </Button>

        <TextField
          id="outlined-number"
          label="Start Page"
          type="number"
          size="small"
          onChange={(e) => setStartPage(parseInt(e.target.value))}
        />

        <TextField
          id="outlined-number"
          label="End Page"
          type="number"
          size="small"
          onChange={(e) => setEndPage(parseInt(e.target.value))}
        />

        <Button variant="contained" onClick={() => processPdf()}>
          Process
        </Button>
      </Box>
    </Container>
  );
};
