import { useState, useEffect, useRef } from 'react';
import './App.css';
import { Box, Tabs, Tab, AppBar, Toolbar, Typography } from '@mui/material';
import { MergeTab } from './components/MergeTab';
import { SplitTab } from './components/SplitTab';
import { RotateTab } from './components/RotateTab';
import { WatermarkTab } from './components/WatermarkTab';
import { SettingsDialog } from './components/SettingsDialog';
import logo from './assets/img/app_logo.png';
import { OnFileDrop, OnFileDropOff, EventsOn } from '../wailsjs/runtime/runtime';
import { GetLanguage, SetLanguage } from '../wailsjs/go/main/App';
import { t, setLanguage, type Language } from './utils/i18n';
import { isValidLanguage } from './utils/i18n/constants';
import { MAIN_TAB_IDS, type MainTabId } from './utils/constants';

const TAB_LABEL_KEY: Record<MainTabId, 'mergeTab' | 'splitTab' | 'rotateTab' | 'watermarkTab'> = {
  merge: 'mergeTab',
  split: 'splitTab',
  rotate: 'rotateTab',
  watermark: 'watermarkTab',
};

interface TabPanelProps {
  children?: React.ReactNode;
  activeTabId: MainTabId;
  panelId: MainTabId;
}

function TabPanel(props: TabPanelProps) {
  const { children, activeTabId, panelId, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={activeTabId !== panelId}
      id={`pdf-wizard-tabpanel-${panelId}`}
      aria-labelledby={`pdf-wizard-tab-${panelId}`}
      style={{ height: '100%', display: activeTabId === panelId ? 'block' : 'none' }}
      {...other}
    >
      <Box sx={{ height: '100%' }}>{children}</Box>
    </div>
  );
}

export const App = () => {
  const [tabId, setTabId] = useState<MainTabId>('merge');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, forceUpdate] = useState({});
  const activeTabIdRef = useRef<MainTabId>('merge');
  const dropHandlersRef = useRef<Partial<Record<MainTabId, (paths: string[]) => void>>>({});

  // Load language on startup
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const lang = await GetLanguage();
        // Validate language code and default to 'en' if invalid
        const language = (isValidLanguage(lang) ? lang : 'en') as Language;
        setLanguage(language);
        forceUpdate({}); // Force re-render to update UI
      } catch (err) {
        console.error('Failed to load language:', err);
      }
    };
    loadLanguage();
  }, []);

  // Listen for settings event from menu
  useEffect(() => {
    const unsubscribe = EventsOn('show-settings', () => {
      setSettingsOpen(true);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Keep ref in sync for OnFileDrop callback (registered once on mount)
  useEffect(() => {
    activeTabIdRef.current = tabId;
  }, [tabId]);

  // Set up drag and drop at app level to work anywhere on the window
  // Cross-platform implementation that works on both macOS and Windows
  // Register once, not re-register on tab change
  useEffect(() => {
    const handleFileDrop = (_x: number, _y: number, paths: string[]) => {
      if (!paths || paths.length === 0) {
        return;
      }

      const id = activeTabIdRef.current;
      const handler = dropHandlersRef.current[id];
      if (handler) {
        handler(paths);
      }
    };

    try {
      OnFileDrop(handleFileDrop, false);
    } catch (error) {
      console.error('Failed to register OnFileDrop:', error);
    }

    return () => {
      try {
        OnFileDropOff();
      } catch {
        // Ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: unknown) => {
    setTabId(newValue as MainTabId);
  };

  const handleLanguageChange = (language: Language) => {
    setLanguage(language);
    forceUpdate({}); // Force re-render to update all translated text
  };

  return (
    <Box
      id="App"
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#ffffff' }}
    >
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar sx={{ px: 2, minHeight: '64px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <img
              src={logo}
              alt="PDF Wizard Logo"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ height: '40px', width: '40px', marginRight: '12px', userSelect: 'none' }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {t('appTitle')}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Tabs value={tabId} onChange={handleTabChange} aria-label="PDF Wizard tabs" sx={{ minHeight: 'auto' }}>
              {MAIN_TAB_IDS.map((tab) => (
                <Tab
                  key={tab}
                  label={t(TAB_LABEL_KEY[tab])}
                  value={tab}
                  id={`pdf-wizard-tab-${tab}`}
                  aria-controls={`pdf-wizard-tabpanel-${tab}`}
                />
              ))}
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <TabPanel activeTabId={tabId} panelId="merge">
          <MergeTab onFileDrop={(handler: (paths: string[]) => void) => (dropHandlersRef.current.merge = handler)} />
        </TabPanel>
        <TabPanel activeTabId={tabId} panelId="split">
          <SplitTab onFileDrop={(handler: (paths: string[]) => void) => (dropHandlersRef.current.split = handler)} />
        </TabPanel>
        <TabPanel activeTabId={tabId} panelId="rotate">
          <RotateTab onFileDrop={(handler: (paths: string[]) => void) => (dropHandlersRef.current.rotate = handler)} />
        </TabPanel>
        <TabPanel activeTabId={tabId} panelId="watermark">
          <WatermarkTab
            onFileDrop={(handler: (paths: string[]) => void) => (dropHandlersRef.current.watermark = handler)}
          />
        </TabPanel>
      </Box>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLanguageChange={handleLanguageChange}
      />
    </Box>
  );
};
