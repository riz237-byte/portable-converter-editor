const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('frameDesktop', {
  openFile: () => ipcRenderer.invoke('file:open'),
  getPreviewUrl: (filePath) => ipcRenderer.invoke('file:preview-url', filePath),
  saveFile: (details) => ipcRenderer.invoke('file:save', details),
  run: (job) => ipcRenderer.invoke('ffmpeg:run', job),
  downloadYoutube: (details) => ipcRenderer.invoke('youtube:download', details),
  cancel: () => ipcRenderer.invoke('ffmpeg:cancel'),
  onProgress: (callback) => subscribe('ffmpeg:progress', callback),
  onYoutubeProgress: (callback) => subscribe('youtube:progress', callback)
})
