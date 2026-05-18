import type { ReactNode } from 'react';
import type { SlideBlock } from '../../storage/posts.js';
import type { Theme } from '../theme.js';
import { TitleMain, TitleQuestion, TitleStatement } from './title.js';
import { BodyComparison, BodyList, BodyText } from './body.js';
import { QuoteClassic, QuotePullout, QuoteReaction } from './quote.js';

export function renderSlide(slide: SlideBlock, theme: Theme, index: number, total: number): ReactNode {
  switch (slide.variant) {
    case 'title-main':
      return <TitleMain theme={theme} index={index} total={total} text={slide.text} kicker={slide.kicker} />;
    case 'title-statement':
      return <TitleStatement theme={theme} index={index} total={total} text={slide.text} />;
    case 'title-question':
      return <TitleQuestion theme={theme} index={index} total={total} text={slide.text} />;
    case 'body-text':
      return <BodyText theme={theme} index={index} total={total} heading={slide.heading} body={slide.body} />;
    case 'body-list':
      return <BodyList theme={theme} index={index} total={total} heading={slide.heading} items={slide.items} />;
    case 'body-comparison':
      return (
        <BodyComparison
          theme={theme}
          index={index}
          total={total}
          heading={slide.heading}
          left={slide.left}
          right={slide.right}
        />
      );
    case 'quote-classic':
      return <QuoteClassic theme={theme} index={index} total={total} quote={slide.quote} attribution={slide.attribution} />;
    case 'quote-pullout':
      return <QuotePullout theme={theme} index={index} total={total} quote={slide.quote} attribution={slide.attribution} />;
    case 'quote-reaction':
      return <QuoteReaction theme={theme} index={index} total={total} quote={slide.quote} attribution={slide.attribution} />;
  }
}
