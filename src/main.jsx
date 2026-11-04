import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AudioLines, Check, CircleHelp, Clock3, FileAudio2, FileVideo2, Film, FolderOpen, HardDrive, LoaderCircle, Music2, Play, Plus, Scissors, Settings2, SlidersHorizontal, X, Youtube } from 'lucide-react'
import './style.css'

const tasks = [
  { id: 'convert', title: 'Converti', detail: 'Formato e codec', icon: AudioLines },
  { id: 'trim', title: 'Taglia', detail: 'Intervallo clip', icon: Scissors },
  { id: 'audio', title: 'Estrai audio', detail: 'Traccia audio', icon: Music2 },
  { id: 'advanced', title: 'Opzioni FFmpeg', detail: 'Controlli avanzati', icon: Settings2 },
  { id: 'youtube', title: 'Scarica da YouTube', detail: 'Video o audio', icon: Youtube },
]
const videoFormats = ['mp4', 'webm', 'mov', 'mkv', 'gif']
const audioFormats = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a']
const timeToSeconds = (value) => { const p = String(value).split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : Number(value) || 0 }
const timeLabel = (seconds) => { const n = Math.max(0, Math.floor(seconds || 0)); return `${String(Math.floor(n / 3600)).padStart(2,'0')}:${String(Math.floor(n % 3600 / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}` }

