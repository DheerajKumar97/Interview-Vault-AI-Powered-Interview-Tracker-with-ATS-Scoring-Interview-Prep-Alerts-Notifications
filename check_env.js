import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Checking .env configuration...');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file found at:', envPath);
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('File content length:', content.length);

    // Check for the key in the raw content
    if (content.includes('GEMINI_API_KEY')) {
        console.log('✅ GEMINI_API_KEY found in raw file content');
    } else {
        console.error('❌ GEMINI_API_KEY NOT found in raw file content');
    }
} else {
    console.error('❌ .env file NOT found at:', envPath);
}

// Load env vars
const result = dotenv.config();
if (result.error) {
    console.error('❌ Error loading .env:', result.error);
} else {
    console.log('✅ dotenv loaded successfully');
}

console.log('Checking process.env...');
if (process.env.GEMINI_API_KEY) {
    console.log('✅ GEMINI_API_KEY is loaded in process.env');
    console.log('Key length:', process.env.GEMINI_API_KEY.length);
    console.log('Starts with:', process.env.GEMINI_API_KEY.substring(0, 5) + '...');
} else {
    console.error('❌ GEMINI_API_KEY is undefined in process.env');
    console.log('Available keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));
}
