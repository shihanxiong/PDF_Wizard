import { useState } from 'react';
import './App.css';
import { Box, Tabs, Tab } from '@mui/material';
import { MergeTab } from './components/MergeTab';
import { SplitTab } from './components/SplitTab';

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
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="PDF Wizard tabs">
          <Tab label="Merge PDFs" id="pdf-wizard-tab-0" aria-controls="pdf-wizard-tabpanel-0" />
          <Tab label="Split PDFs" id="pdf-wizard-tab-1" aria-controls="pdf-wizard-tabpanel-1" />
        </Tabs>
      </Box>
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
