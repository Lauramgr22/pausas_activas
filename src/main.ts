import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let pausaWin: BrowserWindow | null = null;
let configWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let globalInterval: NodeJS.Timeout | null = null;

const configPath = path.join(__dirname, '../public/config.json');

function cargarConfiguracion() {
  if (!fs.existsSync(configPath)) {
    const defaultConfig = { intervaloMinutos: 10, duracionSegundos: 20 };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

let config = cargarConfiguracion();

function mostrarPausa(duracion: number) {
  pausaWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true
    }
  });

  pausaWin.loadFile(path.join(__dirname, '../public/index.html'));

  pausaWin.on('closed', () => {
    pausaWin = null;
  });

  const ventanaRef = pausaWin;
  setTimeout(() => {
    if (ventanaRef && !ventanaRef.isDestroyed()) {
      ventanaRef.close();
    }
  }, duracion * 1000);
}

function abrirConfiguracion() {
  if (configWin) {
    configWin.show();
    configWin.focus();
    return;
  }

  configWin = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  configWin.loadFile(path.join(__dirname, '../public/config.html'));

  configWin.once('ready-to-show', () => {
    configWin?.show();
  });

  configWin.on('close', (e) => {
    e.preventDefault();
    configWin?.hide();
  });

  configWin.on('closed', () => {
    configWin = null;
  });
}

function iniciarPausas() {
  if (globalInterval) clearInterval(globalInterval);
  globalInterval = setInterval(() => {
    if (!pausaWin) {
      const cfg = cargarConfiguracion();
      mostrarPausa(cfg.duracionSegundos);
    }
  }, config.intervaloMinutos * 60 * 1000);
}


app.whenReady().then(() => {
  const iconPath = path.join(__dirname, '../public/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir configuración', click: () => abrirConfiguracion() },
    {
      label: 'Salir',
      click: () => {
        tray?.destroy();
        globalShortcut.unregisterAll();
        if (globalInterval) clearInterval(globalInterval);
        pausaWin?.destroy();
        configWin?.destroy();
    
        app.quit();
        app.exit(0); // Forzar cierre
      }
    }
    
  ]);

  tray.setToolTip('Pausas Activas');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => abrirConfiguracion());

  mostrarPausa(cargarConfiguracion().duracionSegundos);
  iniciarPausas();
  globalShortcut.register('Control+Shift+C', abrirConfiguracion);
});

app.on('window-all-closed', () => {
  // Mantener la app corriendo en segundo plano
});

ipcMain.on('guardar-config', (event, nuevaConfig) => {
  config = { ...config, ...nuevaConfig };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  iniciarPausas();
});
