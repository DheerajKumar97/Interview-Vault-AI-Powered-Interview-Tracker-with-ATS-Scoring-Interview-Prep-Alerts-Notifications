import { useState, useEffect } from "react";
import { getApiEndpoint } from '../config/api';
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
    const [generatingQuestions, setGeneratingQuestions] = useState<boolean>(false);
    const [interviewQuestions, setInterviewQuestions] = useState<any[] | null>(null);
    const [customApiKey, setCustomApiKey] = useState<string>("");
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const initUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        };
        initUser();
        fetchApplications();
        fetchLatestResume();
    }, []);

    useEffect(() => {
        if (!userId) return;
        const savedQuestions = localStorage.getItem(`interviewQuestions_${userId}`);
        const savedCompanyId = localStorage.getItem(`interviewCompanyId_${userId}`);

        if (savedQuestions) {
            try {
                const parsed = JSON.parse(savedQuestions);
                // validate it is the new array format
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                    setInterviewQuestions(parsed);
                } else {
                    // Legacy format detected, clear it
                    console.log("Creating new session: clearing legacy interview questions");
                    localStorage.removeItem(`interviewQuestions_${userId}`);
                    setInterviewQuestions(null);
                }
            } catch {
                // Invalid JSON, clear it
                localStorage.removeItem(`interviewQuestions_${userId}`);
                setInterviewQuestions(null);
            }
        }
        if (savedCompanyId) setSelectedCompanyId(savedCompanyId);
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        if (interviewQuestions) localStorage.setItem(`interviewQuestions_${userId}`, JSON.stringify(interviewQuestions));
        if (selectedCompanyId) localStorage.setItem(`interviewCompanyId_${userId}`, selectedCompanyId);
    }, [interviewQuestions, selectedCompanyId, userId]);

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

            const response = await fetch(getApiEndpoint('generate-interview-questions'), {
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
            console.log("=== FULL AI RESPONSE ===");
            console.log(data.questions);
            console.log("=== END RESPONSE ===");
            setInterviewQuestions(data.questions);
            toast.success(t("Interview questions generated!"));

            if (customApiKey) {
                try {
                    await fetch(`${import.meta.env.VITE_API_URL || ''}/api/update-env`, {
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

    const renderInterviewQuestions = (questionsData: any) => {
        if (!questionsData) return null;

        // Handle legacy string format or new JSON array
        let questions: any[] = [];

        if (typeof questionsData === 'string') {
            // Fallback for legacy string format (should not happen with new backend)
            try {
                questions = JSON.parse(questionsData);
            } catch (e) {
                // Very basic fallback if it's raw text
                return <div className="p-4 whitespace-pre-wrap">{questionsData}</div>
            }
        } else if (Array.isArray(questionsData)) {
            questions = questionsData;
        }

        return questions.map((q, index) => {
            const isCoding = q.type === 'coding' || q.code;
            const badge = isCoding ? '💻 Coding Question' : '💡 Conceptual Question';
            const badgeColor = isCoding ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-green-100 text-green-800 border-green-300';

            return (
                <div key={index} className="mb-6 last:mb-0 p-6 bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="mb-5 pb-4 border-b-2 border-gray-200">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="flex-shrink-0 w-10 h-10 bg-[#001f3f] text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md">
                                {q.number || index + 1}
                            </div>
                            <h3 className="text-xl font-bold text-[#001f3f] leading-tight flex-1 pt-1">
                                {q.question}
                            </h3>
                        </div>
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${badgeColor} mt-2`}>
                            {badge}
                        </span>
                    </div>

                    <div className="text-gray-900 leading-relaxed space-y-4">
                        {/* Answer Section */}
                        <div className="mb-2">
                            <h4 className="text-base font-bold text-blue-900 mb-2">Answer:</h4>
                            <p className="text-gray-900 leading-relaxed text-justify whitespace-pre-line">
                                {q.answer}
                            </p>
                        </div>

                        {/* Code Section */}
                        {q.code && (
                            <div className="my-4 rounded-lg overflow-hidden border-2 border-blue-300 bg-gray-900 shadow-lg">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 flex items-center justify-between">
                                    <span className="text-white text-xs font-bold uppercase tracking-wide">Code Solution</span>
                                </div>
                                <pre className="p-4 overflow-x-auto text-sm">
                                    <code className="text-green-400 font-bold leading-relaxed">{q.code}</code>
                                </pre>
                            </div>
                        )}
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

                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg p-6">
                    {interviewQuestions ? (
                        <div className="space-y-6">
                            <div className="border-b-2 border-gray-200 pb-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 m-0">Interview Questions & Answers</h2>
                                        <p className="text-sm text-gray-600 mt-2">
                                            Based on your resume and the job description
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="px-4 py-2 bg-green-100 border-2 border-green-300 rounded-lg">
                                            <div className="text-xs text-green-700 font-semibold">Conceptual</div>
                                            <div className="text-2xl font-bold text-green-800">50%</div>
                                        </div>
                                        <div className="px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-lg">
                                            <div className="text-xs text-purple-700 font-semibold">Coding</div>
                                            <div className="text-2xl font-bold text-purple-800">50%</div>
                                        </div>
                                    </div>
                                </div>
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