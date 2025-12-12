import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Upload, Calculator, FileText, ArrowLeft, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { FuzzyLogicMatcher } from "@/utils/fuzzyMatcher";
import { CircularScore } from "@/components/CircularScore";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface Application {
    id: string;
    job_title: string;
    applied_date: string;
    current_status: string;
    job_description?: string;
    ats_score?: string;
    companies: {
        name: string;
    };
}

const ATSScoreChecker = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [atsScores, setAtsScores] = useState<Record<string, string>>({});
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [resumeLoadedAt, setResumeLoadedAt] = useState<Date | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');

    useEffect(() => {
        fetchApplications();
        fetchLatestResume();
    }, []);

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
          applied_date,
          current_status,
          job_description,
          ats_score,
          companies (
            name
          )
        `)
                .eq("user_id", user.id)
                .not("current_status", "ilike", "ghosted")
                .not("current_status", "ilike", "rejected")
                .order("applied_date", { ascending: false });

            if (error) throw error;

            const typedData = (data as any) as Application[];
            setApplications(typedData || []);

            if (typedData) {
                const initialScores: Record<string, string> = {};
                typedData.forEach(app => {
                    if (app.ats_score) {
                        initialScores[app.id] = app.ats_score;
                    }
                });
                setAtsScores(initialScores);
            }
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

    const handleCalculateScores = async () => {
        if (!resumeText) {
            toast.error(t("Please upload a resume first"));
            return;
        }

        setCalculating(true);

        try {
            toast.info(t("Calculating scores..."));

            // Add artificial delay for better UX (as requested previously)
            await new Promise(resolve => setTimeout(resolve, 3000));

            const matcher = new FuzzyLogicMatcher();
            const newScores: Record<string, string> = {};

            for (const app of applications) {
                if (!app.job_description) {
                    newScores[app.id] = "No JD";
                    continue;
                }

                try {
                    const result = matcher.calculateScore(resumeText, app.job_description);
                    newScores[app.id] = Math.round(result.finalScore).toString();
                } catch (error) {
                    console.error(`Error calculating score for ${app.id}:`, error);
                    newScores[app.id] = "Error";
                }
            }

            setAtsScores(newScores);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            for (const [appId, score] of Object.entries(newScores)) {
                if (score === "No JD" || score === "Error") continue;

                try {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    await fetch(`${supabaseUrl}/rest/v1/applications?id=eq.${appId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                            'Authorization': `Bearer ${session.access_token}`,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ ats_score: score })
                    });
                } catch (error) {
                    console.error(`Error updating score for ${appId}:`, error);
                }
            }

            toast.success(t("ATS scores calculated successfully!"));
        } catch (error: any) {
            console.error("Error calculating scores:", error);
            toast.error(t("Failed to calculate scores"));
        } finally {
            setCalculating(false);
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

    const handleSort = () => {
        setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    };

    const getSortedApplications = () => {
        if (!sortOrder) return applications;

        return [...applications].sort((a, b) => {
            const scoreA = atsScores[a.id];
            const scoreB = atsScores[b.id];

            const numA = scoreA && !scoreA.includes("Error") && scoreA !== "No JD" ? parseFloat(scoreA) : -1;
            const numB = scoreB && !scoreB.includes("Error") && scoreB !== "No JD" ? parseFloat(scoreB) : -1;

            return sortOrder === 'asc' ? numA - numB : numB - numA;
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <LoadingOverlay isLoading={calculating} message="Calculating ATS Scores..." />
            <div className="p-4">
                <Header />
            </div>

            <div className="relative container mx-auto px-4 pb-8 pt-4">
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

                        <Button
                            onClick={handleCalculateScores}
                            disabled={calculating || !resumeText}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
                        >
                            <Calculator className="h-4 w-4 mr-2" />
                            {calculating ? t("Calculating...") : t("Calculate ATS Score")}
                        </Button>

                        <Button
                            onClick={() => navigate("/skill-analysis")}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-700 hover:to-emerald-700"
                        >
                            <Calculator className="h-4 w-4 mr-2" />
                            {t("Skill Analysis")}
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

                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">{t("Loading...")}</div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">{t("No applications found")}</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t("Add some applications to calculate ATS scores.")}
                            </p>
                            <Button onClick={() => navigate("/applications")} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t("Go to Applications")}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-white/20">
                                        <TableHead className="font-semibold">{t("Company")}</TableHead>
                                        <TableHead className="font-semibold">{t("Job Title")}</TableHead>
                                        <TableHead className="font-semibold">{t("Applied Date")}</TableHead>
                                        <TableHead className="font-semibold text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {t("ATS Score")}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSort}
                                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                                    disabled={Object.keys(atsScores).length === 0}
                                                >
                                                    <ArrowUpDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getSortedApplications().map((app) => {
                                        const scoreValue = atsScores[app.id];
                                        const numericScore = scoreValue && !scoreValue.includes("Error") && scoreValue !== "No JD"
                                            ? parseFloat(scoreValue)
                                            : null;

                                        return (
                                            <TableRow
                                                key={app.id}
                                                className="cursor-pointer hover:bg-white/50 border-b border-white/10"
                                                onClick={() => navigate(`/applications/${app.id}`)}
                                            >
                                                <TableCell className="font-medium">{app.companies.name}</TableCell>
                                                <TableCell>{app.job_title}</TableCell>
                                                <TableCell>
                                                    {new Date(app.applied_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center py-2">
                                                        {numericScore !== null ? (
                                                            <CircularScore score={numericScore} size={80} strokeWidth={6} />
                                                        ) : (
                                                            <div className="w-[80px] h-[80px] flex items-center justify-center">
                                                                <span className="text-gray-400 text-sm font-medium">
                                                                    {scoreValue || "-"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ATSScoreChecker;
