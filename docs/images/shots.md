# README images

How each image was made, so the next refresh is a re-run. Re-take an image when the screen it shows changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| editor.webp | The editor with post 1 open, slide 1 on the stage over the strip | see "Demo data", then open `/newspapper/?post=1` and reload so nothing is selected | 1440×900 @2x | made-up posts | 2026-11-16 |
| editing.gif | Retyping slide 1's heading, then picking slides 2 and 3 from the strip | same post; recorded with a Chromium screencast, about 9 s (see "Capture") | 1280×800, scaled to 960 wide | made-up posts | 2026-11-16 |
| posts.webp | The posts list with three cards, the middle one published | `/newspapper/posts` after the demo posts are rendered and post 2 is published | 1440×620 @2x | made-up posts | 2026-11-16 |
| reader.webp | The Reader with five feeds, the unread items and item 1 open | `/newspapper/reader`, then click the first item | 1440×900 @2x | made-up feeds and items | 2026-11-16 |
| slides.gif | The four JPEGs a render wrote for post 1, 1.6 s each | built from `output/<run>/slide-01.jpg` … `slide-04.jpg` with ffmpeg | 540×540 with a 1 px border | made-up posts | 2026-10-09 |

All but `slides.gif` show the Contact sheet chrome of 2026-11-13. `slides.gif` shows the render, which the redesign did not touch: on 2026-11-16 post 1 rendered again from the markup below matched its frames.

For comparing every screen in both themes and at phone width, `e2e/shots.spec.ts` takes them on the stubbed API of `e2e/fixtures.ts` (`SHOTS_DIR=<folder> npx playwright test -c e2e/playwright.config.ts shots`). Those fixtures list real outlets among their feed names, so they are not used for the README.

## Demo data

The screenshots never use the owner's database or the old runs in `output/`. Those runs date from June 2026, before the Wizard rebuild: they are PNGs from the v3 pipeline, which had a model write the slides, and they name a real politician. So the captures use a throwaway database, filled with made-up content about "Sample City".

1. Start the app against scratch paths, with the Reader's background refresh off so nothing fetches a feed. Any free ports do: the UI's `--port` overrides the config, and `PUBLIC_ORIGIN` must name the UI's origin or sign-in is refused as cross-site.

   ```bash
   export NEWSPAPPER_DB_PATH=/tmp/np-demo/newspapper.db OUTPUT_DIR=/tmp/np-demo/output \
     UPLOADS_DIR=/tmp/np-demo/uploads READER_REFRESH_MINUTES=0 NEWSPAPPER_BASE=/newspapper/ \
     PORT=3001 PUBLIC_ORIGIN=http://localhost:4321
   npm run dev --workspace=api
   npm run dev --workspace=ui -- --port 4321    # in a second terminal, same exports
   ```

   Render needs the Chromium of the `playwright` package (1.60), not the one `npx playwright` installs (1.63); see the main README.

