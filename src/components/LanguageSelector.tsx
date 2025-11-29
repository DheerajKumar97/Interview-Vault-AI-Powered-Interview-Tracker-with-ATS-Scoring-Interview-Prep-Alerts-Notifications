import React, { useState, useRef, useEffect } from 'react';
import { LANGUAGES, getLanguageName } from '../services/translationService';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
    const { currentLanguage, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLanguageSelect = (langCode: string) => {
        setLanguage(langCode);
        setIsOpen(false);
    };

    // Group languages for better UX
    const indianLanguages = [
        'hindi', 'bengali', 'telugu', 'marathi', 'tamil', 'gujarati',
        'kannada', 'malayalam', 'punjabi', 'odia', 'urdu', 'assamese'
    ];

    const internationalLanguages = [
        'french', 'german', 'japanese', 'chinese', 'malay', 'sinhala'
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
                title="Change Language"
            >
                <Globe className="h-5 w-5" />
                <span className="hidden md:inline">
                    {getLanguageName(currentLanguage)}
                </span>
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                            Source
                        </div>
                        <button
                            onClick={() => handleLanguageSelect(LANGUAGES.english)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm ${currentLanguage === LANGUAGES.english
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            English
                        </button>

                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
                            Indian Languages
                        </div>
                        {indianLanguages.map(langKey => {
                            // @ts-ignore
                            const code = LANGUAGES[langKey];
                            const name = langKey.charAt(0).toUpperCase() + langKey.slice(1);
                            return (
                                <button
                                    key={code}
                                    onClick={() => handleLanguageSelect(code)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${currentLanguage === code
                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {name}
                                </button>
                            );
                        })}

                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
                            International
                        </div>
                        {internationalLanguages.map(langKey => {
                            // @ts-ignore
                            const code = LANGUAGES[langKey];
                            const name = langKey.charAt(0).toUpperCase() + langKey.slice(1);
                            return (
                                <button
                                    key={code}
                                    onClick={() => handleLanguageSelect(code)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${currentLanguage === code
                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
