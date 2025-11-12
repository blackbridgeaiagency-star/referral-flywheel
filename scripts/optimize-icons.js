import logger from '../lib/logger';

// Script to optimize app icons for better performance
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeIcons() {
  logger.info(' Starting icon optimization...\n');

  const optimizations = [
    {
      input: 'ReferralFlywheelLogo.png',
      outputs: [
        {
          file: 'app/icon.png',
          width: 512,
          height: 512,
          description: 'PWA app icon (512x512)',
        },
        {
          file: 'app/apple-icon.png',
          width: 180,
          height: 180,
          description: 'iOS home screen icon (180x180)',
        },
        {
          file: 'app/opengraph-image.png',
          width: 1200,
          height: 630,
          description: 'Social media preview (1200x630)',
          fit: 'contain',
          background: { r: 66, g: 77, b: 157 } // Purple background to match logo
        }
      ]
    }
  ];

  for (const { input, outputs } of optimizations) {
    const inputPath = path.join(process.cwd(), input);

    if (!fs.existsSync(inputPath)) {
      logger.error(`❌ Source file not found: ${input}`);
      continue;
    }

    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024 / 1024).toFixed(2);
    logger.info(' Source: ${input} (${originalSize}MB)');

    for (const output of outputs) {
      const outputPath = path.join(process.cwd(), output.file);

      try {
        // Backup existing file
        if (fs.existsSync(outputPath)) {
          const backupPath = outputPath.replace(/\.png$/, '.backup.png');
          fs.copyFileSync(outputPath, backupPath);
          logger.debug(`  💾 Backed up: ${output.file}.backup.png`);
        }

        // Optimize image
        const sharpInstance = sharp(inputPath);

        if (output.fit === 'contain') {
          // For opengraph, contain the image with background
          await sharpInstance
            .resize(output.width, output.height, {
              fit: 'contain',
              background: output.background
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(outputPath);
        } else {
          // For icons, cover to fill the square
          await sharpInstance
            .resize(output.width, output.height, {
              fit: 'cover',
              position: 'center'
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(outputPath);
        }

        // Get new file size
        const newStats = fs.statSync(outputPath);
        const newSize = (newStats.size / 1024).toFixed(2);
        const savedSize = (originalStats.size / 1024 - newStats.size / 1024).toFixed(2);
        const savedPercent = ((1 - newStats.size / originalStats.size) * 100).toFixed(1);

        logger.debug(`  ✅ ${output.description}`);
        logger.debug(`     Size: ${newSize}KB (saved ${savedSize}KB / ${savedPercent}%)\n`);

      } catch (error) {
        logger.error(`  ❌ Failed to optimize ${output.file}:`, error.message);
      }
    }
  }

  logger.debug('✨ Icon optimization complete!');
  logger.debug('\n📊 Summary:');
  logger.debug('  • app/icon.png - Optimized for PWA (512x512)');
  logger.debug('  • app/apple-icon.png - Optimized for iOS (180x180)');
  logger.debug('  • app/opengraph-image.png - Optimized for social (1200x630)');
  logger.debug('\n💡 Backup files saved with .backup.png extension');
  logger.info(' Your app will now load faster!');
}

optimizeIcons().catch(console.error);
