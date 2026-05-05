import { logger } from '../utils/logger.js';

export class TemplateSummarizer {
  async summarize(articles, options = {}) {
    const { maxSlides = 8 } = options;

    logger.info(`Summarizing ${articles.length} articles with template method`);

    const slides = [];

    slides.push({
      type: 'title',
      text: this.generateTitle(articles),
      notes: `${articles.length} articles from ${this.getUniqueSources(articles).length} sources`
    });

    const mainArticle = articles[0];
    const bodyText = this.extractKeyParagraphs(mainArticle.body, 2);
    
    slides.push({
      type: 'body',
      text: bodyText,
      notes: `Main article: ${mainArticle.sourceName || 'Unknown'}`
    });

    const quotes = this.extractQuotes(articles);
    if (quotes.length > 0 && slides.length < maxSlides) {
      slides.push({
        type: 'quote',
        text: quotes[0].text,
        attribution: quotes[0].source,
        notes: 'Key quote from articles'
      });
    }

    if (articles.length > 1 && slides.length < maxSlides) {
      const perspectives = this.summarizePerspectives(articles);
      slides.push({
        type: 'body',
        text: perspectives,
        notes: 'Different perspectives from sources'
      });
    }

    const keyPoints = this.extractKeyPoints(articles);
    if (keyPoints.length > 0 && slides.length < maxSlides) {
      slides.push({
        type: 'body',
        text: '• ' + keyPoints.slice(0, 5).join('\n• '),
        notes: 'Key takeaways'
      });
    }

    logger.success(`Generated ${slides.length} slides using template method`);
    return slides;
  }

  generateTitle(articles) {
    const mainArticle = articles[0];
    return mainArticle.title;
  }

  getUniqueSources(articles) {
    const sources = new Set();
    articles.forEach(a => {
      if (a.sourceName) sources.add(a.sourceName);
    });
    return Array.from(sources);
  }

  extractKeyParagraphs(text, count = 2) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
    
    return paragraphs.slice(0, count).join('\n\n').slice(0, 280);
  }

  extractQuotes(articles) {
    const quotes = [];
    const quotePattern = /"([^"]{20,200})"/g;

    for (const article of articles) {
      let match;
      while ((match = quotePattern.exec(article.body)) !== null) {
        quotes.push({
          text: match[1],
          source: article.sourceName || 'Unknown'
        });
        
        if (quotes.length >= 3) break;
      }
      if (quotes.length >= 3) break;
    }

    return quotes;
  }

  summarizePerspectives(articles) {
    const perspectives = [];
    
    for (let i = 1; i < Math.min(articles.length, 3); i++) {
      const article = articles[i];
      const firstSentence = article.body.split(/[.!?]/)[0];
      
      if (firstSentence && firstSentence.length > 20) {
        perspectives.push(`${article.sourceName || 'Source'}: ${firstSentence.slice(0, 100)}...`);
      }
    }

    return perspectives.join('\n\n');
  }

  extractKeyPoints(articles) {
    const keyPoints = new Set();
    
    const importantPatterns = [
      /\b(announced|revealed|confirmed|stated|reported|said)\s+that\s+([^.!?]{20,100})/gi,
      /\b(will|plans to|intends to|aims to)\s+([^.!?]{20,100})/gi,
      /\b(resulted in|led to|caused|triggered)\s+([^.!?]{20,100})/gi
    ];

    for (const article of articles) {
      for (const pattern of importantPatterns) {
        let match;
        while ((match = pattern.exec(article.body)) !== null) {
          const point = match[0].trim();
          if (point.length > 30 && point.length < 150) {
            keyPoints.add(point);
          }
          if (keyPoints.size >= 5) break;
        }
        if (keyPoints.size >= 5) break;
      }
      if (keyPoints.size >= 5) break;
    }

    return Array.from(keyPoints);
  }
}

export const templateSummarizer = new TemplateSummarizer();
