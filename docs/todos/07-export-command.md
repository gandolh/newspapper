# TODO: Implement Export Command

**File:** `src/commands/export.js`

## Overview
Export slides and metadata as a complete package, marking the group as published.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function exportCommand(groupId, options) {
  // groupId - group ID to export
  // options.destination - export destination path
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { logger } from '../utils/logger.js';
import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { config } from '../utils/config.js';
import ora from 'ora';
import inquirer from 'inquirer';
```

### 3. Implementation Steps

#### Step 1: Validate Group and Output
```javascript
const group = await groupStorage.load(groupId);

if (!group) {
  logger.error(`Group ${groupId} not found`);
  process.exit(1);
}

// Check if images exist
const outputDir = join(config.paths.output, groupId);
const slidesDir = join(outputDir, 'slides');

try {
  const files = await readdir(slidesDir);
  const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  
  if (imageFiles.length === 0) {
    logger.error('No images found to export');
    logger.info(`Run: npm run generate ${groupId}`);
    process.exit(1);
  }
  
  logger.info(`Found ${imageFiles.length} images to export`);
  
} catch (error) {
  logger.error(`Output directory not found: ${outputDir}`);
  logger.info(`Run: npm run generate ${groupId}`);
  process.exit(1);
}
```

#### Step 2: Determine Destination
```javascript
let destination = options.destination;

if (!destination) {
  // Ask user for destination
  const { dest } = await inquirer.prompt([{
    type: 'input',
    name: 'dest',
    message: 'Export destination:',
    default: join(process.env.HOME || process.cwd(), 'Desktop', `newspapper-${groupId}`)
  }]);
  destination = dest;
}

// Resolve to absolute path
if (!destination.startsWith('/')) {
  destination = join(process.cwd(), destination);
}

logger.info(`Exporting to: ${destination}`);
```

#### Step 3: Create Export Directory
```javascript
await mkdir(destination, { recursive: true });
await mkdir(join(destination, 'slides'), { recursive: true });
```

#### Step 4: Copy Files
```javascript
const spinner = ora('Copying files...').start();

try {
  // Copy all slide images
  const files = await readdir(slidesDir);
  const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  
  for (const file of imageFiles) {
    await copyFile(
      join(slidesDir, file),
      join(destination, 'slides', file)
    );
  }
  
  spinner.text = 'Copying metadata...';
  
  // Copy metadata.json
  await copyFile(
    join(outputDir, 'metadata.json'),
    join(destination, 'metadata.json')
  );
  
  // Copy summary.json
  const summaries = await summaryStorage.getByGroup(groupId);
  if (summaries.length > 0) {
    const latestSummary = summaries.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    
    await copyFile(
      join(config.paths.data, 'summaries', `${latestSummary.id}.json`),
      join(destination, 'summary.json')
    );
  }
  
  spinner.succeed('Files copied');
  
} catch (error) {
  spinner.fail('Export failed');
  logger.error(error.message);
  process.exit(1);
}
```

#### Step 5: Calculate Export Size
```javascript
let totalSize = 0;
const files = await readdir(join(destination, 'slides'));

for (const file of files) {
  const stats = await stat(join(destination, 'slides', file));
  totalSize += stats.size;
}

logger.info(`Exported ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
```

#### Step 6: Update Status
```javascript
await manifestManager.load();
await manifestManager.updateGroupStatus(groupId, 'published');

const summaries = await summaryStorage.getByGroup(groupId);
for (const summary of summaries) {
  await manifestManager.updateSummaryStatus(summary.id, 'published');
}

logger.success('Marked as published');
```

#### Step 7: Show Summary
```javascript
console.log('\nExport complete!');
console.log(`  Location: ${destination}`);
console.log(`  Files: ${files.length} images + metadata`);
console.log('\nContents:');
console.log('  slides/');
files.forEach(file => {
  console.log(`    ${file}`);
});
console.log('  metadata.json');
console.log('  summary.json');

// Ask if user wants to open folder
const { openFolder } = await inquirer.prompt([{
  type: 'confirm',
  name: 'openFolder',
  message: 'Open export folder?',
  default: false
}]);

if (openFolder) {
  const { exec } = await import('child_process');
  const command = process.platform === 'darwin' 
    ? `open "${destination}"`
    : process.platform === 'win32'
    ? `explorer "${destination}"`
    : `xdg-open "${destination}"`;
  
  exec(command);
}
```

### 4. Error Handling
- Handle missing output directory
- Catch file copy errors
- Handle permission issues
- Validate destination path
- Handle disk space issues

### 5. Edge Cases
- Destination already exists → ask to overwrite
- No images generated → error with instructions
- Partial export (some files fail) → report which failed
- Invalid destination path → error
- No write permissions → error with suggestion

### 6. Testing
```bash
# Export with default destination
npm run export abc-123

# Export to specific location
npm run export abc-123 --destination=/path/to/export

# Export to Desktop
npm run export abc-123 --destination=~/Desktop/news-post

# Export to current directory
npm run export abc-123 --destination=./exported
```

### 7. Expected Output
```
ℹ Found 6 images to export
? Export destination: /home/user/Desktop/newspapper-abc-123
ℹ Exporting to: /home/user/Desktop/newspapper-abc-123
✓ Files copied
ℹ Exported 6 files (2.34 MB)
✓ Marked as published

Export complete!
  Location: /home/user/Desktop/newspapper-abc-123
  Files: 6 images + metadata

Contents:
  slides/
    01-title.png
    02-body.png
    03-body.png
    04-quote.png
    05-body.png
    06-body.png
  metadata.json
  summary.json

? Open export folder? No
```

### 8. Files to Create/Modify
- Create: `src/commands/export.js`
- Ensure: File operations work cross-platform
- Test: Different destination paths

### 9. Dependencies Used
- `inquirer` - Interactive prompts
- `ora` - Progress spinner
- `fs/promises` - File operations

### 10. Notes
- Consider adding ZIP archive option
- Add option to include source articles
- Implement export templates (for different platforms)
- Add option to upload to cloud storage
- Consider adding export history/log
- Add option to export multiple groups at once
