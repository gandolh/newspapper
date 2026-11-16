# Making a post

One post from an empty editor to a ZIP of slides. This is the walkthrough that used to sit in the main README. The full language reference is the [`.wzd` markup page](../corpus/wiki/markup.md).

## 1. Write it

You land on the editor (`/`) with a starter document already loaded. The left pane is the `.wzd` source. The middle holds the working slide on a live 1080×1080 stage, with a strip of every slide in the post below it. The right holds the component palette and the post's fields. On a phone the three panes become Source, Preview and Inspector tabs.

A document has two top-level elements, and casing carries the meaning. Lowercase tags are metadata; capitalised tags draw.

```wzd
<head>
  <title>Three Things About the Budget</title>
  <description>What actually changed, minus the spin.</description>
  <keywords>budget, economy, tax</keywords>
  <date>2026-08-31</date>
  <caption>The budget dropped. Here's what actually moved.</caption>
  <hashtags>#news #budget #economy</hashtags>
</head>

<body>
  <Slide>
    <Kicker>Economy</Kicker>
    <Heading size="xl">Three things about the budget</Heading>
  </Slide>

  <Slide>
    <Heading>What changed</Heading>
    <List>
      <Item>Fuel duty frozen, again</Item>
      <Item>Income tax thresholds held flat</Item>
    </List>
    <PageCounter />
  </Slide>
</body>
```

Each `<Slide>` is one image. Type it, or add components from the palette; the palette writes through the formatter, so the source reads as if a person typed it. Click anything on the stage to select it and change its props, or pick a thumbnail in the strip to work on that slide. Props choose from named scales (`size`, `align`, `emphasis`) and there is no raw CSS field, on purpose, so a post stays inside its theme. The linter flags an unknown component, a bad prop value or a missing title as you type. Saving is automatic.

![Selecting the heading in the source pane and typing "Trams run all night": the working slide and its thumbnail redraw word by word, then slides 2 and 3 are picked from the strip and their markup is marked in the source](images/editing.gif)

## 2. Add pictures, if you want any

Upload an image from the editor. Newspapper keeps the original, stores a normalised copy, and refers to it by a short name made from the file name, such as `harbour-at-dawn-9f3a1c2b`. That name goes in an `<Image>`'s `src` prop.

## 3. Find something to write about, if you need it

The Reader (`/reader`) follows your RSS feeds and keeps what they publish. Its Search view scans the feeds by keyword, Library holds what you saved with a note, and Sources is where you add feeds, ping them to check they answer, and sort them into categories. `/articles` redirects there. Whether production has the Reader yet is not recorded; see [status](../corpus/wiki/status.md).

![The Reader with five made-up feeds grouped by category on the left, the unread items in the middle, and an item about Sample City's night tram timetable open on the right](images/reader.webp)

## 4. Render it

Press Render in the editor, or on the post's card at `/posts`. Headless Chromium screenshots each slide at 1080×1080 into `output/YYYY-MM-DD-N/`, next to `slides.json` and `caption.txt` (your `<caption>` plus `<hashtags>`).

![The four rendered slides of a made-up post about Sample City's night trams, one after another](images/slides.gif)

## 5. Publish and export

Publish marks the post published and runs a JPEG optimisation pass over the render. The pass runs once only, so the images cannot degrade from repeated re-encoding. Export ZIP downloads the whole run, ready to upload.

Pick a theme per post in the editor, or set the default in `/settings`. Three ship, `warm-industrial-1`, `-2` and `-3`: one design in three primary colours.

![Posts page with three made-up posts as cards, each with a thumbnail of its latest render, its keywords and Open, Render, Export ZIP, Publish and Delete buttons; the middle card is published, with a red Published stamp and Unpublish in place of Publish](images/posts.webp)
