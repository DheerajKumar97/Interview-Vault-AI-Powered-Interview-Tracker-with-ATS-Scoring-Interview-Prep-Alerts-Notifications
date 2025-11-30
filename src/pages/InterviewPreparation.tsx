import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, ArrowLeft, FileText, Building2, MessageSquare, Loader2, Key } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface Application {
    id: string;
    job_title: string;
    job_description?: string;
    companies: {
        name: string;
    };
}

const InterviewPreparation = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [resumeLoadedAt, setResumeLoadedAt] = useState<Date | null>(null);

    // Interview Questions state
    const [generatingQuestions, setGeneratingQuestions] = useState<boolean>(false);
    const [interviewQuestions, setInterviewQuestions] = useState<string | null>(null);
    const [customApiKey, setCustomApiKey] = useState<string>("");
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

    useEffect(() => {
        fetchApplications();
        fetchLatestResume();

        // Load saved state from localStorage
        const savedQuestions = localStorage.getItem('interviewQuestions');
        const savedCompanyId = localStorage.getItem('interviewCompanyId');

        if (savedQuestions) setInterviewQuestions(savedQuestions);
        if (savedCompanyId) setSelectedCompanyId(savedCompanyId);
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (interviewQuestions) localStorage.setItem('interviewQuestions', interviewQuestions);
        if (selectedCompanyId) localStorage.setItem('interviewCompanyId', selectedCompanyId);
    }, [interviewQuestions, selectedCompanyId]);

    const fetchApplications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("applications")
                .select(`
          id,
          job_title,
          job_description,
          companies (
            name
          )
        `)
                .ilike("current_status", "applied")
                .eq("user_id", user.id)
                .order("applied_date", { ascending: false });

            if (error) throw error;

            const typedData = (data as any) as Application[];
            setApplications(typedData || []);
        } catch (error: any) {
            toast.error(t("Failed to fetch applications"));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestResume = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await (supabase as any)
                .from("resumes")
                .select("resume_text, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error("Error fetching resume:", error);
                return;
            }

            if (data) {
                setResumeText((data as any).resume_text);
                setResumeLoadedAt(new Date((data as any).created_at));
            }
        } catch (error) {
            console.error("Error fetching resume:", error);
        }
    };

    const handleImportResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error(t("Please upload a PDF file"));
            e.target.value = '';
            return;
        }

        try {
            toast.info(t("Extracting text from PDF..."));

            const pdfjsLib = await import('pdfjs-dist');
            const pdfWorker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }

            if (!fullText.trim()) {
                toast.error(t("No text found in PDF"));
                e.target.value = '';
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error(t("You must be logged in to upload a resume"));
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error(t("Authentication required"));
                return;
            }

            const { data: existingResumes } = await supabase
                .from("resumes")
                .select("id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1);

            const existingResumeId = existingResumes?.[0]?.id;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            let response;

            if (existingResumeId) {
                response = await fetch(`${supabaseUrl}/rest/v1/resumes?id=eq.${existingResumeId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        resume_text: fullText.trim(),
                        created_at: new Date().toISOString()
                    })
                });
            } else {
                response = await fetch(`${supabaseUrl}/rest/v1/resumes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        resume_text: fullText.trim(),
                        file_url: null
                    })
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            setResumeText(fullText.trim());
            setResumeLoadedAt(new Date());
            toast.success(t("Resume uploaded successfully!"));
            e.target.value = '';
        } catch (error: any) {
            console.error("Error processing PDF:", error);
            toast.error(t("Failed to upload resume"));
            e.target.value = '';
        }
    };

    const generateInterviewQuestions = async () => {
        if (!selectedCompanyId) {
            toast.error(t("Please select a company first"));
            return;
        }

        if (!resumeText) {
            toast.error(t("Please upload your resume first"));
            return;
        }

        setGeneratingQuestions(true);
        try {
            const selectedApp = applications.find(app => app.id === selectedCompanyId);
            if (!selectedApp || !selectedApp.job_description) {
                toast.error(t("No job description available for this company"));
                return;
            }

            toast.info(t("Generating interview questions..."));

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/generate-interview-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeText: resumeText,
                    jobDescription: selectedApp.job_description,
                    companyName: selectedApp.companies.name,
                    jobTitle: selectedApp.job_title,
                    apiKey: customApiKey
                })
            });

            if (!response.ok) {
                // Check for 404 specifically to warn about server restart
                if (response.status === 404) {
                    throw new Error("Server endpoint not found. Please restart the backend server (npm run server).");
                }

                const errorData = await response.json().catch(() => ({}));

                if (errorData.requiresKey) {
                    setShowApiKeyInput(true);
                    toast.error(t("API limit reached or key missing. Please enter your own API key."));
                    return;
                }

                throw new Error(errorData.error || 'Failed to generate interview questions');
            }

            const data = await response.json();
            setInterviewQuestions(data.questions);
            toast.success(t("Interview questions generated!"));

            // If custom key was used successfully, save it to backend
            if (customApiKey) {
                try {
                    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/update-env`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            key: 'GEMINI_API_KEY',
                            value: customApiKey
                        })
                    });
                    toast.success(t("API Key saved for future use"));
                    setShowApiKeyInput(false);
                } catch (err) {
                    console.error("Failed to save API key:", err);
                }
            }

        } catch (error: any) {
            console.error("Error generating questions:", error);
            toast.error(error.message || t("Failed to generate interview questions"));
        } finally {
            setGeneratingQuestions(false);
        }
    };

    const formatDateTime = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        const formattedDate = `${day} ${month} ${year}`;
        const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        return { date: formattedDate, time: formattedTime };
    };

    // Custom renderer for interview questions with clean formatting
    const renderInterviewQuestions = (text: string) => {
        if (!text) return null;

        // Clean up ALL escaped characters and markdown artifacts
        let cleanedText = text
            .replace(/\\\*/g, '')      // Remove escaped asterisks \*
            .replace(/\*\*/g, '')      // Remove double asterisks **
            .replace(/\*/g, '')        // Remove single asterisks *
            .replace(/\\\//g, '')      // Remove escaped forward slashes \/
            .replace(/\\/g, '')        // Remove any remaining backslashes
            .trim();

        // Split by numbered questions (e.g., "1. ", "2. ", "3. ")
        // Use word boundary \b to avoid splitting inside numbers (e.g., "10." becoming "1" and "0.")
        let questions = cleanedText.split(/(?=\b\d+\.\s+)/g).filter(Boolean);

        // If no proper split, try by double newlines
        if (questions.length === 0 || questions.length === 1) {
            questions = cleanedText.split(/\n\n+/).filter(Boolean);
        }

        // If still no proper split, return as single block
        if (questions.length === 0) {
            questions = [cleanedText];
        }

        return questions.map((question, index) => {
            const cleanQuestion = question.trim();
            if (!cleanQuestion) return null;

            // Parse the question to extract title and content
            const lines = cleanQuestion.split('\n').filter(line => line.trim());

            // Find the question line (usually first line with number)
            let questionLine = '';
            let contentLines: string[] = [];

            if (lines.length > 0) {
                const firstLine = lines[0];
                // Match patterns like "1. Question text"
                if (firstLine.match(/^\d+\./)) {
                    questionLine = firstLine.trim();
                    contentLines = lines.slice(1);
                } else {
                    contentLines = lines;
                }
            }

            // Function to render a line with potential bold headings
            const renderLine = (line: string, lineIndex: number) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;

                // Check if line starts with specific headings that should be bold
                const boldHeadings = [
                    'Answer:',
                    'Question:',
                    'Explanation:',
                    'Key Points:',
                    'Follow-up:',
                    'Example:',
                    'Technical Details:',
                    'Best Practice:'
                ];

                // Check if this line starts with any of the bold headings
                for (const heading of boldHeadings) {
                    if (trimmedLine.startsWith(heading)) {
                        const content = trimmedLine.substring(heading.length).trim();
                        return (
                            <p key={lineIndex} className="mb-2">
                                <strong className="font-bold text-gray-900">{heading}</strong>
                                {content && ` ${content}`}
                            </p>
                        );
                    }
                }

                // Regular line without bold heading
                return <p key={lineIndex} className="mb-2">{trimmedLine}</p>;
            };

            return (
                <div key={index} className="mb-6 last:mb-0 p-5 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                    {/* Question Title - Bold on One Line */}
                    {questionLine && (
                        <div className="mb-4 pb-3 border-b border-blue-100">
                            <h3 className="text-lg font-bold text-blue-900 leading-tight">
                                {questionLine}
                            </h3>
                        </div>
                    )}

                    {/* Question Content */}
                    <div className="text-gray-700 leading-relaxed space-y-2">
                        {contentLines.map((line, lineIndex) => renderLine(line, lineIndex))}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>

            <LoadingOverlay isLoading={generatingQuestions} message="Generating Interview Questions..." />

            <div className="relative container mx-auto px-4 pb-8 pt-4">
                <div className="mb-6">
                    <Header />
                </div>

                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            id="import-resume"
                            onChange={handleImportResume}
                        />
                        <Button variant="outline" onClick={() => navigate("/applications")} className="glass-card border-gray-200 bg-white/80">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("View Data")}
                        </Button>

                        <Button variant="outline" onClick={() => document.getElementById("import-resume")?.click()} className="glass-card border-gray-200 bg-white/80">
                            <Upload className="h-4 w-4 mr-2" />
                            {t("Import Resume")}
                        </Button>
                    </div>

                    {resumeText && resumeLoadedAt && (
                        <div className="flex flex-col items-end text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <span className="font-medium">{t("Resume Loaded")}</span>
                            </div>
                            <div className="text-xs text-green-700 mt-1">
                                {formatDateTime(resumeLoadedAt).date} | {formatDateTime(resumeLoadedAt).time}
                            </div>
                        </div>
                    )}
                </div>

                {/* Company Selection */}
                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg p-6 mb-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    Select Company
                                </label>
                                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a company..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {applications.map((app) => (
                                            <SelectItem key={app.id} value={app.id}>
                                                {app.companies.name} - {app.job_title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={generateInterviewQuestions}
                                disabled={!selectedCompanyId || !resumeText || generatingQuestions}
                                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all"
                            >
                                {generatingQuestions ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Generate Questions
                                    </>
                                )}
                            </Button>
                        </div>

                        {showApiKeyInput && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-amber-800 mb-2">
                                    <Key className="h-4 w-4" />
                                    <span className="font-medium text-sm">Enter Gemini API Key</span>
                                </div>
                                <p className="text-xs text-amber-700 mb-3">
                                    The default API key has hit its limit or is invalid. Please enter your own free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-900">Google AI Studio</a>.
                                </p>
                                <Input
                                    type="password"
                                    placeholder="Paste your API key here (AIzaSy...)"
                                    value={customApiKey}
                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                    className="bg-white border-amber-300 focus:ring-amber-500"
                                />
                            </div>
                        )}
                    </div>
                </Card>

                {/* Interview Questions Display */}
                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg p-6">
                    {interviewQuestions ? (
                        <div className="space-y-6">
                            <div className="border-b border-gray-200 pb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900 m-0">Interview Questions & Answers</h2>
                                </div>
                                <p className="text-sm text-gray-600 mt-2">
                                    Based on your resume and the job description
                                </p>
                            </div>
                            <div className="space-y-4">
                                {renderInterviewQuestions(interviewQuestions)}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Interview Questions Yet</h3>
                            <p className="text-gray-500 text-sm">
                                Upload your resume, select a company, and click "Generate Questions" to receive AI-powered interview preparation.
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default InterviewPreparation;
