import { useEffect, useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useNavigate } from "react-router-dom";
import dashboardBg from "@/assets/dashboard-bg.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { API_BASE_URL } from '../config/api';
import { Button } from "@/components/ui/button";


import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  ArrowLeft,
  Building2,
  Eye,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface DashboardData {
  totalApplications: number;
  statusCounts: Record<string, number>;
  statusCompanies: Record<string, string[]>;
  statusApplications: Record<string, any[]>; // Store full application details for tooltips
  companyCounts: Record<string, number>;
  companyDetails: Record<string, any>; // Store company details for tooltips
  funnelData: any[];
  timelineData: any[];
}

interface AnalyticsData {
  stageConversionRates: {
    applied: number;
    progressed: number;
    shortlisted: number;
    interviewed: number;
    selected: number;
    offers: number;
    response_rate: number;
    shortlist_rate: number;
    interview_rate: number;
    selection_rate: number;
    offer_rate: number;
    overall_success_rate: number;
  } | null;
  byIndustry: Array<{
    industry: string;
    total_apps: number;
    responses: number;
    interviews: number;
    offers: number;
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
  }>;
  byDayOfWeek: Array<{
    day_of_week: string;
    day_num: number;
    applications: number;
    responses: number;
    interviews: number;
    offers: number;
    response_rate: number;
    interview_rate: number;
  }>;
  timeToHire: Array<{
    transition: string;
    avg_days: number;
    median_days: number;
    min_days: number;
    max_days: number;
    sample_size: number;
  }>;
  byCompanySize: Array<{
    company_size: string;
    total_apps: number;
    interviews: number;
    offers: number;
    interview_rate: number;
    offer_rate: number;
  }>;
  atsCorrelation: Array<{
    score_range: string;
    total_apps: number;
    interviews: number;
    offers: number;
    interview_rate: number;
    offer_rate: number;
  }>;
}

const COLORS = {
  "HR Screening Done": "hsl(217 91% 60%)", // Blue
  "Shortlisted": "hsl(280 65% 60%)", // Purple
  "Interview Scheduled": "hsl(280 65% 60%)", // Purple
  "Interview Rescheduled": "hsl(280 65% 60%)", // Purple
  "Selected": "hsl(142 71% 45%)", // Green
  "Offer Released": "hsl(142 71% 45%)", // Green
  "Rejected": "hsl(0 84.2% 60.2%)", // Red
  "Ghosted": "hsl(0 0% 45%)", // Gray
};

