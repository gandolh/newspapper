# TODO: Implement Generate Command

**File:** `src/commands/generate.js`

## Overview
Render HTML slides to PNG images using Playwright, applying the chosen design system.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function generateCommand(groupId, options) {
  // groupId - group ID to generate images for
  // options.summaryId - use specific summary ID
  // options.format - image format: png, jpg
  // options.quality - compression quality (0-100)
  // options.size - image dimensions (e.g., 1080x1080)
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { articleStorage } from '../storage/articles.js';
import { sourceManager } from '../storage/sources.js';
import { screenshotRenderer } from '../renderer/screenshot.js';
import { logger } from '../utils/logger.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import ora from 'ora';
```

### 3. Implementation Steps

#### Step 1: Load Group and Summary
```javascript
const group = await groupStorage.load(groupId);

if (!group) {
  logger.error(`Group ${groupId} not found`);
  process.exit(1);
}

// Get summary
let summaryId = options.summaryId;
if (!summaryId) {
  // Get the most recent summary for this group
  const summaries = await summaryStorage.getByGroup(groupId);
  
  if (summaries.length === 0) {
    logger.error(`No summary found for group ${groupId}`);
    logger.info(`Run: npm run summarize ${groupId}`);
    process.exit(1);
  }
  
  // Use most recent
  summaries.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  summaryId = summaries[0].id;
}

const summary = await summaryStorage.load(summaryId);

if (!summary) {
  logger.error(`Summary ${summaryId} not found`);
  process.exit(1);
}

logger.info(`Generating ${summary.slides.length} slides for group ${groupId}`);
logger.info(`Design: ${summary.design}, Method: ${summary.method}, Tone: ${summary.tone}`);
```

#### Step 2: Prepare Output Directory
```javascript
const outputDir = join(config.paths.output, groupId);
await mkdir(outputDir, { recursive: true });
await mkdir(join(outputDir, 'slides'), { recursive: true });

logger.debug(`Output directory: ${outputDir}`);
```

#### Step 3: Generate Images
```javascript
const spinner = ora('Rendering slides...').start();

try {
  const imagePaths = await screenshotRenderer.renderSlides(
    summary.slides,
    summary.design,
    outputDir
  );
  
  spinner.succeed(`Generated ${imagePaths.length} images`);
  
  // Log file sizes
  const { stat } = await import('fs/promises');
  let totalSize = 0;
  
  for (const imagePath of imagePaths) {
    const stats = await stat(imagePath);
    totalSize += stats.size;
  }
  
  logger.info(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  logger.success(`Images saved to: ${outputDir}/slides/`);
  
} catch (error) {
  spinner.fail('Image generation failed');
  logger.error(error.message);
  process.exit(1);
} finally {
  // Always close browser
  await screenshotRenderer.close();
}
```

#### Step 4: Generate Metadata
```javascript
// Create metadata file with article sources
const articles = await articleStorage.loadMultiple(group.articleIds);
await sourceManager.load();

const metadata = {
  groupId,
  summaryId,
  generatedAt: new Date().toISOString(),
  design: summary.design,
  method: summary.method,
  tone: summary.tone,
  slideCount: summary.slides.length,
  articles: articles.map(article => {
    const source = sourceManager.sources.find(s => s.id === article.sourceId);
    return {
      title: article.title,
      source: source?.name || 'Unknown',
      url: article.url,
      author: article.author,
      publishedAt: article.publishedAt
    };
  })
};

await writeFile(
  join(outputDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

logger.info('Metadata saved');
```

#### Step 5: Update Manifest Status
```javascript
await manifestManager.load();
await manifestManager.updateSummaryStatus(summaryId, 'generated');
logger.debug('Updated summary status to generated');
```

#### Step 6: Show Next Steps
```javascript
console.log('\nNext steps:');
console.log(`  1. Review images: ${outputDir}/slides/`);
console.log(`  2. Export package: npm run export ${groupId}`);
console.log(`  3. Or regenerate with different design:`);
console.log(`     npm run summarize ${groupId} --design=industrial`);
```

### 4. Error Handling
- Handle Playwright browser launch failures
- Catch rendering errors per slide
- Handle disk space issues
- Validate image dimensions
- Provide recovery options

### 5. Edge Cases
- Very long text on slide → truncate or adjust font size
- Missing fonts → fallback to system fonts
- Browser crash → restart and retry
- Disk full → clean up and error
- Invalid design system → error with available options

### 6. Testing
```bash
# Generate with default settings
npm run generate abc-123

# Generate with specific summary
npm run generate abc-123 --summary-id=def-456

# Generate with different format
npm run generate abc-123 --format=jpg --quality=85

# Generate with custom size (Instagram story)
npm run generate abc-123 --size=1080x1920
```

### 7. Expected Output
```
ℹ Generating 6 slides for group abc-123
ℹ Design: broadsheet, Method: local, Tone: analytical
✓ Generated 6 images
ℹ Total size: 2.34 MB
✓ Images saved to: /home/user/newspapper/output/abc-123/slides/
ℹ Metadata saved

Next steps:
  1. Review images: /home/user/newspapper/output/abc-123/slides/
  2. Export package: npm run export abc-123
  3. Or regenerate with different design:
     npm run summarize abc-123 --design=industrial
```

### 8. File Structure Created
```
output/
  abc-123/
    slides/
      01-title.png
      02-body.png
      03-body.png
      04-quote.png
      05-body.png
      06-body.png
    metadata.json
```

### 9. Files to Create/Modify
- Create: `src/commands/generate.js`
- Ensure: Screenshot renderer works
- Test: Both design systems render correctly

### 10. Dependencies Used
- `ora` - Progress spinner
- `screenshotRenderer` - Image generation
- `fs/promises` - File operations

### 11. Notes
- Consider adding preview mode (open in browser)
- Add option to regenerate specific slides
- Implement parallel rendering for speed
- Add watermark option
- Consider adding image optimization
- Add option to generate GIF/video from slides
