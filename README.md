# Frame FFmpeg Studio

Applicazione desktop per Windows, in italiano. Converte audio e video, ritaglia clip con anteprima, estrae l'audio e offre controlli visuali per le opzioni FFmpeg. Include anche il download di video o audio da link YouTube pubblici. FFmpeg, yt-dlp e Deno vengono inclusi nell'installer; la conversione e i file locali restano sul computer. Il download YouTube richiede una connessione internet.

## Creare l'installer Windows

Richiede Node.js 22 o superiore e Windows x64. Per creare l'installer scarica i componenti ufficiali yt-dlp e Deno nella cartella `resources` prima della compilazione:

```powershell
npm install
npm run dist:win
```

Per una compilazione locale, scaricare `yt-dlp.exe` dalla release ufficiale yt-dlp e `deno.exe` dalla release ufficiale Deno, poi inserirli in `resources/`.

L'installer `.exe` viene creato nella cartella `release`.

## Generare un download da GitHub

Il workflow `.github/workflows/release.yml` scarica yt-dlp e Deno, compila l'app e allega l'installer alle GitHub Releases quando viene pubblicato un tag versione, ad esempio `v1.0.0`. Dopo la pubblicazione, chiunque potrà scaricare il file `.exe` dalla pagina **Releases** del repository.

L'installer è per Windows 64 bit; la firma digitale non è configurata, quindi Windows potrebbe mostrare l'avviso standard per applicazioni non firmate.