const getStatusColor = (status: string) => {
  if (status === "HR Screening Done") return "hsl(217 91% 60%)"; // Blue
  if (["Shortlisted", "Interview Scheduled", "Interview Rescheduled"].includes(status)) return "hsl(280 65% 60%)"; // Purple
  if (["Selected", "Offer Released"].includes(status)) return "hsl(142 71% 45%)"; // Green
  if (status === "Rejected") return "hsl(0 84.2% 60.2%)"; // Red
  if (status === "Ghosted") return "hsl(0 0% 45%)"; // Gray
  return "hsl(210 40% 96.1%)"; // Muted
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    totalApplications: 0,
    statusCounts: {},
    statusCompanies: {},
    statusApplications: {},
    companyCounts: {},
    companyDetails: {},
    funnelData: [],
    timelineData: [],
  });
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [digestDialogOpen, setDigestDialogOpen] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<string>("");
  const [selectedHour, setSelectedHour] = useState<string>("9");
  const [selectedMinute, setSelectedMinute] = useState<string>("00");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("AM");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    stageConversionRates: null,
    byIndustry: [],
    byDayOfWeek: [],
    timeToHire: [],
    byCompanySize: [],
    atsCorrelation: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchAnalyticsData();
  }, [selectedCompanies]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select(`
          id,
          current_status,
          applied_date,
          job_title,
          company_id,
          name,
          industry,
          company_size,
          company_website,
          hr_name,
          hr_phone,
          hr_linkedin,
          companies (
            name,
            industry,
            company_size,
            hr_name,
            hr_phone,
            hr_linkedin
          )
        `);

      if (selectedCompanies.length > 0) {
        query = query.in("company_id", selectedCompanies);
      }

      const { data: applications, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const statusCounts: Record<string, number> = {};
      const statusCompanies: Record<string, string[]> = {};
      const statusApplications: Record<string, any[]> = {};
      const companyCounts: Record<string, number> = {};
      const companyDetails: Record<string, any> = {};

      applications?.forEach((app) => {
        statusCounts[app.current_status] = (statusCounts[app.current_status] || 0) + 1;

        if (!statusCompanies[app.current_status]) {
          statusCompanies[app.current_status] = [];
        }
        if (!statusApplications[app.current_status]) {
          statusApplications[app.current_status] = [];
        }

        const companyName = app.companies?.name || app.name;
        if (!statusCompanies[app.current_status].includes(companyName)) {
          statusCompanies[app.current_status].push(companyName);
        }
        statusApplications[app.current_status].push(app);

        companyCounts[companyName] = (companyCounts[companyName] || 0) + 1;

        // Store company details
        if (!companyDetails[companyName]) {
          companyDetails[companyName] = {
            name: companyName,
            industry: app.companies?.industry || app.industry || "N/A",
            company_size: app.companies?.company_size || app.company_size || "N/A",
            hr_name: app.companies?.hr_name || app.hr_name || "N/A",
            hr_phone: app.companies?.hr_phone || app.hr_phone || "N/A",
            applications: []
          };
        }
        companyDetails[companyName].applications.push(app);
      });

      // Funnel data
      const statuses = [
        "HR Screening Done",
        "Shortlisted",
        "Interview Scheduled",
        "Interview Rescheduled",
        "Selected",
        "Offer Released",
        "Rejected",
        "Ghosted",
      ];

      const funnelData = statuses.map((status) => ({
        name: status,
        count: statusCounts[status] || 0,
      }));

      // Timeline data (monthly aggregation)
      const timelineMap: Record<string, number> = {};
      applications?.forEach((app) => {
        const month = new Date(app.applied_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        timelineMap[month] = (timelineMap[month] || 0) + 1;
      });

      const timelineData = Object.entries(timelineMap)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      console.log("Dashboard applications debug", {
        sampleApplications: applications?.slice(0, 5),
        statusApplicationsHRScreening: statusApplications["HR Screening Done"]?.slice(0, 5),
      });

      setData({
        totalApplications: applications?.length || 0,
        statusCounts,
        statusCompanies,
        statusApplications,
        companyCounts,
        companyDetails,
        funnelData,
        timelineData,
      });
    } catch (error: any) {
      toast.error("Failed to fetch dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAnalyticsLoading(false);
        return;
      }

      // Fetch all analytics in parallel
      const [convRates, industry, dayOfWeek, timeHire, companySize, atsCorr] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/stage-conversion-rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: null })),
        fetch(`${API_BASE_URL}/analytics/by-industry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE_URL}/analytics/by-day-of-week`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE_URL}/analytics/time-to-hire`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE_URL}/analytics/by-company-size`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE_URL}/analytics/ats-correlation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      setAnalyticsData({
        stageConversionRates: convRates?.data || null,
        byIndustry: industry?.data || [],
        byDayOfWeek: dayOfWeek?.data || [],
        timeToHire: timeHire?.data || [],
        byCompanySize: companySize?.data || [],
        atsCorrelation: atsCorr?.data || []
      });
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSaveDigestPreference = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let hour24 = parseInt(selectedHour);
      if (selectedPeriod === "PM" && hour24 !== 12) {
        hour24 += 12;
      } else if (selectedPeriod === "AM" && hour24 === 12) {
        hour24 = 0;
      }
      const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute}:00`;

      const { error } = await supabase
        .from("email_digest_preferences" as any)
        .upsert({
          user_id: user.id,
          frequency: selectedFrequency,
          scheduled_time: timeString,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_active: true,
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      toast.success(`Email digest scheduled for ${selectedHour}:${selectedMinute} ${selectedPeriod}!`);
      setDigestDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to save preference");
      console.error(error);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      toast.success("Sending test email with dashboard data...");

      // Close dialog before sending
      setDigestDialogOpen(false);

      // Send email with dashboard data
      await sendDigestEmail();

    } catch (error: any) {
      toast.error("Failed to send email");
      console.error(error);
      setDigestDialogOpen(true); // Re-open dialog on error
    }
  };

  const sendDigestEmail = async (dashboardImage?: string, dashboardPdf?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare dashboard statistics
      const dashboardStats = {
        totalApplications: data.totalApplications,
        statusCounts: data.statusCounts,
        companyCounts: data.companyCounts,
        companyDetails: data.companyDetails,
        funnelData: data.funnelData,
        timelineData: data.timelineData.slice(-6), // Last 6 months
      };

      // Get recent applications (last 10)
      const { data: recentApps } = await supabase
        .from("applications")
        .select(`
          id,
          job_title,
          current_status,
          applied_date,
          name,
          companies (name)
        `)
        .order('applied_date', { ascending: false })
        .limit(10);

      const response = await fetch(`${API_BASE_URL}/send-digest-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          frequency: selectedFrequency,
          dashboardStats,
          recentApplications: recentApps || []
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      toast.success("Test email sent! Check your inbox.");
      // Dialog is already closed by handleSendTestEmail
    } catch (error: any) {
      console.error("Error sending digest email:", error);
      toast.error("Failed to send email. Please try again.");
      setDigestDialogOpen(true); // Re-open dialog on error
    }
  };

  const pieData = Object.entries(data.statusCounts).map(([name, value]) => ({
    name,
    value,
    companies: data.statusCompanies[name] || [],
    applications: data.statusApplications[name] || [],
  }));

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50"
    >
      <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>
      <div className="relative" id="dashboard-content">
        <div className="container mx-auto px-4 py-4 max-w-[1600px]">
          <div className="flex items-center justify-between mb-4">
            <Header />
            <Button variant="outline" size="icon" onClick={() => navigate("/")} className="glass-card border-gray-200 hover:bg-white/80">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Company Filter and View Data Button */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Card className="glass-card inline-block p-2 border-gray-200 bg-white/80">
              <MultiSelect
                options={companies.map((c) => ({ label: c.name, value: c.id }))}
                selected={selectedCompanies}
                onChange={setSelectedCompanies}
                placeholder="Filter by companies..."
                className="w-[280px]"
              />
            </Card>
            {selectedCompanies.length > 0 && (
              <Button
                onClick={() => setSelectedCompanies([])}
                variant="outline"
                className="glass-card border-gray-200 bg-white/70 hover:bg-white/90"
              >
                Reset Filters
              </Button>
            )}
            <Button
              onClick={() => navigate("/applications")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all font-semibold hover:from-blue-700 hover:to-purple-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Data
            </Button>

            <Dialog open={digestDialogOpen} onOpenChange={setDigestDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="glass-card border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-purple-700 font-semibold"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Scheduled Email Digest
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg" aria-describedby="digest-description">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-purple-700">Schedule Email Digest</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4" id="digest-description">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Select Frequency</Label>
                    <RadioGroup value={selectedFrequency} onValueChange={setSelectedFrequency}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily" className="cursor-pointer">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bi-weekly" id="bi-weekly" />
                          <Label htmlFor="bi-weekly" className="cursor-pointer">Bi-Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="quarterly" id="quarterly" />
                          <Label htmlFor="quarterly" className="cursor-pointer">Quarterly</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Select Time</Label>
                    <div className="flex items-center gap-2">
                      <Select value={selectedHour} onValueChange={setSelectedHour}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-bold">:</span>
                      <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                            <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                              {minute.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Emails will be sent at {selectedHour}:{selectedMinute} {selectedPeriod} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDigestDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendTestEmail}
                    disabled={!selectedFrequency}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Send Test Mail
                  </Button>
                  <Button
                    onClick={handleSaveDigestPreference}
                    disabled={!selectedFrequency}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-600 font-semibold">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <KpiCard
                  title="Total Applications"
                  value={data.totalApplications}
                  icon={FileText}
                  companies={Object.values(data.companyDetails)}
                  onClick={() => {
                    const companyNames = Object.keys(data.companyDetails);
                    navigate(`/applications?companies=${encodeURIComponent(companyNames.join(','))}`);
                  }}
                />
                <KpiCard
                  title="HR Screening Done"
                  value={data.statusCounts["HR Screening Done"] || 0}
                  icon={TrendingUp}
                  companies={data.statusApplications["HR Screening Done"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["HR Screening Done"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Shortlisted"
                  value={data.statusCounts["Shortlisted"] || 0}
                  icon={Users}
                  companies={data.statusApplications["Shortlisted"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Shortlisted"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Interview Scheduled"
                  value={data.statusCounts["Interview Scheduled"] || 0}
                  icon={TrendingUp}
                  companies={data.statusApplications["Interview Scheduled"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Interview Scheduled"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Interview Rescheduled"
                  value={data.statusCounts["Interview Rescheduled"] || 0}
                  icon={BarChart3}
                  companies={data.statusApplications["Interview Rescheduled"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Interview Rescheduled"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Selected"
                  value={data.statusCounts["Selected"] || 0}
                  icon={Users}
                  companies={data.statusApplications["Selected"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Selected"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Offers"
                  value={data.statusCounts["Offer Released"] || 0}
                  icon={BarChart3}
                  companies={data.statusApplications["Offer Released"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Offer Released"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
                <KpiCard
                  title="Rejected"
                  value={data.statusCounts["Rejected"] || 0}
                  icon={Users}
                  companies={data.statusApplications["Rejected"]?.map(app => ({
                    name: app.companies?.name || app.name,
                    industry: app.companies?.industry || app.industry,
                    company_size: app.companies?.company_size || app.company_size,
                    hr_name: app.companies?.hr_name || app.hr_name,
                    hr_phone: app.companies?.hr_phone || app.hr_phone,
                  }))}
                  onClick={() => {
                    const companies = [...new Set(data.statusApplications["Rejected"]?.map(app => app.companies?.name || app.name) || [])];
                    navigate(`/applications?companies=${encodeURIComponent(companies.join(','))}`);
                  }}
                />
              </div>

              {/* Conversion Rate KPIs */}
              {!analyticsLoading && analyticsData.stageConversionRates && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-blue-600 font-medium">Response Rate</p>
                      <p className="text-2xl font-bold text-blue-700">{analyticsData.stageConversionRates.response_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.progressed}/{analyticsData.stageConversionRates.applied}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-purple-600 font-medium">Shortlist Rate</p>
                      <p className="text-2xl font-bold text-purple-700">{analyticsData.stageConversionRates.shortlist_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.shortlisted}/{analyticsData.stageConversionRates.applied}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-indigo-600 font-medium">Interview Rate</p>
                      <p className="text-2xl font-bold text-indigo-700">{analyticsData.stageConversionRates.interview_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.interviewed}/{analyticsData.stageConversionRates.applied}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-green-600 font-medium">Selection Rate</p>
                      <p className="text-2xl font-bold text-green-700">{analyticsData.stageConversionRates.selection_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.selected}/{analyticsData.stageConversionRates.interviewed}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-emerald-600 font-medium">Offer Rate</p>
                      <p className="text-2xl font-bold text-emerald-700">{analyticsData.stageConversionRates.offer_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.offers}/{analyticsData.stageConversionRates.interviewed}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-amber-600 font-medium">Overall Success</p>
                      <p className="text-2xl font-bold text-amber-700">{analyticsData.stageConversionRates.overall_success_rate}%</p>
                      <p className="text-xs text-gray-500">{analyticsData.stageConversionRates.offers}/{analyticsData.stageConversionRates.applied}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Funnel Chart - Takes 2/3 width */}
                <Card className="glass-card border-white/20 bg-white/95 shadow-2xl lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                      Interview Funnel Pipeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={data.funnelData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                            <stop offset="100%" stopColor="hsl(217 91% 75%)" />
                          </linearGradient>
                          <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(280 65% 60%)" />
                            <stop offset="100%" stopColor="hsl(280 65% 75%)" />
                          </linearGradient>
                          <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(142 71% 45%)" />
                            <stop offset="100%" stopColor="hsl(142 71% 60%)" />
                          </linearGradient>
                          <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(0 84% 60%)" />
                            <stop offset="100%" stopColor="hsl(0 84% 75%)" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 11, fill: '#374151' }}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const status = payload[0].payload.name;
                              const apps = data.statusApplications[status] || [];
                              const count = payload[0].value;

                              // Get unique companies with their HR details
                              const companyMap = new Map();
                              apps.forEach(app => {
                                const companyName = app.companies?.name || app.name;
                                if (!companyMap.has(companyName)) {
                                  const hrName = app.companies?.hr_name || app.hr_name;
                                  const hrPhone = app.companies?.hr_phone || app.hr_phone;
                                  companyMap.set(companyName, {
                                    name: companyName,
                                    hr_name: hrName && hrName.trim() !== "" ? hrName : "NA",
                                    hr_phone: hrPhone && hrPhone.trim() !== "" ? hrPhone : "NA"
                                  });
                                }
                              });
                              const companiesWithHR = Array.from(companyMap.values());

                              return (
                                <div className="glass-card p-3 max-w-md border-gray-200 bg-white/98 shadow-2xl">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                      <div className="w-3 h-3 rounded" style={{
                                        background: status === "HR Screening Done" ? "hsl(217 91% 60%)" :
                                          ["Shortlisted", "Interview Scheduled", "Interview Rescheduled"].includes(status) ? "hsl(280 65% 60%)" :
                                            ["Selected", "Offer Released"].includes(status) ? "hsl(142 71% 45%)" :
                                              status === "Rejected" ? "hsl(0 84.2% 60.2%)" :
                                                "hsl(0 0% 45%)"
                                      }}></div>
                                      <p className="font-bold text-sm">{status}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                      <p className="text-gray-600">Applications:</p>
                                      <p className="font-bold text-purple-600 text-lg">{count}</p>
                                      <p className="text-gray-600">Companies:</p>
                                      <p className="font-semibold">{companiesWithHR.length}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-200">
                                      <p className="text-xs font-medium text-gray-600 mb-2">Companies:</p>
                                      <div className="space-y-1.5">
                                        {companiesWithHR.slice(0, 4).map((company, idx) => (
                                          <div key={idx} className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 p-2 rounded border border-gray-100">
                                            <p className="font-semibold text-gray-900">
                                              {company.name}
                                              <span className="text-gray-600 font-normal">
                                                {" {"}HR Name: {company.hr_name}, HR No: {company.hr_phone}{"}"}
                                              </span>
                                            </p>
                                          </div>
                                        ))}
                                        {companiesWithHR.length > 4 && (
                                          <p className="text-xs text-gray-500 pl-2 pt-1">+{companiesWithHR.length - 4} more</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[0, 16, 16, 0]}
                          barSize={35}
                          label={{
                            position: 'right',
                            fill: '#374151',
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}
                        >
                          {data.funnelData.map((entry, index) => {
                            let fill = "url(#blueGrad)";
                            if (entry.name === "HR Screening Done") fill = "url(#blueGrad)";
                            else if (["Shortlisted", "Interview Scheduled", "Interview Rescheduled"].includes(entry.name)) fill = "url(#purpleGrad)";
                            else if (["Selected", "Offer Released"].includes(entry.name)) fill = "url(#greenGrad)";
                            else if (entry.name === "Rejected") fill = "url(#redGrad)";
                            else if (entry.name === "Ghosted") fill = "hsl(0 0% 45%)";

                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name.split(' ')[0]}: ${entry.value}`}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[entry.name as keyof typeof COLORS] || "hsl(var(--muted))"}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const apps = data.applications || [];
                              const firstApp = apps[0];

                              return (
                                <div className="glass-card p-3 max-w-sm border-white/30 bg-white/95 shadow-2xl">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                      <Building2 className="h-4 w-4 text-purple-600" />
                                      <p className="font-bold text-sm">{data.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <p className="text-gray-600">Count:</p>
                                      <p className="font-semibold text-purple-600">{data.value}</p>
                                      {firstApp && (
                                        <>
                                          <p className="text-gray-600">Industry:</p>
                                          <p className="font-medium">{firstApp.industry || firstApp.companies?.industry || "N/A"}</p>
                                        </>
                                      )}
                                    </div>
                                    <div className="pt-2 border-t border-gray-200">
                                      <p className="text-xs font-medium text-gray-600 mb-1">Companies:</p>
                                      <p className="text-xs">{data.companies.slice(0, 3).join(", ")}{data.companies.length > 3 ? ` +${data.companies.length - 3} more` : ""}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline & Company Summary Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Timeline Chart */}
                <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                      Application Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.timelineData}>
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(280 65% 60%)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="glass-card p-3 border-white/30 bg-white/95 shadow-2xl">
                                  <p className="font-bold text-sm">{payload[0].payload.month}</p>
                                  <p className="text-xs text-gray-600">Applications: <span className="font-semibold text-purple-600">{payload[0].value}</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(217 91% 60%)"
                          strokeWidth={3}
                          name="Applications"
                          dot={{ fill: "hsl(217 91% 60%)", r: 4 }}
                          activeDot={{ r: 6, fill: "hsl(280 65% 60%)" }}
                          fill="url(#colorGradient)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Company Summary */}
                {selectedCompanies.length === 0 && (
                  <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                        Company Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2 pr-2">
                        {Object.entries(data.companyCounts)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([company, count]) => {
                            const details = data.companyDetails[company];

                            return (
                              <div
                                key={company}
                                className="group relative flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-blue-50/80 to-purple-50/80 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 cursor-pointer border border-transparent hover:border-purple-200"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                                    <Building2 className="h-3 w-3 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{company}</p>
                                    <p className="text-xs text-gray-600">{details?.industry || "N/A"}</p>
                                  </div>
                                </div>
                                <p className="font-bold text-sm text-purple-600">{count}</p>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Advanced Analytics Section */}
              {!analyticsLoading && analyticsData.stageConversionRates && (
                <div className="space-y-4 mt-6">

                  {/* Time to Hire Stats */}
                  {analyticsData.timeToHire.length > 0 && (
                    <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                          ⏱️ Time to Each Stage (Days)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {analyticsData.timeToHire.map((stat) => (
                            <div key={stat.transition} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600 font-medium mb-1">{stat.transition}</p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-gray-800">{stat.avg_days}</p>
                                <p className="text-xs text-gray-500">avg days</p>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                <span>Median: {stat.median_days}d</span>
                                <span className="mx-1">•</span>
                                <span>Range: {stat.min_days}-{stat.max_days}d</span>
                              </div>
                              <p className="text-xs text-purple-600 mt-1">{stat.sample_size} samples</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Success by Industry */}
                    {analyticsData.byIndustry.length > 0 && (
                      <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                            🏢 Success Rate by Industry
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analyticsData.byIndustry.slice(0, 6)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <YAxis type="category" dataKey="industry" width={100} tick={{ fontSize: 10 }} />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                      <div className="glass-card p-3 bg-white/98 shadow-xl border-gray-200">
                                        <p className="font-bold text-sm">{d.industry}</p>
                                        <p className="text-xs">Apps: {d.total_apps} | Interviews: {d.interviews} | Offers: {d.offers}</p>
                                        <p className="text-xs text-purple-600">Offer Rate: {d.offer_rate}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="offer_rate" fill="hsl(142 71% 45%)" radius={[0, 8, 8, 0]} name="Offer Rate %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Success by Day of Week */}
                    {analyticsData.byDayOfWeek.length > 0 && (
                      <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                            📅 Best Day to Apply
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analyticsData.byDayOfWeek}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis dataKey="day_of_week" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                      <div className="glass-card p-3 bg-white/98 shadow-xl border-gray-200">
                                        <p className="font-bold text-sm">{d.day_of_week}</p>
                                        <p className="text-xs">Applications: {d.applications}</p>
                                        <p className="text-xs">Response Rate: {d.response_rate}%</p>
                                        <p className="text-xs text-purple-600">Interview Rate: {d.interview_rate}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="applications" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} name="Applications" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Second Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Success by Company Size */}
                    {analyticsData.byCompanySize.length > 0 && (
                      <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                            📏 Success by Company Size
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analyticsData.byCompanySize}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis dataKey="company_size" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={60} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                      <div className="glass-card p-3 bg-white/98 shadow-xl border-gray-200">
                                        <p className="font-bold text-sm">{d.company_size}</p>
                                        <p className="text-xs">Total: {d.total_apps} | Interviews: {d.interviews}</p>
                                        <p className="text-xs text-green-600">Interview Rate: {d.interview_rate}%</p>
                                        <p className="text-xs text-purple-600">Offer Rate: {d.offer_rate}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="interview_rate" fill="hsl(280 65% 60%)" radius={[8, 8, 0, 0]} name="Interview Rate %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* ATS Score Correlation */}
                    {analyticsData.atsCorrelation.length > 0 && (
                      <Card className="glass-card border-white/20 bg-white/95 shadow-2xl">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                            🎯 ATS Score vs. Success
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analyticsData.atsCorrelation}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis dataKey="score_range" tick={{ fontSize: 9 }} angle={-10} textAnchor="end" height={50} />
                              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                      <div className="glass-card p-3 bg-white/98 shadow-xl border-gray-200">
                                        <p className="font-bold text-sm">{d.score_range}</p>
                                        <p className="text-xs">Total: {d.total_apps} apps</p>
                                        <p className="text-xs text-blue-600">Interview Rate: {d.interview_rate}%</p>
                                        <p className="text-xs text-green-600">Offer Rate: {d.offer_rate}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend />
                              <Bar dataKey="interview_rate" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} name="Interview %" />
                              <Bar dataKey="offer_rate" fill="hsl(142 71% 45%)" radius={[8, 8, 0, 0]} name="Offer %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
