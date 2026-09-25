const { app, BrowserWindow, shell, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SETTINGS_FILE = 'settings.json';

let currentSettings = null;
let saveTimeout = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

function loadSettings() {
  const defaults = {
    windowState: {
      width: 1400,
      height: 900,
      isMaximized: false
    },
    language: 'ja'
  };

  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      return {
        windowState: parsed.windowState || defaults.windowState,
        language: (parsed.language === 'en' || parsed.language === 'ja') ? parsed.language : defaults.language
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return defaults;
}

function saveSettingsSync() {
  if (!currentSettings) return;
  try {
    const settingsPath = getSettingsPath();
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function debouncedSaveSettings() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveSettingsSync();
  }, 400);
}

function getValidWindowState(savedState) {
  const defaults = {
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    isMaximized: false
  };

  if (!savedState || typeof savedState !== 'object') {
    return defaults;
  }

  const width = Number.isInteger(savedState.width) && savedState.width >= defaults.minWidth
    ? savedState.width
    : defaults.width;
  const height = Number.isInteger(savedState.height) && savedState.height >= defaults.minHeight
    ? savedState.height
    : defaults.height;

  const x = savedState.x;
  const y = savedState.y;
  let hasValidPosition = false;

  if (Number.isInteger(x) && Number.isInteger(y)) {
    try {
      const displays = screen.getAllDisplays();
      hasValidPosition = displays.some(display => {
        const area = display.workArea;
        return (
          x + 100 >= area.x &&
          x <= area.x + area.width - 100 &&
          y >= area.y &&
          y <= area.y + area.height - 100
        );
      });
    } catch {
      hasValidPosition = false;
    }
  }

  return {
    width,
    height,
    x: hasValidPosition ? x : undefined,
    y: hasValidPosition ? y : undefined,
    isMaximized: !!savedState.isMaximized
  };
}

function updateWindowState(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
      const bounds = mainWindow.getBounds();
      currentSettings.windowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: false
      };
    } else {
      if (!currentSettings.windowState) {
        currentSettings.windowState = { width: 1400, height: 900 };
      }
      currentSettings.windowState.isMaximized = isMaximized;
    }
    debouncedSaveSettings();
  } catch (err) {
    console.error('Error updating window state:', err);
  }
}

function getWindowTitle(lang) {
  return lang === 'en'
    ? 'mace-man 3D Builder - Local 3D Model Editor'
    : 'mace-man 3D Builder - ローカル3Dモデルエディター';
}

function setAppLanguage(mainWindow, lang) {
  if (lang !== 'ja' && lang !== 'en') return;
  currentSettings.language = lang;
  saveSettingsSync();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle(getWindowTitle(lang));
    mainWindow.webContents.send('change-language', lang);
    setupMenu(mainWindow, lang);
  }
}

let mainWindow = null;

function createWindow() {
  currentSettings = loadSettings();
  const validState = getValidWindowState(currentSettings.windowState);
  const lang = currentSettings.language || 'ja';

  const windowConfig = {
    width: validState.width,
    height: validState.height,
    minWidth: 960,
    minHeight: 640,
    title: getWindowTitle(lang),
    backgroundColor: '#1a1a1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webgl: true
    },
    show: false // Show when ready-to-show to prevent visual flash
  };

  if (validState.x !== undefined && validState.y !== undefined) {
    windowConfig.x = validState.x;
    windowConfig.y = validState.y;
  }

  mainWindow = new BrowserWindow(windowConfig);

  if (validState.isMaximized) {
    mainWindow.maximize();
  }

  // Track window bounds and maximize state
  mainWindow.on('resize', () => updateWindowState(mainWindow));
  mainWindow.on('move', () => updateWindowState(mainWindow));
  mainWindow.on('maximize', () => {
    if (currentSettings) {
      if (!currentSettings.windowState) currentSettings.windowState = { width: 1400, height: 900 };
      currentSettings.windowState.isMaximized = true;
      debouncedSaveSettings();
    }
  });
  mainWindow.on('unmaximize', () => {
    setTimeout(() => updateWindowState(mainWindow), 100);
  });
  mainWindow.on('close', () => {
    updateWindowState(mainWindow);
    saveSettingsSync();
  });

  // Ready to show window
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load URL or dist/index.html
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Setup application menu
  setupMenu(mainWindow, lang);
}

