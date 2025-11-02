import { useState } from 'react';
import './App.css';
import { Box, Tabs, Tab, AppBar, Toolbar, Typography } from '@mui/material';
import { MergeTab } from './components/MergeTab';
import { SplitTab } from './components/SplitTab';
import logo from './assets/img/app_logo.png';

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
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

export const App = () => {
  const [tabValue, setTabValue] = useState(0);

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
              <Tab label="Merge PDFs" id="pdf-wizard-tab-0" aria-controls="pdf-wizard-tabpanel-0" />
              <Tab label="Split PDFs" id="pdf-wizard-tab-1" aria-controls="pdf-wizard-tabpanel-1" />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <MergeTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SplitTab />
        </TabPanel>
      </Box>
    </Box>
  );
};