2. Sign in with a tester account, never the owner's. The header shows the account name, so it must be a tester's: `SEED_USERNAME=tester SEED_PASSWORD="$DEMO_PASS" npm run seed --workspace=api` with the same `NEWSPAPPER_DB_PATH`, where `DEMO_PASS` is a random value in your shell (`openssl rand -hex 12`), never in a file.
3. Opening the database also copies `data/sources.json` into its `sources` table, because the seed runs for whatever file `NEWSPAPPER_DB_PATH` names. That list is the owner's real feeds. Delete those rows before any Reader shot: `DELETE FROM sources WHERE rss_url NOT LIKE '%.example.test/%'`.
4. Post 1 (`warm-industrial-1`), rendered and left as a draft. This markup is what `editor.webp`, `editing.gif` and `slides.gif` show:

   ```wzd
   <head>
     <title>Sample City's trams will run all night</title>
     <description>Line 4 goes 24-hour on weekends from 1 November.</description>
     <keywords>transport, trams, sample city</keywords>
     <date>2026-10-09</date>
     <caption>Sample City's Line 4 runs all night on Fridays and Saturdays from 1 November.</caption>
     <hashtags>#samplecity #transport #trams</hashtags>
   </head>

   <body>
     <Slide>
       <Kicker>Transport</Kicker>
       <Heading size="xl">Sample City's trams will run all night</Heading>
       <Text emphasis="muted">Line 4 goes 24-hour on Fridays and Saturdays from 1 November.</Text>
     </Slide>

     <Slide>
       <Heading size="lg">What changes</Heading>
       <List size="lg">
         <Item>A tram every 20 minutes between midnight and 5 a.m.</Item>
         <Item>Night fares cost the same as day fares</Item>
         <Item>Three new stops near the hospital</Item>
       </List>
       <PageCounter />
     </Slide>

     <Slide>
       <Stat size="xl" label="new night departures each weekend">96</Stat>
       <Divider />
       <Text size="lg">The trial runs until March, when the council decides whether to keep it.</Text>
       <PageCounter />
     </Slide>

     <Slide>
       <Quote size="lg" by="Sample City Transit">We counted who waits for a tram at 2 a.m. Mostly nurses, bakers and cleaners.</Quote>
       <Source>Sample City Transit, press note, 2026-10-09</Source>
       <PageCounter />
     </Slide>
   </body>
   ```

5. Posts 2 and 3, two slides each in the same shape: "The central library opens on Sundays" (`warm-industrial-2`, keywords `libraries, sample city`, rendered and published) and "Riverside Park reopens after flood repairs" (`warm-industrial-3`, keywords `parks, sample city`, rendered, left as a draft). Creating and rendering all three through `POST /api/posts` and `POST /api/posts/:id/render`, with the session cookie from `POST /api/auth/login`, is quickest.
6. The Reader: five made-up feeds on `example.test` (Harbour Post, Metro Times and Sample City Council under City, Green Notes under Environment, Tech Weekly under Tech) and fourteen made-up items about Sample City, inserted straight into `sources` and `feed_items`, three of them marked read. The first item, "Night trams: the council publishes the Line 4 timetable", has a body of a few paragraphs, a heading and a quote. Never press Refresh: nothing in the Reader shot came from a feed.

Rendering runs the local Chromium only. Nothing in these steps calls a paid or outside service.

## Capture

The stills come from a short Playwright script (not kept in the repo) that adds the tester's session cookie to a context with `viewport` 1440×900 (1440×620 for the posts page), `deviceScaleFactor: 2` and `timezoneId: "Europe/Bucharest"`, waits for network idle and `document.fonts.ready`, then screenshots the viewport. Convert with

```bash
ffmpeg -y -loglevel error -i editor.png -c:v libwebp -quality 82 editor.webp
```

The editing GIF is recorded with a Chromium screencast (Playwright's CDP session, `Page.startScreencast` as PNG), keeping each frame's timestamp. The editor autosaves, so before each take put post 1's markup back with `PUT /api/posts/1`, then load the post and reload it so nothing is selected. The beats, at 1280×800: about 0.4 s idle; focus the textarea and select the heading's text (`Sample City's trams will run all night`) with `setSelectionRange`; hold 0.8 s; `keyboard type` "Trams run all night" one word at a time, 0.22 s between words; hold 0.8 s and wait for "Saved"; click the "Slide 2" thumbnail, hold 1.1 s; click "Slide 3", hold 1.3 s. Click a thumbnail on its label: on 2026-11-16 a click on the text inside a thumbnail left the stage on the current slide. Write the frames with an ffmpeg concat list whose `duration` lines are the gaps between timestamps (1.2 s for the last), and convert with

```bash
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -vf "setpts=1.25*PTS,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 editing.gif
```

The slides GIF:

```bash
ffmpeg -y -loglevel error -framerate 1/1.6 -i slide-%02d.jpg \
  -vf "scale=538:538:flags=lanczos,pad=540:540:1:1:color=0xc9c4bf,fps=5,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none" \
  -loop 0 slides.gif
```
