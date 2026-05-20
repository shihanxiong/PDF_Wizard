import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import './App.css';
import { Box, Tabs, Tab, AppBar, Toolbar, Typography, CircularProgress } from '@mui/material';
import { SettingsDialog } from './components/SettingsDialog';
import logo from './assets/img/app_logo.png';
import { OnFileDrop, OnFileDropOff, EventsOn } from '../wailsjs/runtime/runtime';
import { useI18n } from './utils/i18n';
import { usePersistedLanguage } from './hooks/usePersistedLanguage';
import { MAIN_TAB_IDS, type MainTabId } from './utils/constants';

const TAB_LABEL_KEY: Record<
  MainTabId,
  'mergeTab' | 'splitTab' | 'rotateTab' | 'watermarkTab' | 'imagesToPdfTab' | 'pdfToTextTab' | 'lockUnlockTab'
> = {
  merge: 'mergeTab',
  split: 'splitTab',
  rotate: 'rotateTab',
  watermark: 'watermarkTab',
  imagesToPdf: 'imagesToPdfTab',
  pdfToText: 'pdfToTextTab',
  lockUnlock: 'lockUnlockTab',
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
      style={{ height: '100%', minHeight: 0, display: activeTabId === panelId ? 'block' : 'none' }}
      {...other}
    >
      <Box sx={{ height: '100%', minHeight: 0 }}>{children}</Box>
    </div>
  );
}

interface TabComponentProps {
  onFileDrop: (handler: (paths: string[]) => void) => void;
}

const MergeTab = lazy(() => import('./components/MergeTab').then((module) => ({ default: module.MergeTab })));
const SplitTab = lazy(() => import('./components/SplitTab').then((module) => ({ default: module.SplitTab })));
const RotateTab = lazy(() => import('./components/RotateTab').then((module) => ({ default: module.RotateTab })));
const WatermarkTab = lazy(() =>
  import('./components/WatermarkTab').then((module) => ({ default: module.WatermarkTab })),
);
const ImagesToPdfTab = lazy(() =>
  import('./components/ImagesToPdfTab').then((module) => ({ default: module.ImagesToPdfTab })),
);
const LockUnlockTab = lazy(() =>
  import('./components/LockUnlockTab').then((module) => ({ default: module.LockUnlockTab })),
);
const PdfToTextTab = lazy(() =>
  import('./components/PdfToTextTab').then((module) => ({ default: module.PdfToTextTab })),
);

const TAB_COMPONENT: Record<MainTabId, React.LazyExoticComponent<React.ComponentType<TabComponentProps>>> = {
  merge: MergeTab,
  split: SplitTab,
  rotate: RotateTab,
  watermark: WatermarkTab,
  imagesToPdf: ImagesToPdfTab,
  pdfToText: PdfToTextTab,
  lockUnlock: LockUnlockTab,
};

export const App = () => {
  const { t } = useI18n();
  const { language } = usePersistedLanguage();
  const [tabId, setTabId] = useState<MainTabId>('merge');
  const [visitedTabs, setVisitedTabs] = useState<Set<MainTabId>>(() => new Set<MainTabId>(['merge']));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeTabIdRef = useRef<MainTabId>('merge');
  const dropHandlersRef = useRef<Partial<Record<MainTabId, (paths: string[]) => void>>>({});

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
    setVisitedTabs((prev) => {
      if (prev.has(tabId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
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

  const renderTabPanel = (panelId: MainTabId) => {
    const shouldRender = visitedTabs.has(panelId);
    const TabComponent = TAB_COMPONENT[panelId];
    return (
      <TabPanel key={panelId} activeTabId={tabId} panelId={panelId}>
        {shouldRender ? (
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 8 }}>
                <CircularProgress size={24} />
              </Box>
            }
          >
            <TabComponent
              onFileDrop={(handler: (paths: string[]) => void) => (dropHandlersRef.current[panelId] = handler)}
            />
          </Suspense>
        ) : null}
      </TabPanel>
    );
  };

  return (
    <Box
      id="App"
      sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#ffffff' }}
    >
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar sx={{ px: 2, minHeight: '64px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src={logo}
              alt="PDF Wizard Logo"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ height: '40px', width: '40px', marginRight: '10px', userSelect: 'none' }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {t('appTitle')}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Tabs
              value={tabId}
              onChange={handleTabChange}
              aria-label="PDF Wizard tabs"
              sx={{
                minHeight: 'auto',
                '& .MuiTab-root': {
                  px: 1.25,
                },
                ...(language === 'en' && {
                  '& .MuiTab-root': {
                    fontSize: '0.8125rem',
                    minHeight: 40,
                    py: 0.75,
                    px: 1,
                  },
                }),
              }}
            >
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
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {MAIN_TAB_IDS.map((id) => renderTabPanel(id))}
      </Box>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
