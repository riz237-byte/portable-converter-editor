import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AudioLines, Check, ChevronDown, Clapperboard, Download, FileAudio2, FileVideo2, Film, FolderOpen, Gauge, LoaderCircle, Music2, Play, Scissors, Settings2, Sparkles, X } from 'lucide-react'
import './style.css'

const tasks = [
  { id: 'convert', title: 'Converti', icon: AudioLines, hint: 'Cambia formato audio o video' },
  { id: 'trim', title: 'Taglia', icon: Scissors, hint: 'Seleziona un intervallo preciso' },
  { id: 'audio', title: 'Estrai audio', icon: Music2, hint: 'Salva la traccia audio' },
  { id: 'custom', title: 'FFmpeg', icon: Settings2, hint: 'Personalizza le opzioni' },
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
  const [status, setStatus] = useState('Pronto per lavorare offline')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const isVideo = file && /\.(mp4|mov|mkv|webm|avi|mpeg|mpg)$/i.test(file.name)

  useEffect(() => window.frameDesktop.onProgress(setProgress), [])

  async function chooseFile() {
    const selected = await window.frameDesktop.openFile()
    if (!selected) return
    setFile(selected); setError(''); setComplete(false); setProgress(0); setEnd('00:00:15')
    setFormat(/\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(selected.name) ? 'mp3' : 'mp4')
    setTask('convert')
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
      setComplete(true); setStatus('Operazione completata')
    } catch (e) { setError(e?.message || 'Operazione non riuscita. Controlla il file e riprova.'); setStatus('Operazione non riuscita') }
    finally { setBusy(false) }
  }

  const selectedTask = tasks.find((item) => item.id === task)
  const formats = isVideo ? videoFormats : audioFormats
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><Film size={19}/></span><span>frame<span className="brand-dot">.</span></span></a><div className="top-note"><span className="status-dot online"/> Applicazione desktop · Elaborazione locale</div><span className="offline-chip">OFFLINE</span></header>
    <section className="hero"><div className="eyebrow"><Sparkles size={14}/> IL TUO STUDIO MULTIMEDIALE</div><h1>Il controllo creativo,<br/><span>in ogni fotogramma.</span></h1><p>Converti, taglia e trasforma i tuoi file con FFmpeg.<br className="desktop"/> Tutto sul tuo computer, anche senza internet.</p></section>
    <section className="workspace">
      <aside className="sidebar"><div className="side-label">STRUMENTI</div>{tasks.map((item)=><button key={item.id} className={`task-link ${task===item.id?'active':''}`} onClick={()=>setTask(item.id)}><span className="task-icon"><item.icon size={18}/></span><span className="task-copy"><b>{item.title}</b><small>{item.hint}</small></span>{task===item.id&&<span className="active-mark"/>}</button>)}<div className="privacy-card"><span className="privacy-icon"><Check size={15}/></span><div><b>I tuoi file restano tuoi</b><p>FFmpeg elabora tutto sul PC. Nessun caricamento online.</p></div></div></aside>
      <div className="editor"><div className="editor-heading"><div><div className="eyebrow muted">AREA DI LAVORO</div><h2>{selectedTask?.title}</h2><p>{selectedTask?.hint}</p></div><span className="engine-chip"><span className="status-dot online"/> FFmpeg incluso</span></div>
        {!file ? <button className="dropzone" onClick={chooseFile}><span className="upload-icon"><FolderOpen size={23}/></span><b>Scegli un file dal computer</b><span>Apri un file audio o video da convertire</span><small><FileVideo2 size={14}/> Video <i/> <FileAudio2 size={14}/> Audio <i/> Nessun upload</small></button> : <div className="file-card">{isVideo?<FileVideo2 size={21}/>:<FileAudio2 size={21}/>}<div className="file-info"><b>{file.name}</b><small>{(file.size/1048576).toFixed(1)} MB · {isVideo?'Video':'Audio'}</small></div><button className="icon-button" aria-label="Rimuovi file" onClick={()=>{setFile(null);setComplete(false);setError('')}}><X size={18}/></button></div>}
        {file&&<><div className="settings-panel">
          {(task==='convert'||task==='custom')&&<div className="field-row"><label>Formato di uscita</label><div className="format-wrap"><select value={format} onChange={(e)=>setFormat(e.target.value)}>{formats.map((f)=><option key={f} value={f}>{f.toUpperCase()}</option>)}{isVideo&&<optgroup label="Solo audio">{audioFormats.map((f)=><option key={f} value={f}>{f.toUpperCase()} · audio</option>)}</optgroup>}</select><ChevronDown size={16}/></div><span className="field-hint">{format.toUpperCase()}</span></div>}
          {task==='trim'&&<div className="field-row trim-row"><label>Intervallo clip</label><div className="time-fields"><label>DA<input value={start} onChange={(e)=>setStart(e.target.value)} placeholder="00:00:00"/></label><span className="range-dash">—</span><label>A<input value={end} onChange={(e)=>setEnd(e.target.value)} placeholder="00:00:15"/></label></div><span className="field-hint">hh:mm:ss</span></div>}
          {task==='audio'&&<div className="info-row"><span className="mini-icon"><Music2 size={16}/></span><div><b>Estrazione audio</b><small>Formato MP3 · bitrate 192 kb/s</small></div><span className="field-hint">AUDIO</span></div>}
          {task==='custom'&&<div className="custom-field"><label>Opzioni FFmpeg</label><textarea value={options} onChange={(e)=>setOptions(e.target.value)} spellCheck="false"/><small>Scrivi opzioni come <code>-vf scale=1280:-1 -crf 28</code>. Input e salvataggio sono gestiti dall’app.</small></div>}
        </div><div className="action-row"><button className="secondary-button" disabled={busy} onClick={chooseFile}><FolderOpen size={16}/> Cambia file</button><button className="primary-button" disabled={busy} onClick={run}>{busy?<><LoaderCircle className="spin" size={17}/> {progress>0?`${progress}%`:'Avvio…'}</>:complete?<><Check size={16}/> Converti di nuovo</>:<><Play size={16} fill="currentColor"/> Avvia elaborazione</>}</button></div>
          {busy&&<div className="progress-wrap"><div className="progress-track"><span style={{width:`${progress}%`}}/></div><small>{status}</small><button className="cancel-button" onClick={()=>window.frameDesktop.cancel()}>Annulla</button></div>}{error&&<div className="error-box">{error}</div>}{complete&&<div className="success-box"><span className="result-check"><Check size={18}/></span><span><b>File pronto e salvato</b><small>Trovi il risultato nella cartella scelta.</small></span><Download size={17}/></div>}
        </>}
        {!file&&<div className="tips"><div><span className="tip-icon"><Gauge size={16}/></span><span><b>Funziona offline</b><small>FFmpeg è incluso nell’applicazione.</small></span></div><div><span className="tip-icon"><Clapperboard size={16}/></span><span><b>Qualità sotto controllo</b><small>Impostazioni semplici o opzioni FFmpeg.</small></span></div></div>}
      </div>
    </section><footer><span>FRAME STUDIO <span className="brand-dot">·</span> FFmpeg PER WINDOWS</span><span>Nessuna connessione internet necessaria.</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)

