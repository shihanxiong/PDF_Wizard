import { useState, useEffect, useRef } from 'react';
import './App.css';
import { Box, Tabs, Tab, AppBar, Toolbar, Typography } from '@mui/material';
import { MergeTab } from './components/MergeTab';
import { SplitTab } from './components/SplitTab';
import logo from './assets/img/app_logo.png';
import { OnFileDrop } from '../wailsjs/runtime/runtime';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pdf-wizard-tabpanel-${index}`}
      aria-labelledby={`pdf-wizard-tab-${index}`}
      style={{ height: '100%', display: value === index ? 'block' : 'none' }}
      {...other}
    >
      <Box sx={{ height: '100%' }}>{children}</Box>
    </div>
  );
}

export const App = () => {
  const [tabValue, setTabValue] = useState(0);
  const tabValueRef = useRef(0);
  const mergeTabDropHandler = useRef<((paths: string[]) => void) | null>(null);
  const splitTabDropHandler = useRef<((paths: string[]) => void) | null>(null);

  // Update ref when tab changes
  useEffect(() => {
    tabValueRef.current = tabValue;
  }, [tabValue]);

  // Set up drag and drop at app level to work anywhere on the window
  // Register once, not re-register on tab change
  useEffect(() => {
    OnFileDrop((x: number, y: number, paths: string[]) => {
      // Route to the appropriate tab based on active tab (using ref to get current value)
      if (tabValueRef.current === 0 && mergeTabDropHandler.current) {
        // Merge tab is active
        mergeTabDropHandler.current(paths);
      } else if (tabValueRef.current === 1 && splitTabDropHandler.current) {
        // Split tab is active
        splitTabDropHandler.current(paths);
      }
    }, false);

    // Prevent default browser drag and drop behavior to avoid PDF preview
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragOver = (e: DragEvent) => {
      preventDefaults(e);
    };

    const handleDrop = (e: DragEvent) => {
      preventDefaults(e);
      // Wails OnFileDrop handles the actual file processing
      // We just prevent the browser from trying to open/preview the file
    };

    // Add event listeners to prevent default browser behavior
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragenter', preventDefaults);
    document.addEventListener('dragleave', preventDefaults);

    // Cleanup
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragenter', preventDefaults);
      document.removeEventListener('dragleave', preventDefaults);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only register once on mount

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box id="App" sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar sx={{ px: 2, minHeight: '64px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <img src={logo} alt="PDF Wizard Logo" style={{ height: '40px', width: '40px', marginRight: '12px' }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              PDF Wizard
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="PDF Wizard tabs" sx={{ minHeight: 'auto' }}>
              <Tab label="Merge PDF" id="pdf-wizard-tab-0" aria-controls="pdf-wizard-tabpanel-0" />
              <Tab label="Split PDF" id="pdf-wizard-tab-1" aria-controls="pdf-wizard-tabpanel-1" />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <MergeTab onFileDrop={(handler: (paths: string[]) => void) => (mergeTabDropHandler.current = handler)} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SplitTab onFileDrop={(handler: (paths: string[]) => void) => (splitTabDropHandler.current = handler)} />
        </TabPanel>
      </Box>
    </Box>
  );
};
