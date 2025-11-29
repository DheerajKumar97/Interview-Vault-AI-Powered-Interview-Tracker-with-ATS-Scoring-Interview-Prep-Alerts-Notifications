
// Supported languages configuration
export const LANGUAGES = {
    // Indian Languages
    hindi: 'hi',
    bengali: 'bn',
    telugu: 'te',
    marathi: 'mr',
    tamil: 'ta',
    gujarati: 'gu',
    kannada: 'kn',
    malayalam: 'ml',
    punjabi: 'pa',
    odia: 'or',
    urdu: 'ur',
    assamese: 'as',
    // International Languages
    french: 'fr',
    german: 'de',
    japanese: 'ja',
    chinese: 'zh',
    malay: 'ms',
    sinhala: 'si',
    // Source
    english: 'en'
} as const;

export type LanguageCode = typeof LANGUAGES[keyof typeof LANGUAGES];
export type LanguageName = keyof typeof LANGUAGES;

/**
 * Translate text using Google Translate API (free tier)
 * Adapted for browser usage using fetch
 */
export async function translateText(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> {
    try {
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedText}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.statusText}`);
        }

        const data = await response.json();

        // The API returns a nested array structure
        // data[0] contains the translation segments
        // data[0][0][0] is the translated text
        if (data && data[0]) {
            return data[0].map((item: any) => item[0]).join('');
        }

        return text; // Fallback to original text if parsing fails
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text on error
    }
}

/**
 * Helper to get language name from code
 */
export function getLanguageName(code: string): string {
    const entry = Object.entries(LANGUAGES).find(([_, value]) => value === code);
    return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : code;
}
