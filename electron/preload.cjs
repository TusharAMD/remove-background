const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  version: '1.0.0'
});
