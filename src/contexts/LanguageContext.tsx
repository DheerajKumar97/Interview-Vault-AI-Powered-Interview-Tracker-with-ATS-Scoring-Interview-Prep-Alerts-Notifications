import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { translateText, LANGUAGES } from '../services/translationService';

interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (lang: string) => void;
    t: (text: string) => string;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const MAX_CONCURRENT_REQUESTS = 3;

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize from localStorage or default to English
    const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
        return localStorage.getItem('interview_compass_language') || LANGUAGES.english;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [tick, setTick] = useState(0); // Used to trigger re-renders when translations arrive

    // Cache for translations: { [language]: { [originalText]: translatedText } }
    const [translationCache] = useState<Record<string, Record<string, string>>>({});

    // Queue system
    const queueRef = useRef<Set<string>>(new Set());
    const processingRef = useRef(false);
    const activeRequestsRef = useRef(0);

    const setLanguage = (lang: string) => {
        setCurrentLanguageState(lang);
        localStorage.setItem('interview_compass_language', lang);
    };

    const processQueue = async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        processNext();
    };

    const processNext = async () => {
        if (queueRef.current.size === 0 && activeRequestsRef.current === 0) {
            processingRef.current = false;
            return;
        }

        while (activeRequestsRef.current < MAX_CONCURRENT_REQUESTS && queueRef.current.size > 0) {
            const text = queueRef.current.values().next().value;
            if (!text) break;

            queueRef.current.delete(text);
            activeRequestsRef.current++;

            // Capture current language for this request
            const targetLang = currentLanguage;

            // Initialize cache if needed
            if (!translationCache[targetLang]) {
                translationCache[targetLang] = {};
            }

            // Mark as pending in cache to prevent re-queueing
            translationCache[targetLang][text] = '...pending...';

            translateText(text, targetLang)
                .then(translated => {
                    translationCache[targetLang][text] = translated;
                    setTick(prev => prev + 1);
                })
                .catch(err => {
                    console.error(`Failed to translate "${text}"`, err);
                    delete translationCache[targetLang][text];
                })
                .finally(() => {
                    activeRequestsRef.current--;
                    // Add a small delay to be nice to the API
                    setTimeout(processNext, 50);
                });
        }

        if (activeRequestsRef.current > 0 || queueRef.current.size > 0) {
            // Keep processing if we have active requests or items in queue
            // The 'finally' block above handles the recursion for completed requests
            // But we need to ensure we don't stop if we just filled up concurrency
        } else {
            processingRef.current = false;
        }
    };

    // The translation hook function
    const t = (text: string): string => {
        if (currentLanguage === LANGUAGES.english) return text;
        if (!text) return text;

        // Check cache first
        if (translationCache[currentLanguage]?.[text]) {
            // If pending, return original text
            if (translationCache[currentLanguage][text] === '...pending...') {
                return text;
            }
            return translationCache[currentLanguage][text];
        }

        // If not in cache and not pending, add to queue
        if (!queueRef.current.has(text)) {
            queueRef.current.add(text);
            processQueue();
        }

        return text;
    };

    // Re-process queue when language changes (though usually queue is empty by then)
    useEffect(() => {
        queueRef.current.clear();
        activeRequestsRef.current = 0;
        processingRef.current = false;
    }, [currentLanguage]);

    return (
        <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, isLoading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
