/**
 * Favicon Generator Script
 * Generates multiple favicon sizes from logo.png for optimal browser display
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = './public/logo.png';
const OUTPUT_DIR = './public';

// Favicon sizes to generate
const SIZES = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 48, name: 'favicon-48x48.png' },
    { size: 64, name: 'favicon-64x64.png' },
    { size: 128, name: 'favicon-128x128.png' },
    { size: 180, name: 'apple-touch-icon.png' }, // For iOS
];

async function generateFavicons() {
    try {
        console.log('🎨 Starting favicon generation...\n');

        // Check if input file exists
        if (!fs.existsSync(INPUT_FILE)) {
            console.error(`❌ Error: ${INPUT_FILE} not found!`);
            process.exit(1);
        }

        // Generate each size
        for (const { size, name } of SIZES) {
            const outputPath = path.join(OUTPUT_DIR, name);

            await sharp(INPUT_FILE)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated: ${name} (${size}x${size})`);
        }

        console.log('\n🎉 All favicons generated successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update index.html to reference the new favicon files');
        console.log('2. Clear browser cache (Ctrl+Shift+R)');
        console.log('3. Refresh your page to see the new favicon\n');

    } catch (error) {
        console.error('❌ Error generating favicons:', error.message);
        process.exit(1);
    }
}

generateFavicons();
