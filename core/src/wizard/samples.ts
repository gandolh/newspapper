/**
 * A hand-written corpus of `.wzd` documents.
 *
 * The formatter's idempotency property runs over all of them, and the
 * compiler and editor briefs use them as fixtures rather than inventing
 * their own.
 */

export interface WzdSample {
  name: string;
  source: string;
  /** True when the document is expected to lint without any finding. */
  clean: boolean;
  /** True when the source is already in canonical printed form. */
  canonical: boolean;
}

export const WZD_SAMPLES: readonly WzdSample[] = [
  {
    name: 'minimal',
    clean: true,
    canonical: true,
    source: `<head>
  <title>One thing</title>
</head>

<body>
  <Slide>
    <Heading>One thing</Heading>
  </Slide>
</body>
`,
  },
  {
    name: 'full head',
    clean: true,
    canonical: true,
    source: `<head>
  <title>Three Things About the Budget</title>
  <description>What actually changed, minus the spin.</description>
  <keywords>budget, economy, tax</keywords>
  <date>2026-08-27</date>
  <caption>The budget dropped. Here's what actually moved.</caption>
  <hashtags>#news #budget #economy</hashtags>
</head>

<body>
  <Slide>
    <Kicker>Economy</Kicker>
    <Heading size="xl">Three things about the budget</Heading>
  </Slide>
</body>
`,
  },
  {
    name: 'list',
    clean: true,
    canonical: true,
    source: `<head>
  <title>What changed</title>
</head>

<body>
  <Slide>
    <Heading>What changed</Heading>
    <List size="lg">
      <Item>Fuel duty frozen, again</Item>
      <Item emphasis="strong">Income tax thresholds held flat</Item>
    </List>
    <PageCounter />
  </Slide>
</body>
`,
  },
  {
    name: 'two columns',
    clean: true,
    canonical: true,
    source: `<head>
  <title>Before and after</title>
</head>

<body>
  <Slide>
    <Heading align="center">Before and after</Heading>
    <Row size="lg">
      <Stack>
        <Kicker>Before</Kicker>
        <Text>Fuel duty rose with inflation.</Text>
      </Stack>
      <Stack>
        <Kicker>After</Kicker>
        <Text emphasis="strong">Frozen for a fifteenth year.</Text>
      </Stack>
    </Row>
  </Slide>
</body>
`,
  },
  {
    name: 'quote and source',
    clean: true,
    canonical: true,
    source: `<head>
  <title>On the record</title>
</head>

<body>
  <Slide>
    <Quote size="lg" by="The Chancellor">We are backing working people.</Quote>
    <Source emphasis="muted">Budget statement, 27 August</Source>
  </Slide>
</body>
`,
  },
  {
    name: 'stats',
    clean: true,
    canonical: true,
    source: `<head>
  <title>By the numbers</title>
</head>

<body>
  <Slide>
    <Kicker>By the numbers</Kicker>
    <Row>
      <Stat size="xl" label="years frozen">15</Stat>
      <Stat size="xl" label="saved per driver">£59</Stat>
    </Row>
    <Divider size="sm" />
    <Source>HM Treasury</Source>
  </Slide>
</body>
`,
  },
  {
    name: 'image',
    clean: true,
    canonical: true,
    source: `<head>
  <title>The room where it happened</title>
</head>

<body>
  <Slide>
    <Image src="downing-street.jpg" alt="The door of Number 11" size="xl" />
    <Source>PA</Source>
  </Slide>
</body>
`,
  },
  {
    name: 'comments',
    clean: true,
    canonical: true,
    source: `<!-- Drafted 2026-08-27, second pass -->

<head>
  <title>Draft</title>
</head>

<body>
  <Slide>
    <!-- swap this headline once the numbers land -->
    <Heading>Placeholder headline</Heading>
    <Text>Body copy goes here.</Text>
  </Slide>
</body>
`,
  },
  {
    name: 'bindings',
    clean: true,
    canonical: true,
    source: `<head>
  <title>Daily</title>
  <date>2026-08-27</date>
</head>

<body>
  <Slide>
    <Kicker>{date}</Kicker>
    <Heading>The daily</Heading>
    <Spacer size="lg" />
    <PageCounter align="right" />
  </Slide>
</body>
`,
  },
  {
    name: 'long lines',
    clean: true,
    canonical: true,
    source: `<head>
  <title>A rather long title that runs well past the print width the formatter aims for</title>
</head>

<body>
  <Slide>
    <Heading size="xl" align="center" emphasis="strong">
      A headline long enough that it cannot share a line with its tag
    </Heading>
    <Text size="sm" align="center" emphasis="muted">
      Supporting copy that also runs long, because real slides have real sentences on them and they do not fit.
    </Text>
  </Slide>
</body>
`,
  },
  {
    name: 'many slides',
    clean: true,
    canonical: true,
    source: `<head>
  <title>Five things</title>
</head>

<body>
  <Slide>
    <Heading>One</Heading>
  </Slide>

  <Slide>
    <Heading>Two</Heading>
  </Slide>

  <Slide>
    <Heading>Three</Heading>
  </Slide>

  <Slide>
    <Heading>Four</Heading>
  </Slide>

  <Slide>
    <Heading>Five</Heading>
  </Slide>
</body>
`,
  },
  {
    name: 'badly formatted but valid',
    clean: true,
    canonical: false,
    source: `<head><title>Messy</title>
     <description>Indented by hand, badly</description></head>



<body>
        <Slide><Kicker>Economy</Kicker>
   <Heading   size="lg"  >Messy but valid</Heading>
     <List><Item>One</Item><Item>Two</Item></List>



        </Slide>
</body>`,
  },
];
