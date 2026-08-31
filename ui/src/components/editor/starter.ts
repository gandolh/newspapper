/**
 * What a new post opens with — a hello-world document that lints clean and is
 * already in canonical printed form, so the first thing anyone sees is markup
 * shaped the way the formatter will keep it.
 */

export const STARTER_TITLE = 'Hello, Wizard';

/** `YYYY-MM-DD` in the browser's own timezone. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function starterDocument(date: string = todayIso()): string {
  return `<head>
  <title>${STARTER_TITLE}</title>
  <description>A new post, waiting for its words.</description>
  <keywords>draft</keywords>
  <date>${date}</date>
  <caption>Swipe through. Written in Newspapper Wizard.</caption>
  <hashtags>#newspapper</hashtags>
</head>

<body>
  <Slide>
    <Kicker>New post</Kicker>
    <Heading size="xl">Say something worth swiping for</Heading>
    <Text emphasis="muted">Type on the left, or build it with the palette on the right.</Text>
  </Slide>

  <Slide>
    <Heading>The second slide</Heading>
    <List>
      <Item>Drag a component from the palette into a slide</Item>
      <Item>Click anything in the preview to select it</Item>
    </List>
    <Source>{date}</Source>
    <PageCounter />
  </Slide>
</body>
`;
}
