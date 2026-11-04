const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const { createRequire } = require('node:module')

const require = createRequire(__filename)
const ffmpegStatic = require('ffmpeg-static')
let mainWindow
let activeProcess

function ffmpegExecutable() {
  if (!app.isPackaged) return ffmpegStatic
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160, height: 790, minWidth: 760, minHeight: 620,
    backgroundColor: '#0b0d12', title: 'Frame FFmpeg Studio',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  mainWindow.removeMenu()
  if (app.isPackaged) mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  else mainWindow.loadURL('http://127.0.0.1:5173')
}

function isTrusted(event) {
  return mainWindow && event.sender === mainWindow.webContents
}

ipcMain.handle('file:open', async (event) => {
  if (!isTrusted(event)) return null
  const choice = await dialog.showOpenDialog(mainWindow, {
    title: 'Scegli un file audio o video', properties: ['openFile'],
    filters: [{ name: 'Audio e video', extensions: ['mp4','mov','mkv','webm','avi','mpeg','mpg','mp3','wav','aac','ogg','flac','m4a','wma'] }, { name: 'Tutti i file', extensions: ['*'] }]
  })
  if (choice.canceled || !choice.filePaths[0]) return null
  const filePath = choice.filePaths[0]
  return { path: filePath, name: path.basename(filePath), size: require('node:fs').statSync(filePath).size }
})

ipcMain.handle('file:save', async (event, { inputPath, format }) => {
  if (!isTrusted(event) || typeof inputPath !== 'string' || typeof format !== 'string') return null
  const original = path.basename(inputPath, path.extname(inputPath))
  const choice = await dialog.showSaveDialog(mainWindow, {
    title: 'Salva il file convertito', defaultPath: path.join(path.dirname(inputPath), `${original}.${format}`),
    filters: [{ name: `${format.toUpperCase()} file`, extensions: [format] }]
  })
  return choice.canceled ? null : choice.filePath
})

function parseOptions(input) {
  const values = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((value) => value.replace(/^["']|["']$/g, '')) || []
  const blocked = new Set(['-i','-y','-n','-f','-progress','-report','-dump','-version','-h','-loglevel'])
  if (values.some((value) => blocked.has(value.toLowerCase()) || /^(?:[a-z]:\\|\\\\|https?:|file:)/i.test(value))) {
    throw new Error('Non inserire input, output o percorsi nelle opzioni: l’app li gestisce per te.')
  }
  return values
}

function timeInSeconds(value) {
  const parts = value.split(':').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return NaN
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

ipcMain.handle('ffmpeg:run', async (event, job) => {
  if (!isTrusted(event) || activeProcess) throw new Error('Attendi il termine dell’operazione in corso.')
  const { inputPath, outputPath, task, format, start, end, options = '' } = job || {}
  if (typeof inputPath !== 'string' || typeof outputPath !== 'string' || !path.isAbsolute(inputPath) || !path.isAbsolute(outputPath)) throw new Error('Percorso file non valido.')
  const video = /\.(mp4|mov|mkv|webm|avi|mpeg|mpg)$/i.test(inputPath)
  let args
  if (task === 'trim') {
    const from = timeInSeconds(start), to = timeInSeconds(end)
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) throw new Error('Controlla l’intervallo: la fine deve essere dopo l’inizio.')
    args = ['-ss', start, '-i', inputPath, '-t', String(to - from), '-c', 'copy']
  } else if (task === 'audio') args = ['-i', inputPath, '-vn', '-b:a', '192k']
  else if (task === 'custom') args = ['-i', inputPath, ...parseOptions(options)]
  else if (format === 'gif') args = ['-i', inputPath, '-vf', 'fps=12,scale=720:-1:flags=lanczos', '-loop', '0']
  else if (video && ['mp4','mov','mkv','webm','avi'].includes(format)) args = ['-i', inputPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac']
  else args = ['-i', inputPath, '-vn', '-b:a', '192k']
  args.push('-y', '-progress', 'pipe:1', '-nostats', outputPath)

  return new Promise((resolve, reject) => {
    let stderr = '', stdoutBuffer = ''
    try {
      activeProcess = spawn(ffmpegExecutable(), args, { windowsHide: true, shell: false })
    } catch (error) { activeProcess = null; reject(error); return }
    activeProcess.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString()
      const lines = stdoutBuffer.split(/\r?\n/); stdoutBuffer = lines.pop() || ''
      for (const line of lines) {
        const match = line.match(/^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
        const duration = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
        if (match && duration) {
          const current = +match[1] * 3600 + +match[2] * 60 + +match[3]
          const total = +duration[1] * 3600 + +duration[2] * 60 + +duration[3]
          mainWindow?.webContents.send('ffmpeg:progress', Math.min(99, Math.round(current / total * 100)))
        }
      }
    })
    activeProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); if (stderr.length > 50000) stderr = stderr.slice(-50000) })
    activeProcess.on('error', (error) => { activeProcess = null; reject(new Error(`FFmpeg non si è avviato: ${error.message}`)) })
    activeProcess.on('close', (code) => {
      activeProcess = null
      if (code === 0) { mainWindow?.webContents.send('ffmpeg:progress', 100); resolve({ outputPath }) }
      else reject(new Error(stderr.match(/(?:Error|Invalid|Unknown)[^\r\n]*/i)?.[0] || `FFmpeg ha terminato con codice ${code}.`))
    })
  })
})

ipcMain.handle('ffmpeg:cancel', (event) => {
  if (isTrusted(event) && activeProcess) { activeProcess.kill(); activeProcess = null }
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