function App() {
  const [file, setFile] = useState(null)
  const [task, setTask] = useState('convert')
  const [format, setFormat] = useState('mp4')
  const [formatKind, setFormatKind] = useState('video')
  const [start, setStart] = useState('00:00:00')
  const [end, setEnd] = useState('00:00:15')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeFormat, setYoutubeFormat] = useState('video')
  const [advanced, setAdvanced] = useState({ codec: 'h264', quality: 'balanced', resolution: 'source', audio: 'aac', bitrate: '192k' })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('In attesa di un file')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const mediaRef = useRef(null)
  const isVideo = file && /\.(mp4|mov|mkv|webm|avi|mpeg|mpg|m4v)$/i.test(file.name)

  useEffect(() => {
    const offProgress = window.frameDesktop.onProgress(setProgress)
    const offYoutube = window.frameDesktop.onYoutubeProgress(setProgress)
    return () => { offProgress?.(); offYoutube?.() }
  }, [])

  async function chooseFile() {
    const selected = await window.frameDesktop.openFile()
    if (!selected) return
    setFile(selected); setPreviewUrl(window.frameDesktop.getPreviewUrl(selected.path)); setError(''); setComplete(false); setProgress(0); setStart('00:00:00'); setEnd('00:00:15'); setCurrentTime(0); setDuration(0)
    const audioFile = /\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(selected.name)
    setFormatKind(audioFile ? 'audio' : 'video'); setFormat(audioFile ? 'mp3' : 'mp4')
    setTask('convert'); setStatus('File pronto per la conversione')
  }

  function onMediaMetadata() {
    const d = mediaRef.current?.duration
    if (Number.isFinite(d)) { setDuration(d); setEnd(timeLabel(d)); setCurrentTime(0) }
  }

  function seek(value) {
    const seconds = Number(value)
    if (mediaRef.current) mediaRef.current.currentTime = seconds
    setCurrentTime(seconds)
  }

  async function run() {
    if (task === 'youtube' && !youtubeUrl.trim()) return
    if (task !== 'youtube' && !file) return
    setBusy(true); setProgress(0); setError(''); setComplete(false)
    try {
      if (task === 'youtube') {
        setStatus('Seleziona la cartella di destinazione…')
        const downloadResult = await window.frameDesktop.downloadYoutube({ url: youtubeUrl.trim(), format: youtubeFormat })
        if (downloadResult?.canceled) { setStatus('Download annullato'); return }
        setComplete(true); setStatus('Download completato')
      } else {
        setStatus('Scegli dove salvare il risultato…')
        const outputFormat = task === 'audio' ? 'mp3' : format
        const outputPath = await window.frameDesktop.saveFile({ inputPath: file.path, format: outputFormat })
        if (!outputPath) { setStatus('Operazione annullata'); return }
        setStatus('FFmpeg sta elaborando il file…')
        await window.frameDesktop.run({ inputPath: file.path, outputPath, task, format: outputFormat, start, end, options: advanced })
        setComplete(true); setStatus('Elaborazione completata')
      }
    } catch (e) { setError(e?.message || 'Operazione non riuscita. Controlla il file e riprova.'); setStatus('Operazione non riuscita') }
    finally { setBusy(false) }
  }

  const selectedTask = tasks.find((item) => item.id === task)
  const formats = formatKind === 'video' ? videoFormats : audioFormats
  const FileIcon = isVideo ? FileVideo2 : FileAudio2
  const youtubeTask = task === 'youtube'
  return <main className="app-shell">
    <header className="app-titlebar">
      <div className="brand"><span className="brand-mark"><Film size={18}/></span><span className="brand-name">Frame</span><span className="brand-divider"/><span className="brand-product">FFmpeg Studio</span></div>
      <div className="titlebar-project">{youtubeTask ? 'Download multimediale' : 'Nuova conversione'}</div>
      <div className="titlebar-actions"><span className="local-status"><span className="status-dot"/> {youtubeTask ? 'Connessione richiesta' : 'Offline'}</span><button className="titlebar-button" aria-label="Informazioni"><CircleHelp size={17}/></button></div>
    </header>

    <div className="app-layout">
      <aside className="sidebar">
        <div className="side-heading">WORKSPACE</div>
        <button className="nav-item nav-selected"><span className="nav-icon"><Film size={18}/></span><span>Conversione</span><span className="nav-chevron">›</span></button>
        <div className="side-heading mode-heading">STRUMENTI</div>
        <nav className="task-nav" aria-label="Strumenti multimediali">
          {tasks.map((item) => <button key={item.id} className={`task-item ${task===item.id?'task-selected':''}`} onClick={()=>setTask(item.id)}><span className="nav-icon"><item.icon size={18}/></span><span className="task-label"><b>{item.title}</b><small>{item.detail}</small></span>{task===item.id&&<span className="task-indicator"/>}</button>)}
        </nav>
        <div className="sidebar-bottom"><span className="engine-dot"/><div><b>FFmpeg pronto</b><small>Elaborazione locale</small></div><Settings2 size={16}/></div>
      </aside>

      <section className="main-view">
        <header className="view-heading"><div><div className="breadcrumb">WORKSPACE <span>/</span> {selectedTask?.title.toUpperCase()}</div><h1>{selectedTask?.title}</h1><p>{youtubeTask ? 'Incolla un link pubblico e scegli il tipo di file da scaricare.' : 'Seleziona la sorgente e imposta le opzioni di output.'}</p></div><div className="view-tools"><span className="build-tag">DESKTOP · WINDOWS</span></div></header>

        <div className="work-grid">
          <section className="source-panel">
            {youtubeTask ? <>
              <div className="panel-heading"><div><h2>Link YouTube</h2><p>Incolla il link del video pubblico</p></div><span className="youtube-panel-icon"><Youtube size={22}/></span></div>
              <label className="url-field"><span>URL DEL VIDEO</span><input type="url" placeholder="https://www.youtube.com/watch?v=…" value={youtubeUrl} onChange={(e)=>setYoutubeUrl(e.target.value)} disabled={busy}/></label>
              <div className="youtube-note"><span className="privacy-check"><Check size={14}/></span><span>Il file viene scaricato direttamente nella cartella scelta. La connessione serve solo per questo download.</span></div>
              <div className="youtube-legal">Scarica solo contenuti che hai il diritto di salvare. I video privati o protetti potrebbero non essere disponibili.</div>
            </> : <>
              <div className="panel-heading"><div><h2>Sorgente</h2><p>File audio o video da elaborare</p></div><button className="subtle-button" onClick={chooseFile}><Plus size={16}/>{file?'Cambia file':'Aggiungi file'}</button></div>
              {!file ? <button className="source-drop" onClick={chooseFile}><span className="drop-glyph"><FolderOpen size={24}/></span><b>Apri un file multimediale</b><small>Seleziona un file dal computer</small><span className="drop-formats"><FileVideo2 size={15}/> MP4, MOV, MKV, WEBM <i/> <FileAudio2 size={15}/> MP3, WAV, FLAC</span></button> : <div className="media-card"><span className="media-type"><FileIcon size={22}/></span><div className="media-details"><b title={file.name}>{file.name}</b><div><span>{isVideo?'Video':'Audio'}</span><i/>{(file.size/1048576).toFixed(1)} MB</div></div><button className="remove-file" aria-label="Rimuovi file" onClick={()=>{setFile(null);setPreviewUrl('');setComplete(false);setError('');setStatus('In attesa di un file')}}><X size={18}/></button></div>}

              {file && (task === 'trim' || task === 'audio') && <div className="preview-panel">
                <div className="preview-heading"><b>Anteprima</b><span>{timeLabel(currentTime)} <i>/</i> {timeLabel(duration)}</span></div>
                {isVideo ? <video ref={mediaRef} className="media-preview" src={previewUrl} controls onLoadedMetadata={onMediaMetadata} onTimeUpdate={(e)=>setCurrentTime(e.currentTarget.currentTime)} /> : <div className="audio-preview"><span className="audio-preview-icon"><AudioLines size={30}/></span><audio ref={mediaRef} src={previewUrl} controls onLoadedMetadata={onMediaMetadata} onTimeUpdate={(e)=>setCurrentTime(e.currentTarget.currentTime)} /></div>}
                <input aria-label="Scorri nell’anteprima" className="timeline-slider" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(e)=>seek(e.target.value)} />
                <div className="timeline-labels"><span>00:00</span><span>{timeLabel(duration)}</span></div>
              </div>}

              {task==='trim'&&file&&<div className="trim-points"><div><label>INIZIO CLIP</label><input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(timeToSeconds(start), duration || 1)} onChange={(e)=>setStart(timeLabel(e.target.value))}/><b>{start}</b></div><button className="set-point-button" onClick={()=>setStart(timeLabel(currentTime))}>Imposta inizio sul punto attuale</button><div><label>FINE CLIP</label><input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(timeToSeconds(end), duration || 1)} onChange={(e)=>setEnd(timeLabel(e.target.value))}/><b>{end}</b></div><button className="set-point-button" onClick={()=>setEnd(timeLabel(currentTime))}>Imposta fine sul punto attuale</button></div>}

              <div className="source-meta"><div className="meta-heading"><span>DETTAGLI</span>{file&&<span className="ready-badge"><Check size={13}/> SORGENTE PRONTA</span>}</div><div className="meta-row"><span><HardDrive size={16}/> Percorso</span><b>{file?file.path:'Nessun file selezionato'}</b></div><div className="meta-row"><span><Clock3 size={16}/> Stato</span><b className={complete?'text-green':''}>{status}</b></div></div>
              {!file&&<div className="privacy-note"><span className="privacy-check"><Check size={14}/></span><span>I file non lasciano il computer. L’app funziona senza connessione.</span></div>}
            </>}

            {error&&<div className="error-box">{error}</div>}
            {complete&&<div className="success-box"><span className="success-icon"><Check size={16}/></span><span><b>{youtubeTask?'Download completato':'Elaborazione completata'}</b><small>{youtubeTask?'Il contenuto è stato salvato nella cartella scelta.':'Il risultato è stato salvato nella cartella scelta.'}</small></span></div>}
            {busy&&<div className="progress-box"><div className="progress-top"><span>ELABORAZIONE</span><b>{progress>0?`${progress}%`:'Avvio…'}</b></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><button onClick={()=>window.frameDesktop.cancel()}>Annulla operazione</button></div>}
          </section>

          <aside className="settings-panel">
            <div className="panel-heading settings-heading"><div><h2>{youtubeTask?'Download':'Impostazioni'}</h2><p>{youtubeTask?'Scegli cosa scaricare':'Configura il risultato'}</p></div><SlidersHorizontal size={19}/></div>
            {youtubeTask&&<div className="setting-field"><label>Tipo di download</label><div className="choice-grid two-choice"><button className={youtubeFormat==='video'?'choice-selected':''} onClick={()=>setYoutubeFormat('video')}><FileVideo2 size={18}/><b>Video</b><small>Formato MP4</small></button><button className={youtubeFormat==='audio'?'choice-selected':''} onClick={()=>setYoutubeFormat('audio')}><Music2 size={18}/><b>Solo audio</b><small>Formato MP3</small></button></div></div>}
            {(task==='convert'||task==='advanced')&&<div className="setting-field"><label>Formato di output</label><div className="kind-switch"><button className={formatKind==='video'?'active':''} onClick={()=>{setFormatKind('video');setFormat(videoFormats.includes(format)?format:'mp4')}}>Video</button><button className={formatKind==='audio'?'active':''} onClick={()=>{setFormatKind('audio');setFormat(audioFormats.includes(format)?format:'mp3')}}>Audio</button></div><div className="choice-grid format-grid">{formats.map((f)=><button key={f} className={format===f?'choice-selected':''} onClick={()=>setFormat(f)}>{f.toUpperCase()}</button>)}</div><small>Il formato scelto determina il tipo di file in uscita.</small></div>}
            {task==='trim'&&<div className="trim-help"><Scissors size={20}/><b>Seleziona i punti nella sorgente</b><span>Usa i cursori dell’anteprima per trovare il momento giusto, poi imposta inizio e fine della clip.</span></div>}
            {task==='audio'&&<div className="setting-field"><label>Qualità audio</label><div className="choice-grid format-grid">{['128k','192k','256k','320k'].map((bitrate)=><button key={bitrate} className={advanced.bitrate===bitrate?'choice-selected':''} onClick={()=>setAdvanced({...advanced,bitrate})}>{bitrate}</button>)}</div><div className="output-info"><span className="output-icon"><Music2 size={18}/></span><div><b>Estrai traccia audio</b><small>MP3 · {advanced.bitrate}</small></div><span className="format-pill">MP3</span></div></div>}
            {task==='advanced'&&<div className="advanced-fields">
              <ChoiceGroup label="Codec video" value={advanced.codec} values={[['h264','H.264'],['h265','H.265'],['vp9','VP9']]} onChange={(codec)=>setAdvanced({...advanced,codec})}/>
              <ChoiceGroup label="Qualità" value={advanced.quality} values={[['high','Alta'],['balanced','Bilanciata'],['small','File piccolo']]} onChange={(quality)=>setAdvanced({...advanced,quality})}/>
              <ChoiceGroup label="Risoluzione" value={advanced.resolution} values={[['source','Originale'],['1080','1080p'],['720','720p'],['480','480p']]} onChange={(resolution)=>setAdvanced({...advanced,resolution})}/>
              <ChoiceGroup label="Codec audio" value={advanced.audio} values={[['aac','AAC'],['opus','Opus'],['copy','Originale']]} onChange={(audio)=>setAdvanced({...advanced,audio})}/>
              <ChoiceGroup label="Bitrate audio" value={advanced.bitrate} values={[['128k','128'],['192k','192'],['256k','256'],['320k','320']].map(([v,l])=>[v,`${l} kb/s`])} onChange={(bitrate)=>setAdvanced({...advanced,bitrate})}/>
            </div>}
            {!youtubeTask&&<><div className="settings-separator"/><div className="output-location"><span className="folder-icon"><FolderOpen size={17}/></span><div><b>Destinazione</b><small>La scegli dopo aver avviato l’elaborazione</small></div></div></>}
            <div className="settings-footer"><div className="privacy-inline"><span className="status-dot"/> {youtubeTask?'Download online':'FFmpeg locale'}</div><button className="run-button" disabled={busy || (youtubeTask?!youtubeUrl.trim():!file)} onClick={run}>{busy?<><LoaderCircle className="spin" size={17}/>In corso</>:complete?<><Check size={17}/>{youtubeTask?'Scarica ancora':'Ancora'}</>:<><Play size={16} fill="currentColor"/>{youtubeTask?'Scarica':'Avvia'}</>}</button></div>
          </aside>
        </div>

        <footer className="statusbar"><div><span className="status-dot"/> {status}</div><div>{youtubeTask?'YouTube':<>FFmpeg <span className="statusbar-separator">·</span> {file?`${(file.size/1048576).toFixed(1)} MB`:'Pronto'}</>}</div></footer>
      </section>
    </div>
  </main>
}

function ChoiceGroup({label,value,values,onChange}) {
  return <div className="setting-field choice-group"><label>{label}</label><div className="choice-grid">{values.map(([id,title])=><button key={id} className={value===id?'choice-selected':''} onClick={()=>onChange(id)}>{title}</button>)}</div></div>
}

createRoot(document.getElementById('root')).render(<App />)
