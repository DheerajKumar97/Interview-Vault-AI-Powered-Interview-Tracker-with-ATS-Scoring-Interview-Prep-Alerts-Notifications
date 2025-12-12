import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/config/api';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // LocalStorage helper functions
    const getChatStorageKey = (userId: string | null) => `interview_vault_chat_${userId || 'guest'}`;

    const saveChatToStorage = (userId: string | null, msgs: Message[]) => {
        try {
            const key = getChatStorageKey(userId);
            localStorage.setItem(key, JSON.stringify(msgs));
        } catch (error) {
            console.error('Error saving chat to localStorage:', error);
        }
    };

    const loadChatFromStorage = (userId: string | null): Message[] | null => {
        try {
            const key = getChatStorageKey(userId);
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert timestamp strings back to Date objects
                return parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            }
        } catch (error) {
            console.error('Error loading chat from localStorage:', error);
        }
        return null;
    };

    const clearChatStorage = (userId: string | null) => {
        try {
            const key = getChatStorageKey(userId);
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing chat from localStorage:', error);
        }
    };

    // Clear chat history handler
    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || null;

            // Clear from localStorage
            clearChatStorage(userId);

            // Reset chat with new greeting
            await initializeChat(user, true);
        }
    };

    // Helper function to initialize/reset chat with appropriate greeting
    const initializeChat = async (user: any, forceReset: boolean = false) => {
        const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || null;
        const userId = user?.id || null;
        setUserName(name);

        // Try to load existing chat history from localStorage (unless forced reset)
        if (!forceReset) {
            const savedMessages = loadChatFromStorage(userId);
            if (savedMessages && savedMessages.length > 0) {
                setMessages(savedMessages);
                // Count user messages for greeting prefix logic
                const userMsgCount = savedMessages.filter(m => m.sender === 'user').length;
                setUserMessageCount(userMsgCount);
                return;
            }
        }

        // No saved messages or force reset - create welcome greeting
        setUserMessageCount(0);

        const greeting = name
            ? `Hello! **${name}**,\n\nI'm the Interview Vault AI assistant. I can help you with questions about your applications, job statistics, features, policies, or anything else. How can I assist you today? 👋`
            : `Hello! 👋\n\nI'm the Interview Vault AI assistant. I can help you with questions about the app, features, policies, or general inquiries. Please log in to access your personalized job application data. How can I assist you today?`;

        const initialMessages: Message[] = [{
            id: '1',
            text: greeting,
            sender: 'bot',
            timestamp: new Date(),
        }];

        setMessages(initialMessages);
        saveChatToStorage(userId, initialMessages);
    };

    // Initialize chat on mount and listen for auth changes
    useEffect(() => {
        // Initial load
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await initializeChat(user);
        };
        loadUser();

        // Listen for auth state changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN') {
                    // Load chat history for the newly signed-in user
                    await initializeChat(session?.user);
                } else if (event === 'SIGNED_OUT') {
                    // Clear guest chat and show generic greeting
                    clearChatStorage(null);
                    await initializeChat(null, true);
                }
            }
        );

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const formatMessage = (text: string) => {
        // Remove horizontal separators (---, ___, ===, etc.) but not table separators
        let formatted = text.replace(/^[-_=]{3,}$/gm, '');

        // Remove multiple consecutive blank lines - keep minimal spacing
        formatted = formatted.replace(/\n{3,}/g, '\n');

        // Remove citation markers like [1][2][3] - these are from search results
        formatted = formatted.replace(/\[(\d+)\]/g, '');

        // Clean up any existing broken HTML from backend
        // Remove any stray HTML attributes that might have leaked through
        formatted = formatted.replace(/\s+(target|class|style)="[^"]*"/g, '');

        // Remove any broken link tags
        formatted = formatted.replace(/<">/g, '');

        // Fix unwanted spacing in table cells (e.g., "Senior — Data" -> "Senior Data")
        // This handles em-dashes that shouldn't be there
        formatted = formatted.replace(/(\w)\s*—\s*(\w)/g, '$1 $2');
        formatted = formatted.replace(/(\w)\s*–\s*(\w)/g, '$1 $2');

        // Normalize multiple spaces to single space
        formatted = formatted.replace(/  +/g, ' ');

        // Convert LaTeX formulas to readable HTML
        // Handle \frac{num}{denom} -> (num / denom)
        formatted = formatted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

        // Handle \text{...} -> just the text
        formatted = formatted.replace(/\\text\{([^}]+)\}/g, '$1');

        // Handle \left( and \right) -> just parentheses
        formatted = formatted.replace(/\\left\(/g, '(');
        formatted = formatted.replace(/\\right\)/g, ')');

        // Handle \times -> ×
        formatted = formatted.replace(/\\times/g, '×');

        // Handle \approx -> ≈
        formatted = formatted.replace(/\\approx/g, '≈');

        // Handle \% -> %
        formatted = formatted.replace(/\\%/g, '%');

        // Handle display math blocks \[ ... \] -> formatted div
        formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
            // Clean up the formula
            let cleanFormula = formula.trim();
            cleanFormula = cleanFormula.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
            cleanFormula = cleanFormula.replace(/\\text\{([^}]+)\}/g, '$1');
            cleanFormula = cleanFormula.replace(/\\left\(/g, '(');
            cleanFormula = cleanFormula.replace(/\\right\)/g, ')');
            cleanFormula = cleanFormula.replace(/\\times/g, '×');
            cleanFormula = cleanFormula.replace(/\\approx/g, '≈');
            cleanFormula = cleanFormula.replace(/\\%/g, '%');
            cleanFormula = cleanFormula.replace(/\n/g, ' ');
            cleanFormula = cleanFormula.replace(/\s+/g, ' ').trim();

            return `<div class="my-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700 font-mono text-sm text-blue-800 dark:text-blue-200">${cleanFormula}</div>`;
        });

        // Handle inline math $...$ -> styled span
        formatted = formatted.replace(/\$([^$]+)\$/g, '<span class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</span>');

        // Convert markdown tables to HTML tables
        const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
        formatted = formatted.replace(tableRegex, (match, headerRow, bodyRows) => {
            // Parse header
            const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);

            // Parse body rows
            const rows = bodyRows.trim().split('\n').map((row: string) => {
                return row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
            });

            // Build HTML table
            let tableHtml = '<div class="overflow-x-auto my-2"><table class="w-full border-collapse text-sm">';

            // Header
            tableHtml += '<thead><tr class="bg-purple-600 text-white">';
            headers.forEach((header: string) => {
                tableHtml += `<th class="px-3 py-2 text-left font-semibold border border-purple-500">${header}</th>`;
            });
            tableHtml += '</tr></thead>';

            // Body
            tableHtml += '<tbody>';
            rows.forEach((row: string[], index: number) => {
                const bgClass = index % 2 === 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-gray-800';
                tableHtml += `<tr class="${bgClass}">`;
                row.forEach((cell: string, cellIndex: number) => {
                    // Make the score column bold and add color based on score
                    let cellContent = cell;
                    if (cellIndex === row.length - 1 && cell.includes('%')) {
                        const score = parseInt(cell);
                        let colorClass = 'text-gray-600';
                        if (score >= 80) colorClass = 'text-green-600 font-bold';
                        else if (score >= 60) colorClass = 'text-yellow-600 font-bold';
                        else colorClass = 'text-red-500 font-bold';
                        cellContent = `<span class="${colorClass}">${cell}</span>`;
                    }
                    // Make first column (rank) bold
                    if (cellIndex === 0) {
                        cellContent = `<strong>${cell}</strong>`;
                    }
                    tableHtml += `<td class="px-3 py-2 border border-purple-200 dark:border-purple-700">${cellContent}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table></div>';

            return tableHtml;
        });

        // Convert markdown headers (### and ##) to bold text
        formatted = formatted.replace(/^###\s*(.+)$/gm, '<strong>$1</strong>');
        formatted = formatted.replace(/^##\s*(.+)$/gm, '<strong>$1</strong>');

        // Convert markdown-style bold (**text**) to HTML
        // This will handle the username bolding from backend (e.g., "Sure **UserName**,")
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Make certification heading bold with line break (do this first)
        formatted = formatted.replace(
            /Professional certifications held by ([^:]+) include:/gi,
            '<strong>Professional certifications held by $1 include:</strong><br><br>'
        );

        // Handle certification badges with consistent professional styling
        formatted = formatted.replace(
            /🏅\s*([^–\n]+)\s*–\s*([^\n]+)/g,
            '<div class="flex items-start gap-2 py-2 px-3 my-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-300 dark:border-blue-600 shadow-sm hover:shadow-md transition-shadow"><span class="text-xl">🏅</span><div class="flex-1"><span class="font-semibold text-blue-700 dark:text-blue-300">$1</span><span class="text-gray-600 dark:text-gray-400 text-sm ml-1">– $2</span></div></div>'
        );

        // Handle certification items with styled cards (before general bullets)
        formatted = formatted.replace(
            /^(Microsoft Power BI Data Analyst|Microsoft Fabric Data Engineer Associate|Tableau Desktop Specialist|Tableau Data Analyst)\s*[–-]\s*([A-Z0-9-]+)$/gm,
            '<div class="inline-flex items-start gap-2 px-3 py-2 my-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 rounded-lg border border-blue-300 dark:border-blue-600 shadow-sm hover:shadow-md transition-all"><span class="font-semibold text-blue-700 dark:text-blue-300">$1</span><span class="text-gray-600 dark:text-gray-400 text-sm ml-1">– $2</span></div>'
        );

        // Format statistics/metrics with percentage values as styled cards
        // Pattern: "• Status: X/Y = Z%" or "Status: X/Y = Z%"
        formatted = formatted.replace(
            /[•\-]\s*\*?\*?([^:]+):\*?\*?\s*(\d+\/\d+)\s*=\s*([\d.]+%)/g,
            (match, status, fraction, percentage) => {
                const pct = parseFloat(percentage);
                let bgColor = 'from-gray-50 to-gray-100 border-gray-300';
                let textColor = 'text-gray-700';
                let pctColor = 'text-gray-600';

                // Color coding based on status type
                const statusLower = status.trim().toLowerCase();
                if (statusLower.includes('offer') || statusLower.includes('selected')) {
                    bgColor = 'from-green-50 to-emerald-50 border-green-300';
                    textColor = 'text-green-800';
                    pctColor = 'text-green-600 font-bold';
                } else if (statusLower.includes('interview') || statusLower.includes('shortlist')) {
                    bgColor = 'from-blue-50 to-indigo-50 border-blue-300';
                    textColor = 'text-blue-800';
                    pctColor = 'text-blue-600 font-bold';
                } else if (statusLower.includes('hr') || statusLower.includes('screening')) {
                    bgColor = 'from-purple-50 to-violet-50 border-purple-300';
                    textColor = 'text-purple-800';
                    pctColor = 'text-purple-600 font-bold';
                } else if (statusLower.includes('applied')) {
                    bgColor = 'from-cyan-50 to-sky-50 border-cyan-300';
                    textColor = 'text-cyan-800';
                    pctColor = 'text-cyan-600 font-bold';
                } else if (statusLower.includes('reject') || statusLower.includes('ghost')) {
                    bgColor = 'from-red-50 to-rose-50 border-red-300';
                    textColor = 'text-red-800';
                    pctColor = 'text-red-600 font-bold';
                }

                return `<div class="flex items-center justify-between px-4 py-3 my-2 bg-gradient-to-r ${bgColor} rounded-xl border shadow-sm hover:shadow-md transition-all">
                    <span class="font-semibold ${textColor}">${status.trim()}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-500 text-sm">${fraction}</span>
                        <span class="px-3 py-1 bg-white/80 rounded-lg ${pctColor} text-lg shadow-inner">${percentage}</span>
                    </div>
                </div>`;
            }
        );

        // Convert bullet point markers to proper HTML bullets
        formatted = formatted.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');

        // Wrap consecutive <li> items in <ul> with minimal spacing
        formatted = formatted.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul class="list-disc list-inside my-1 space-y-0.5">$1</ul>');

        // Make section headers bold and styled
        formatted = formatted.replace(/^(Professional Certifications):/gm, '<div class="text-base font-bold text-purple-700 dark:text-purple-300 mt-3 mb-2 flex items-center gap-2"><span class="w-1 h-5 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full"></span>$1:</div>');
        formatted = formatted.replace(/^(Professional Experience):/gm, '<div class="text-base font-bold text-purple-700 dark:text-purple-300 mt-3 mb-2 flex items-center gap-2"><span class="w-1 h-5 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full"></span>$1:</div>');
        formatted = formatted.replace(/^(Connect with [^:]+|Contact & Support):/gm, '<div class="text-base font-bold text-purple-700 dark:text-purple-300 mt-3 mb-2 flex items-center gap-2"><span class="w-1 h-5 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full"></span>$1:</div>');
        formatted = formatted.replace(/^(About the Founder):/gm, '<div class="text-base font-bold text-purple-700 dark:text-purple-300 mt-3 mb-2 flex items-center gap-2"><span class="w-1 h-5 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full"></span>$1:</div>');
        formatted = formatted.replace(/^(Key details about|Key points|Contact|Skills|Experience|Education|Projects):/gm, '<strong>$1:</strong>');

        // Process URLs and emails more carefully to avoid conflicts
        // Store processed URLs/emails in a map to prevent double-processing
        const urlMap = new Map<string, string>();
        let urlCounter = 0;

        // Legacy code removed (Lines 273-313) to allow standardized button logic below to run

        // Handle remaining LinkedIn URLs (clean button, consumes "LinkedIn:" label)
        formatted = formatted.replace(
            /(?:LinkedIn:?\s*)?(?:\[[^\]]*\]\(\s*)?(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)\/?(?:\s*\))?/gi,
            (match, username) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                const fullUrl = `https://linkedin.com/in/${username}`;
                urlMap.set(placeholder, `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="inline-block px-3 py-1 my-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-medium no-underline">LinkedIn</a>`);
                return placeholder;
            }
        );

        // Handle remaining GitHub URLs (clean button, consumes "GitHub:" label)
        formatted = formatted.replace(
            /(?:GitHub:?\s*)?(?:\[[^\]]*\]\(\s*)?(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/?(?:\s*\))?/gi,
            (match, username) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                const fullUrl = `https://github.com/${username}`;
                urlMap.set(placeholder, `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="inline-block px-3 py-1 my-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium no-underline shadow-sm border border-gray-200 dark:border-gray-700">GitHub</a>`);
                return placeholder;
            }
        );

        // Handle remaining email addresses (clean button, consumes "Email:" label)
        formatted = formatted.replace(
            /(?:Email:?\s*)?(?:\[[^\]]*\]\(\s*)?(?:mailto:)?\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b(?:\s*\))?/gi,
            (match, email) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                urlMap.set(placeholder, `<a href="mailto:${email}" class="inline-block px-3 py-1 my-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors font-medium no-underline">${email}</a>`);
                return placeholder;
            }
        );

        // Handle Medium URLs (consmes "Medium:" label)
        formatted = formatted.replace(
            /(?:Medium:?\s*)?(?:\[[^\]]*\]\(\s*)?((?:https?:\/\/)?(?:www\.)?medium\.com\/@[\w-]+)\/?(?:\s*\))?/gi,
            (match, url) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                urlMap.set(placeholder, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-block px-3 py-1 my-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium no-underline">Medium</a>`);
                return placeholder;
            }
        );

        // Handle Portfolio (Netlify) URLs (consumes "Portfolio:" label)
        formatted = formatted.replace(
            /(?:Portfolio:?\s*)?(?:\[[^\]]*\]\(\s*)?((?:https?:\/\/)?[\w-]+\.netlify\.app\/?)(?:\s*\))?/gi,
            (match, url) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                urlMap.set(placeholder, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-block px-3 py-1 my-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors font-medium no-underline">Portfolio</a>`);
                return placeholder;
            }
        );

        // Handle other URLs (must be done last to avoid conflicts)
        formatted = formatted.replace(
            /https?:\/\/[^\s<>"()]+[^\s<>"().,;!?]/gi,
            (match) => {
                const placeholder = `__URL_PLACEHOLDER_${urlCounter++}__`;
                // Extract clean URL without trailing punctuation
                const cleanUrl = match.replace(/[.,;!?]+$/, '');
                urlMap.set(placeholder, `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">Link</a>`);
                return placeholder;
            }
        );

        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        // Remove excessive <br> tags - keep minimal spacing
        formatted = formatted.replace(/(<br>){3,}/g, '<br>');

        // Replace placeholders with actual links
        urlMap.forEach((value, key) => {
            formatted = formatted.replace(key, value);
        });

        // Clean up any double <strong> tags
        formatted = formatted.replace(/<strong><strong>/g, '<strong>');
        formatted = formatted.replace(/<\/strong><\/strong>/g, '</strong>');

        // Clean up any remaining broken HTML
        formatted = formatted.replace(/\s+class="text-blue-500 underline">/g, '>');
        formatted = formatted.replace(/\s+target="_blank">/g, '>');

        // Final cleanup of left-over bullets if labels were removed
        // (If "• LinkedIn: [Button]" becomes "• [Button]", we keep the bullet if desired, or remove it)
        // Let's leave the bullets as they look okay, or remove "• " if immediately followed by a button div/a?
        // No, bullets are fine.

        return formatted;
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // BUG FIX: Save to storage IMMEDIATELY to prevent loss on auth state change/refresh
        // We need the user ID here.
        try {
            const { data: { user } } = await supabase.auth.getUser();
            saveChatToStorage(user?.id || null, updatedMessages);

            setInputMessage('');
            setIsLoading(true);

            // ... rest of API call
            const response = await axios.post(`${API_BASE_URL}/chat`, {
                message: inputMessage,
                conversationHistory: messages.map((m) => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text,
                })),
                user: user ? {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    isAuthenticated: true,
                    messageCount: userMessageCount
                } : {
                    isAuthenticated: false,
                    messageCount: userMessageCount
                }
            });

            // Increment user message count after sending
            setUserMessageCount(prev => prev + 1);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.response,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => {
                const newMessages = [...prev, botMessage];
                // Save to localStorage again with bot response
                saveChatToStorage(user?.id || null, newMessages);
                return newMessages;
            });
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I encountered an error. Please try again or contact support at interviewvault.2026@gmail.com",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => {
                const updatedMessages = [...prev, errorMessage];
                // Save error message to localStorage too
                saveChatToStorage(null, updatedMessages);
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 hover:scale-110 z-50"
                    aria-label="Open chat"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className={`fixed shadow-2xl flex flex-col z-50 border-2 border-purple-200 dark:border-purple-800 animate-in slide-in-from-bottom-4 duration-300 transition-all ${isMaximized
                        ? 'inset-[12.5%] w-[75vw] h-[75vh]'
                        : 'bottom-6 right-6 w-[450px] h-[600px]'
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <h3 className="font-semibold text-lg">Chat With Interview Vault</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClearHistory}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label="Clear chat history"
                                title="Clear chat history"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label={isMaximized ? 'Minimize chat' : 'Maximize chat'}
                            >
                                {isMaximized ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label="Close chat"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-2 ${message.sender === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <div
                                            className="text-sm leading-relaxed text-justify"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMessage(message.text),
                                            }}
                                        />
                                        <div
                                            className={`text-xs mt-1 ${message.sender === 'user'
                                                ? 'text-purple-200'
                                                : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            {message.timestamp.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-purple-600 hover:bg-purple-700"
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Powered by Interview Vault AI
                        </p>
                    </div>
                </Card>
            )}
        </>
    );
}
