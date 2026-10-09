# README images

How each image was made, so the next refresh is a re-run. Re-take an image when the screen it shows changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| editor.webp | The editor with post 1 open, slide 1 on the canvas | see "Demo data", then open `/newspapper/?post=1` and reload so nothing is selected | 1440×900 @2x | made-up posts | 2026-10-09 |
| editing.gif | Retyping slide 1's heading, then scrolling the preview to slides 2 and 3 | same post; recorded with `agent-browser record`, about 8 s | 1280×800, scaled to 960 wide | made-up posts | 2026-10-09 |
| posts.webp | The posts list with three cards, one published | `/newspapper/posts` after the demo posts are rendered and post 2 is published | 1440×700 @2x | made-up posts | 2026-10-09 |
| slides.gif | The four JPEGs a render wrote for post 1, 1.6 s each | built from `output/<run>/slide-01.jpg` … `slide-04.jpg` with ffmpeg | 540×540 with a 1 px border | made-up posts | 2026-10-09 |

## Demo data

The screenshots never use the owner's database or the old runs in `output/`. Those runs date from June 2026, before the Wizard rebuild: they are PNGs from the v3 pipeline, which had a model write the slides, and they name a real politician. So the captures use a throwaway database, filled by hand with made-up posts about "Sample City":

1. Start the app against scratch paths, with the Reader's background refresh off so nothing fetches the real feeds:

   ```bash
   NEWSPAPPER_DB_PATH=/tmp/np-demo/newspapper.db OUTPUT_DIR=/tmp/np-demo/output \
   UPLOADS_DIR=/tmp/np-demo/uploads READER_REFRESH_MINUTES=0 npm run dev
   ```

2. Sign in through the local Ward with a tester account, never the owner's. The header shows the account name, so it must be a tester's.
3. Post 1 (`warm-industrial-1`): replace the starter document with a four-slide post titled "Sample City's trams will run all night" (a kicker and `xl` heading, a `lg` list of three items, an `xl` `Stat` of 96 with a divider and text, and a `Quote` with a `Source`). Press Render.
4. Posts 2 and 3: "The central library opens on Sundays" (`warm-industrial-2`, two slides, rendered and published) and "Riverside Park reopens after flood repairs" (`warm-industrial-3`, two slides, rendered, left as a draft). Creating them through `POST /api/posts` from the signed-in page is quickest.

Rendering runs the local Chromium only. Nothing in these steps calls a paid or outside service.

The Reader is not shown: with the refresh off it is empty, and filling it means fetching real news feeds.

## Capture

```bash
agent-browser --session newspapper set viewport 1440 900 2
agent-browser --session newspapper screenshot /abs/path/editor.png
ffmpeg -y -loglevel error -i editor.png -c:v libwebp -quality 82 editor.webp
```

The editing GIF: `record start`, select the heading's text in the textarea with `setSelectionRange`, `keyboard type` the new headline one word at a time, then `scrollBy` the preview column twice; `record stop`. Converted with

```bash
ffmpeg -y -loglevel error -i editing.webm -vf "setpts=1.25*PTS,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 editing.gif
```

The slides GIF:

```bash
ffmpeg -y -loglevel error -framerate 1/1.6 -i slide-%02d.jpg \
  -vf "scale=538:538:flags=lanczos,pad=540:540:1:1:color=0xc9c4bf,fps=5,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none" \
  -loop 0 slides.gif
```
