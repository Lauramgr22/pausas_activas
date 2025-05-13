import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Tray, Menu } from 'electron';

let pausaWin: BrowserWindow | null = null;
let configWin: BrowserWindow | null = null;
let tray: Tray | null = null;

function cargarConfiguracion() {
  const configPath = path.join(__dirname, '../public/config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

function mostrarPausa(duracion: number) {
  pausaWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  pausaWin.loadFile(path.join(__dirname, '../public/index.html'));

  setTimeout(() => {
    pausaWin?.close();
    pausaWin = null;
  }, duracion * 1000);
}

function abrirConfiguracion() {
  if (configWin) {
    configWin.show(); // Si ya existe, solo la mostramos
    return;
  }
  configWin = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  configWin.loadFile(path.join(__dirname, '../public/config.html'));
  
  configWin.on('close', (e) => {
    e.preventDefault();       
    configWin?.hide();       
  });

  configWin.on('closed', () => {
    configWin = null;        
  });
}

app.whenReady().then(() => {
  const iconPath = path.join(__dirname, '../public/icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir configuración', click: () => abrirConfiguracion() },
    { label: 'Salir', click: () => app.quit() }
  ]);
  tray.setToolTip('Pausas Activas');
  tray.setContextMenu(contextMenu);

  const config = cargarConfiguracion();
  mostrarPausa(config.duracionSegundos);

  setInterval(() => {
    if (!pausaWin) {
      const nuevaConfig = cargarConfiguracion();
      mostrarPausa(nuevaConfig.duracionSegundos);
    }
  }, config.intervaloMinutos * 60 * 1000);

  globalShortcut.register('Control+Shift+C', abrirConfiguracion);
});


app.on('window-all-closed', () => {
  //if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('guardar-config', (event, nuevaConfig) => {
  const ruta = path.join(__dirname, '../public/config.json');
  fs.writeFileSync(ruta, JSON.stringify(nuevaConfig, null, 2), 'utf-8');
});
