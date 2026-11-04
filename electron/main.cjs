const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')

const ffmpegStatic = require('ffmpeg-static')
let mainWindow
let activeProcess

function ffmpegExecutable() {
  if (!app.isPackaged) return ffmpegStatic
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
}

function helperExecutable(name) {
  return app.isPackaged ? path.join(process.resourcesPath, name) : path.join(__dirname, '..', 'resources', name)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160, height: 790, minWidth: 760, minHeight: 620,
    backgroundColor: '#14161a', title: 'Frame FFmpeg Studio',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  mainWindow.removeMenu()
  if (app.isPackaged) mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  else mainWindow.loadURL('http://127.0.0.1:5173')
}

function isTrusted(event) { return mainWindow && event.sender === mainWindow.webContents }

ipcMain.handle('file:open', async (event) => {
  if (!isTrusted(event)) return null
  const choice = await dialog.showOpenDialog(mainWindow, {
    title: 'Scegli un file audio o video', properties: ['openFile'],
    filters: [{ name: 'Audio e video', extensions: ['mp4','mov','mkv','webm','avi','mpeg','mpg','m4v','mp3','wav','aac','ogg','flac','m4a','wma'] }, { name: 'Tutti i file', extensions: ['*'] }]
  })
  if (choice.canceled || !choice.filePaths[0]) return null
  const filePath = choice.filePaths[0]
  return { path: filePath, name: path.basename(filePath), size: fs.statSync(filePath).size }
})

ipcMain.handle('file:preview-url', (event, filePath) => {
  if (!isTrusted(event) || typeof filePath !== 'string' || !path.isAbsolute(filePath)) return ''
  return pathToFileURL(filePath).href
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

function timeInSeconds(value) {
  const parts = String(value).split(':').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return NaN
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

ipcMain.handle('ffmpeg:run', async (event, job) => {
  if (!isTrusted(event) || activeProcess) throw new Error('Attendi il termine dell’operazione in corso.')
  const { inputPath, outputPath, task, format, start, end, options = {} } = job || {}
  if (typeof inputPath !== 'string' || typeof outputPath !== 'string' || !path.isAbsolute(inputPath) || !path.isAbsolute(outputPath)) throw new Error('Percorso file non valido.')
  const video = /\.(mp4|mov|mkv|webm|avi|mpeg|mpg|m4v)$/i.test(inputPath)
  let args
  if (task === 'trim') {
    const from = timeInSeconds(start), to = timeInSeconds(end)
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) throw new Error('Controlla l’intervallo: la fine deve essere dopo l’inizio.')
    args = ['-ss', start, '-i', inputPath, '-t', String(to - from), '-c', 'copy']
  } else if (task === 'audio') args = ['-i', inputPath, '-vn', '-b:a', ['128k','192k','256k','320k'].includes(options.bitrate) ? options.bitrate : '192k']
  else if (task === 'advanced') {
    const videoCodecs = { h264: 'libx264', h265: 'libx265', vp9: 'libvpx-vp9' }
    const audioCodecs = { aac: 'aac', opus: 'libopus', copy: 'copy' }
    const quality = { high: '18', balanced: '23', small: '28' }
    const resolutions = { '1080': '1920:1080', '720': '1280:720', '480': '854:480' }
    const codec = videoCodecs[options.codec] || 'libx264'
    const audioCodec = audioCodecs[options.audio] || 'aac'
    args = ['-i', inputPath, '-c:v', codec, '-crf', quality[options.quality] || '23', '-preset', 'medium', '-c:a', audioCodec]
    if (audioCodec !== 'copy') args.push('-b:a', ['128k','192k','256k','320k'].includes(options.bitrate) ? options.bitrate : '192k')
    if (resolutions[options.resolution]) args.push('-vf', `scale=${resolutions[options.resolution]}:force_original_aspect_ratio=decrease`)
  } else if (format === 'gif') args = ['-i', inputPath, '-vf', 'fps=12,scale=720:-1:flags=lanczos', '-loop', '0']
  else if (video && ['mp4','mov','mkv','webm','avi'].includes(format)) args = ['-i', inputPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac']
  else args = ['-i', inputPath, '-vn', '-b:a', '192k']
  args.push('-y', '-progress', 'pipe:1', '-nostats', outputPath)

  return new Promise((resolve, reject) => {
    let stderr = '', stdoutBuffer = ''
    try { activeProcess = spawn(ffmpegExecutable(), args, { windowsHide: true, shell: false }) }
    catch (error) { activeProcess = null; reject(error); return }
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

ipcMain.handle('ffmpeg:cancel', (event) => { if (isTrusted(event) && activeProcess) activeProcess.kill() })

ipcMain.handle('youtube:download', async (event, { url, format }) => {
  if (!isTrusted(event) || activeProcess) throw new Error('Attendi il termine dell’operazione in corso.')
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('Inserisci un link YouTube valido.') }
  const hosts = new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'])
  if (parsed.protocol !== 'https:' || !hosts.has(parsed.hostname.toLowerCase())) throw new Error('Sono accettati solo link HTTPS di YouTube.')
  if (!['video','audio'].includes(format)) throw new Error('Scegli video oppure solo audio.')
  const directory = await dialog.showOpenDialog(mainWindow, { title: 'Scegli la cartella di download', properties: ['openDirectory','createDirectory'] })
  if (directory.canceled || !directory.filePaths[0]) return { canceled: true }
  const downloader = helperExecutable('yt-dlp.exe')
  const deno = helperExecutable('deno.exe')
  if (!fs.existsSync(downloader) || !fs.existsSync(deno)) throw new Error('Manca un componente per il download. Reinstalla l’ultima versione dell’app.')
  const template = path.join(directory.filePaths[0], '%(title).180B [%(id)s].%(ext)s')
  const args = ['--no-playlist','--newline','--progress','--remote-components','ejs:github','--js-runtimes',`deno:${deno}`,'-P',directory.filePaths[0],'-o',template]
  if (format === 'audio') args.push('-f','ba/b','-x','--audio-format','mp3','--audio-quality','0')
  else args.push('-f','bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best','--merge-output-format','mp4')
  args.push('--', parsed.href)
  return new Promise((resolve, reject) => {
    let output = ''
    try { activeProcess = spawn(downloader, args, { windowsHide: true, shell: false, cwd: directory.filePaths[0] }) }
    catch (error) { activeProcess = null; reject(new Error(`Il download non si è avviato: ${error.message}`)); return }
    const consume = (chunk) => {
      output += chunk.toString()
      if (output.length > 16000) output = output.slice(-16000)
      const matches = [...output.matchAll(/(?:^|\s)(\d{1,3}(?:\.\d+)?)%/gm)]
      if (matches.length) mainWindow?.webContents.send('youtube:progress', Math.min(99, Math.round(Number(matches.at(-1)[1]))))
    }
    activeProcess.stdout.on('data', consume); activeProcess.stderr.on('data', consume)
    activeProcess.on('error', (error) => { activeProcess = null; reject(new Error(`Il download non si è avviato: ${error.message}`)) })
    activeProcess.on('close', (code) => {
      activeProcess = null
      if (code === 0) { mainWindow?.webContents.send('youtube:progress', 100); resolve({ directory: directory.filePaths[0] }) }
      else {
        const cleaned = output.split(/\r?\n/).filter(Boolean).slice(-5).join(' ').replace(/\x1b\[[0-9;]*m/g,'')
        reject(new Error(cleaned || `YouTube ha terminato con codice ${code}. Controlla che il video sia pubblico e riprova.`))
      }
    })
  })
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
