# README images

How each image was made, so the next refresh is a re-run. Re-take an image when the screen it shows changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| editor.webp | The editor with post 1 open, slide 1 on the canvas | see "Demo data", then open `/newspapper/?post=1` and reload so nothing is selected | 1440×900 @2x | made-up posts | 2026-10-09 |
| editing.gif | Retyping slide 1's heading, then scrolling the preview to slides 2 and 3 | same post, at `/?post=1` on the dev server; recorded with a Chromium screencast, about 9 s (see "Capture") | 1280×800, scaled to 960 wide | made-up posts | 2026-11-07 |
| posts.webp | The posts list with three cards, one published | `/newspapper/posts` after the demo posts are rendered and post 2 is published | 1440×700 @2x | made-up posts | 2026-10-09 |
| slides.gif | The four JPEGs a render wrote for post 1, 1.6 s each | built from `output/<run>/slide-01.jpg` … `slide-04.jpg` with ffmpeg | 540×540 with a 1 px border | made-up posts | 2026-10-09 |

## Demo data

The screenshots never use the owner's database or the old runs in `output/`. Those runs date from June 2026, before the Wizard rebuild: they are PNGs from the v3 pipeline, which had a model write the slides, and they name a real politician. So the captures use a throwaway database, filled by hand with made-up posts about "Sample City":

1. Start the app against scratch paths, with the Reader's background refresh off so nothing fetches the real feeds:

   ```bash
   NEWSPAPPER_DB_PATH=/tmp/np-demo/newspapper.db OUTPUT_DIR=/tmp/np-demo/output \
   UPLOADS_DIR=/tmp/np-demo/uploads READER_REFRESH_MINUTES=0 npm run dev
   ```

2. Sign in with a tester account, never the owner's: make one on the scratch database with `NEWSPAPPER_DB_PATH=/tmp/np-demo/newspapper.db SEED_USERNAME=tester SEED_PASSWORD=… npm run seed --workspace=api`. The header shows the account name, so it must be a tester's. (Until 2026-10-13 this step went through the local Ward.)
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

The editing GIF is recorded with a Chromium screencast (Playwright's CDP session, `Page.startScreencast` as PNG), keeping each frame's timestamp. `agent-browser record` drops idle time, so it is not used. The dev server serves the app at `/` unless `NEWSPAPPER_BASE` is set, so the post is at `http://localhost:4321/?post=1`. The editor autosaves, so before each take put post 1's hand-written markup back with `PUT /api/posts/1`, then load the post and reload it so nothing is selected. The beats: about 0.4 s idle; focus the textarea and select the heading's text (`Sample City's trams will run all night`) with `setSelectionRange`; hold 0.8 s; `keyboard type` "Night trams start on 1 November" one word at a time, 0.2 s between words; hold 0.5 s; `scrollBy({ top: 421, behavior: 'smooth' })` on the preview column, hold 1 s, scroll again, hold 1.1 s. Write the frames with an ffmpeg concat list whose `duration` lines are the gaps between timestamps (0.5 s for the last), and convert with

```bash
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -vf "setpts=1.25*PTS,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 editing.gif
```

The slides GIF:

```bash
ffmpeg -y -loglevel error -framerate 1/1.6 -i slide-%02d.jpg \
  -vf "scale=538:538:flags=lanczos,pad=540:540:1:1:color=0xc9c4bf,fps=5,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none" \
  -loop 0 slides.gif
```