function setupMenu(win, lang = 'ja') {
  const isMac = process.platform === 'darwin';
  const isEn = lang === 'en';

  const menuLabels = {
    about: isEn ? 'About mace-man 3D Builder' : 'mace-man 3D Builder について',
    services: isEn ? 'Services' : 'サービス',
    hide: isEn ? 'Hide' : '隠す',
    hideOthers: isEn ? 'Hide Others' : '他を隠す',
    unhide: isEn ? 'Show All' : 'すべて表示',
    quit: isEn ? 'Quit' : '終了',
    file: isEn ? 'File' : 'ファイル',
    close: isEn ? 'Close Window' : 'ウィンドウを閉じる',
    view: isEn ? 'View' : '表示',
    reload: isEn ? 'Reload' : '再読み込み',
    forceReload: isEn ? 'Force Reload' : '強制再読み込み',
    toggleDevTools: isEn ? 'Toggle Developer Tools' : '開発者ツールの切り替え',
    resetZoom: isEn ? 'Actual Size' : 'ズームリセット',
    zoomIn: isEn ? 'Zoom In' : '拡大',
    zoomOut: isEn ? 'Zoom Out' : '縮小',
    fullscreen: isEn ? 'Toggle Full Screen' : '全画面表示の切り替え',
    language: isEn ? 'Language' : '言語',
    help: isEn ? 'Help' : 'ヘルプ',
    github: isEn ? 'GitHub Repository' : 'GitHub リポジトリ',
    version: (isEn ? 'Version: ' : 'バージョン: ') + app.getVersion()
  };

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: menuLabels.about },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: menuLabels.hide },
        { role: 'hideOthers', label: menuLabels.hideOthers },
        { role: 'unhide', label: menuLabels.unhide },
        { type: 'separator' },
        { role: 'quit', label: menuLabels.quit }
      ]
    }] : []),
    {
      label: menuLabels.file,
      submenu: [
        isMac ? { role: 'close', label: menuLabels.close } : { role: 'quit', label: menuLabels.quit }
      ]
    },
    {
      label: menuLabels.view,
      submenu: [
        { role: 'reload', label: menuLabels.reload },
        { role: 'forceReload', label: menuLabels.forceReload },
        { role: 'toggleDevTools', label: menuLabels.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: menuLabels.resetZoom },
        { role: 'zoomIn', label: menuLabels.zoomIn },
        { role: 'zoomOut', label: menuLabels.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: menuLabels.fullscreen }
      ]
    },
    {
      label: menuLabels.language,
      submenu: [
        {
          label: '日本語 (Japanese)',
          type: 'radio',
          checked: lang === 'ja',
          click: () => {
            setAppLanguage(win, 'ja');
          }
        },
        {
          label: 'English',
          type: 'radio',
          checked: lang === 'en',
          click: () => {
            setAppLanguage(win, 'en');
          }
        }
      ]
    },
    {
      label: menuLabels.help,
      submenu: [
        {
          label: menuLabels.github,
          click: async () => {
            await shell.openExternal('https://github.com/mace-man/maceman_3dbuilder');
          }
        },
        { type: 'separator' },
        {
          label: menuLabels.version,
          enabled: false
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-initial-settings', () => {
  if (!currentSettings) {
    currentSettings = loadSettings();
  }
  return {
    language: currentSettings.language || 'ja',
    windowState: currentSettings.windowState
  };
});

ipcMain.on('save-language', (event, lang) => {
  if (lang === 'ja' || lang === 'en') {
    if (!currentSettings) currentSettings = loadSettings();
    currentSettings.language = lang;
    saveSettingsSync();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(getWindowTitle(lang));
      setupMenu(mainWindow, lang);
    }
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  saveSettingsSync();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
