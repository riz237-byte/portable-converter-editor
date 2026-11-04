# Frame FFmpeg Studio

Applicazione desktop per Windows, in italiano. Converte audio e video, ritaglia clip, estrae l'audio e permette di aggiungere opzioni FFmpeg. FFmpeg viene incluso nell'installer: dopo aver installato l'app, i file vengono elaborati localmente senza browser, upload o connessione internet.

## Creare l'installer Windows

Richiede Node.js 22 o superiore e Windows x64 per generare il pacchetto Windows.

```powershell
npm install
npm run dist:win
```

L'installer `.exe` viene creato nella cartella `release`.

## Generare un download da GitHub

Il workflow `.github/workflows/release.yml` compila l'app e pubblica automaticamente l'installer Windows in una GitHub Release a ogni aggiornamento del branch `main`. Il download si trova nella pagina **Releases** del repository.

L'installer è per Windows 64 bit; la firma digitale non è configurata, quindi Windows potrebbe mostrare l'avviso standard per applicazioni non firmate.

