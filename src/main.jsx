import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AudioLines, Check, ChevronDown, CircleHelp, Clock3, FileAudio2, FileVideo2, Film, FolderOpen, HardDrive, LoaderCircle, Music2, Play, Plus, Scissors, Settings2, SlidersHorizontal, X } from 'lucide-react'
import './style.css'

const tasks = [
  { id: 'convert', title: 'Converti', detail: 'Formato e codec', icon: AudioLines },
  { id: 'trim', title: 'Taglia', detail: 'Intervallo clip', icon: Scissors },
  { id: 'audio', title: 'Estrai audio', detail: 'Traccia audio', icon: Music2 },
  { id: 'custom', title: 'Opzioni FFmpeg', detail: 'Comando personalizzato', icon: Settings2 },
]
const videoFormats = ['mp4', 'webm', 'mov', 'mkv', 'gif']
const audioFormats = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a']

function App() {
  const [file, setFile] = useState(null)
  const [task, setTask] = useState('convert')
  const [format, setFormat] = useState('mp4')
  const [start, setStart] = useState('00:00:00')
  const [end, setEnd] = useState('00:00:15')
  const [options, setOptions] = useState('-vf scale=1280:-1 -crf 28')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('In attesa di un file')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const isVideo = file && /\.(mp4|mov|mkv|webm|avi|mpeg|mpg)$/i.test(file.name)

  useEffect(() => window.frameDesktop.onProgress(setProgress), [])

  async function chooseFile() {
    const selected = await window.frameDesktop.openFile()
    if (!selected) return
    setFile(selected); setError(''); setComplete(false); setProgress(0); setEnd('00:00:15')
    setFormat(/\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(selected.name) ? 'mp3' : 'mp4')
    setTask('convert'); setStatus('File pronto per la conversione')
  }

  async function run() {
    if (!file) return
    setBusy(true); setProgress(0); setError(''); setComplete(false); setStatus('Scegli dove salvare il risultato…')
    try {
      const outputFormat = task === 'audio' ? 'mp3' : format
      const outputPath = await window.frameDesktop.saveFile({ inputPath: file.path, format: outputFormat })
      if (!outputPath) { setStatus('Operazione annullata'); return }
      setStatus('FFmpeg sta elaborando il file…')
      await window.frameDesktop.run({ inputPath: file.path, outputPath, task, format: outputFormat, start, end, options })
      setComplete(true); setStatus('Conversione completata')
    } catch (e) { setError(e?.message || 'Operazione non riuscita. Controlla il file e riprova.'); setStatus('Operazione non riuscita') }
    finally { setBusy(false) }
  }

  const selectedTask = tasks.find((item) => item.id === task)
  const formats = isVideo ? videoFormats : audioFormats
  const FileIcon = isVideo ? FileVideo2 : FileAudio2
  return <main className="app-shell">
    <header className="app-titlebar">
      <div className="brand"><span className="brand-mark"><Film size={16}/></span><span className="brand-name">Frame</span><span className="brand-divider"/><span className="brand-product">FFmpeg Studio</span></div>
      <div className="titlebar-project">Nuova conversione</div>
      <div className="titlebar-actions"><span className="local-status"><span className="status-dot"/> Offline</span><button className="titlebar-button" aria-label="Informazioni"><CircleHelp size={15}/></button></div>
    </header>

    <div className="app-layout">
      <aside className="sidebar">
        <div className="side-heading">WORKSPACE</div>
        <button className="nav-item nav-selected"><span className="nav-icon"><Film size={16}/></span><span>Conversione</span><span className="nav-chevron">›</span></button>
        <div className="side-heading mode-heading">STRUMENTI</div>
        <nav className="task-nav" aria-label="Strumenti di conversione">
          {tasks.map((item) => <button key={item.id} className={`task-item ${task===item.id?'task-selected':''}`} onClick={()=>setTask(item.id)}><span className="nav-icon"><item.icon size={16}/></span><span className="task-label"><b>{item.title}</b><small>{item.detail}</small></span>{task===item.id&&<span className="task-indicator"/>}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="engine-dot"/><div><b>FFmpeg pronto</b><small>Elaborazione locale</small></div><Settings2 size={14}/></div>
      </aside>

      <section className="main-view">
        <header className="view-heading"><div><div className="breadcrumb">WORKSPACE <span>/</span> {selectedTask?.title.toUpperCase()}</div><h1>{selectedTask?.title}</h1><p>Seleziona la sorgente e imposta le opzioni di output.</p></div><div className="view-tools"><span className="build-tag">DESKTOP · WINDOWS</span></div></header>

        <div className="work-grid">
          <section className="source-panel">
            <div className="panel-heading"><div><h2>Sorgente</h2><p>File audio o video da elaborare</p></div><button className="subtle-button" onClick={chooseFile}><Plus size={14}/>{file?'Cambia file':'Aggiungi file'}</button></div>
            {!file ? <button className="source-drop" onClick={chooseFile}><span className="drop-glyph"><FolderOpen size={20}/></span><b>Apri un file multimediale</b><small>Seleziona un file dal computer</small><span className="drop-formats"><FileVideo2 size={13}/> MP4, MOV, MKV, WEBM <i/> <FileAudio2 size={13}/> MP3, WAV, FLAC</span></button> : <div className="media-card"><span className="media-type"><FileIcon size={19}/></span><div className="media-details"><b title={file.name}>{file.name}</b><div><span>{isVideo?'Video':'Audio'}</span><i/>{(file.size/1048576).toFixed(1)} MB</div></div><button className="remove-file" aria-label="Rimuovi file" onClick={()=>{setFile(null);setComplete(false);setError('');setStatus('In attesa di un file')}}><X size={16}/></button></div>}

            <div className="source-meta"><div className="meta-heading"><span>DETTAGLI</span>{file&&<span className="ready-badge"><Check size={11}/> SORGENTE PRONTA</span>}</div><div className="meta-row"><span><HardDrive size={13}/> Percorso</span><b>{file?file.path:'Nessun file selezionato'}</b></div><div className="meta-row"><span><Clock3 size={13}/> Stato</span><b className={complete?'text-green':''}>{status}</b></div></div>

            {error&&<div className="error-box">{error}</div>}
            {complete&&<div className="success-box"><span className="success-icon"><Check size={14}/></span><span><b>Conversione completata</b><small>Il risultato è stato salvato nella cartella scelta.</small></span></div>}
            {busy&&<div className="progress-box"><div className="progress-top"><span>ELABORAZIONE</span><b>{progress>0?`${progress}%`:'Avvio…'}</b></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><button onClick={()=>window.frameDesktop.cancel()}>Annulla operazione</button></div>}
            {!file&&<div className="privacy-note"><span className="privacy-check"><Check size={12}/></span><span>I file non lasciano il computer. L’app funziona senza connessione.</span></div>}
          </section>

          <aside className="settings-panel">
            <div className="panel-heading settings-heading"><div><h2>Impostazioni</h2><p>Configura il risultato</p></div><SlidersHorizontal size={16}/></div>
            {(task==='convert'||task==='custom')&&<div className="setting-field"><label htmlFor="output-format">Formato di output</label><div className="select-control"><select id="output-format" value={format} onChange={(e)=>setFormat(e.target.value)}>{formats.map((f)=><option key={f} value={f}>{f.toUpperCase()}</option>)}{isVideo&&<optgroup label="Solo audio">{audioFormats.map((f)=><option key={f} value={f}>{f.toUpperCase()} · audio</option>)}</optgroup>}</select><ChevronDown size={14}/></div><small>Il codec viene scelto automaticamente in base al formato.</small></div>}
            {task==='trim'&&<div className="setting-field"><label>Intervallo clip</label><div className="range-fields"><div><span>INIZIO</span><input value={start} onChange={(e)=>setStart(e.target.value)} placeholder="00:00:00"/></div><span className="range-divider">→</span><div><span>FINE</span><input value={end} onChange={(e)=>setEnd(e.target.value)} placeholder="00:00:15"/></div></div><small>Formato orario: ore:minuti:secondi.</small></div>}
            {task==='audio'&&<div className="output-info"><span className="output-icon"><Music2 size={15}/></span><div><b>Estrai traccia audio</b><small>MP3 · 192 kb/s</small></div><span className="format-pill">MP3</span></div>}
            {task==='custom'&&<div className="setting-field custom-options"><label htmlFor="ffmpeg-options">Opzioni FFmpeg</label><textarea id="ffmpeg-options" value={options} onChange={(e)=>setOptions(e.target.value)} spellCheck="false"/><small>Es. <code>-vf scale=1280:-1 -crf 28</code>. Input e percorso di output sono gestiti dall’app.</small></div>}
            <div className="settings-separator"/>
            <div className="output-location"><span className="folder-icon"><FolderOpen size={14}/></span><div><b>Destinazione</b><small>La scegli dopo aver avviato l’elaborazione</small></div></div>
            <div className="settings-footer"><div className="privacy-inline"><span className="status-dot"/> FFmpeg locale</div><button className="run-button" disabled={!file||busy} onClick={run}>{busy?<><LoaderCircle className="spin" size={15}/>Elaborazione</>:complete?<><Check size={15}/>Converti di nuovo</>:<><Play size={14} fill="currentColor"/>Avvia</>}</button></div>
          </aside>
        </div>

        <footer className="statusbar"><div><span className="status-dot"/> {status}</div><div>FFmpeg <span className="statusbar-separator">·</span> {file?`${(file.size/1048576).toFixed(1)} MB`:'Pronto'}</div></footer>
      </section>
    </div>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)

