const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('frameDesktop', {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (details) => ipcRenderer.invoke('file:save', details),
  run: (job) => ipcRenderer.invoke('ffmpeg:run', job),
  cancel: () => ipcRenderer.invoke('ffmpeg:cancel'),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('ffmpeg:progress', listener)
    return () => ipcRenderer.removeListener('ffmpeg:progress', listener)
  }
})

