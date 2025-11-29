import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Upload, Download, Trash2, Plus, Filter, BarChart3, Calculator } from "lucide-react";
import * as XLSX from "xlsx";
import Header from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { findMatchingCompany } from "@/utils/companyMatching";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Application {
  id: string;
  job_title: string;
  applied_date: string;
  current_status: string;
  scheduled_date?: string;
  companies: {
    name: string;
  };
}

const Applications = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStatusId, setEditStatusId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    fetchApplications();
    fetchCompanies();
  }, []);

  useEffect(() => {
    // Get companies from URL params and set filter
    const companiesParam = searchParams.get('companies');
    if (companiesParam) {
      const companyList = companiesParam.split(',');
      setFilterCompany(companyList);
    }
  }, [searchParams]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          job_title,
          applied_date,
          current_status,
          companies (
            name
          )
        `)
        .order("applied_date", { ascending: false });

      if (error) throw error;

      // For each application, fetch the latest interview event date if status is Interview Scheduled or Rescheduled
      const applicationsWithDates = await Promise.all(
        (data || []).map(async (app) => {
          if (app.current_status === "Interview Scheduled" || app.current_status === "Interview Rescheduled") {
            const { data: events } = await supabase
              .from("interview_events")
              .select("event_date")
              .eq("application_id", app.id)
              .in("event_type", ["INTERVIEW_SCHEDULED", "INTERVIEW_RESCHEDULED"])
              .order("event_date", { ascending: false })
              .limit(1);

            return {
              ...app,
              scheduled_date: events && events.length > 0 ? events[0].event_date : undefined
            };
          }
          return app;
        })
      );

      setApplications(applicationsWithDates);
    } catch (error: any) {
      toast.error(t("Failed to fetch applications"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setApplications(applications.filter((app) => app.id !== deleteId));
      toast.success(t("Application deleted successfully"));
    } catch (error: any) {
      toast.error(t("Failed to delete application"));
      console.error(error);
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!editStatusId || !newStatus) return;

    try {
      const { error } = await supabase
        .from("applications")
        .update({ current_status: newStatus })
        .eq("id", editStatusId);

      if (error) throw error;

      setApplications(applications.map((app) =>
        app.id === editStatusId ? { ...app, current_status: newStatus } : app
      ));
      toast.success(t("Status updated successfully"));
      setEditStatusId(null);
    } catch (error: any) {
      toast.error(t("Failed to update status"));
      console.error(error);
    }
  };

  const handleExport = () => {
    const exportData = applications.map((app) => ({
      "Job Title": app.job_title,
      "Company": app.companies.name,
      "Applied Date": new Date(app.applied_date).toLocaleDateString(),
      "Status": app.current_status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, "interview_applications.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error(t("You must be logged in to import applications"));
          return;
        }

        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        console.log("Parsed Excel data:", data);

        if (data.length === 0) {
          toast.error(t("Excel file is empty!"));
          return;
        }

        // Fetch existing applications to check for duplicates
        const { data: existingApps } = await supabase
          .from("applications")
          .select("companies (name)")
          .eq("user_id", user.id);

        const existingCompanyFirstWords = new Set(
          (existingApps || []).map((app: any) =>
            app.companies?.name?.trim().split(" ")[0].toLowerCase()
          ).filter(Boolean)
        );

        // Fetch all companies for fuzzy matching
        const { data: allCompanies } = await supabase
          .from("companies")
          .select("*");

        const companiesList = allCompanies || [];

        let errorCount = 0;
        let successCount = 0;
        let skippedCount = 0;

        for (const row of data) {
          try {
            // More flexible column name matching (case-insensitive)
            const getColumnValue = (possibleNames: string[]) => {
              for (const name of possibleNames) {
                const value = row[name];
                if (value !== undefined && value !== null && value !== "") {
                  return value;
                }
              }
              return undefined;
            };

            const companyName = getColumnValue([
              "Company Name", "Company", "company", "company_name", "COMPANY",
              "Organization", "organisation", "Employer"
            ]);

            const jobTitle = getColumnValue([
              "Job Title", "Job Tittle", "Job", "job_title", "job", "JOB TITLE", "Title",
              "Position", "Role", "Designation"
            ]);

            const appliedDate = getColumnValue([
              "Applied Date", "Date", "applied_date", "date", "APPLIED DATE",
              "Application Date", "Applied On"
            ]);

            const status = getColumnValue([
              "Status", "status", "STATUS", "Current Status", "current_status"
            ]) || "Applied";

            const scheduledDate = getColumnValue([
              "Scheduled Date", "scheduled_date", "SCHEDULED DATE", "Interview Date",
              "interview_date", "Schedule"
            ]);

            const hrName = getColumnValue([
              "HR Name", "hr_name", "HR", "Recruiter", "recruiter", "Contact Person"
            ]);

            const hrPhone = getColumnValue([
              "HR No", "HR Number", "Phone", "Mobile", "Contact", "hr_phone", "Contact No"
            ]);

            const hrLinkedin = getColumnValue([
              "HR LinkedIn", "hr_linkedin", "LinkedIn", "linkedin", "Profile", "profile"
            ]);

            console.log("Processing row:", { companyName, jobTitle, appliedDate, status, scheduledDate, hrName, hrPhone, hrLinkedin });

            if (!companyName || !jobTitle) {
              console.error("Missing required fields:", row);
              errorCount++;
              continue;
            }

            // Duplicate Check
            const companyFirstWord = companyName.trim().split(" ")[0].toLowerCase();
            if (existingCompanyFirstWords.has(companyFirstWord)) {
              console.log("Skipping duplicate company:", companyName);
              skippedCount++;
              continue;
            }

            // Find or create company
            // Use fuzzy matching first
            let companyId: string | undefined;
            let existingCompany: any = null;

            const matchedCompany = findMatchingCompany(companyName, companiesList);

            if (matchedCompany) {
              console.log(`Fuzzy match found: "${companyName}" -> "${matchedCompany.name}"`);
              companyId = matchedCompany.id;
              existingCompany = matchedCompany;
            } else {
              // Fallback to exact lookup if fuzzy match failed (though fuzzy match covers exact match)
              const { data: exactCompany, error: lookupError } = await supabase
                .from("companies")
                .select("*")
                .eq("name", companyName)
                .maybeSingle();

              if (lookupError) {
                console.error("Company lookup error:", lookupError);
                throw lookupError;
              }

              if (exactCompany) {
                companyId = exactCompany.id;
                existingCompany = exactCompany;
              }
            }

            if (!companyId) {
              console.log("Creating new company:", companyName);
              const { data: newCompany, error: companyError } = await supabase
                .from("companies")
                .insert([{ name: companyName }])
                .select()
                .single();

              if (companyError) {
                console.error("Company creation error:", companyError);
                throw companyError;
              }
              companyId = newCompany.id;
              // Add to local list for subsequent rows to match against
              companiesList.push(newCompany);
            }

            // Parse applied date
            let parsedDate = new Date().toISOString().split("T")[0];
            if (appliedDate) {
              const dateObj = new Date(appliedDate);
              if (!isNaN(dateObj.getTime())) {
                parsedDate = dateObj.toISOString().split("T")[0];
              }
            }

            console.log("Inserting application:", { companyId, jobTitle, parsedDate, status });

            // Insert application with autofilled data from company if available (Sync for NULL values)
            const { data: newApplication, error: appError } = await supabase
              .from("applications")
              .insert([{
                company_id: companyId,
                job_title: jobTitle,
                applied_date: parsedDate,
                current_status: status,
                name: companyName,
                user_id: user.id,
                // Sync logic: Use Excel value if present, otherwise fallback to existing company data
                company_website: existingCompany?.company_website,
                industry: existingCompany?.industry,
                location: existingCompany?.location,
                hr_name: hrName || existingCompany?.hr_name,
                hr_phone: hrPhone || existingCompany?.hr_phone,
                hr_linkedin: hrLinkedin || existingCompany?.hr_linkedin,
                company_size: existingCompany?.company_size,
              }])
              .select("id")
              .single();

            if (appError) {
              console.error("Application insert error:", appError);
              throw appError;
            }

            // Add to existing set to prevent duplicates within the same import
            existingCompanyFirstWords.add(companyFirstWord);

            // If there's a scheduled date and status is Interview Scheduled/Rescheduled, create an event
            if (scheduledDate && newApplication &&
              (status === "Interview Scheduled" || status === "Interview Rescheduled")) {

              let parsedScheduledDate = new Date().toISOString().split("T")[0];
              const scheduledDateObj = new Date(scheduledDate);
              if (!isNaN(scheduledDateObj.getTime())) {
                parsedScheduledDate = scheduledDateObj.toISOString().split("T")[0];
              }

              const eventType = status === "Interview Scheduled" ? "INTERVIEW_SCHEDULED" : "INTERVIEW_RESCHEDULED";

              console.log("Creating interview event:", {
                applicationId: newApplication.id,
                eventType,
                parsedScheduledDate
              });

              const { error: eventError } = await supabase
                .from("interview_events")
                .insert([{
                  application_id: newApplication.id,
                  event_type: eventType,
                  event_date: parsedScheduledDate,
                  notes: "Imported from Excel",
                  user_id: user.id,
                }]);

              if (eventError) {
                console.error("Event creation error:", eventError);
              } else {
                console.log("✅ Created interview event for:", jobTitle, "on", parsedScheduledDate);
              }
            }

            console.log("Successfully inserted:", jobTitle);
            successCount++;
          } catch (error) {
            console.error("Error importing row:", row, error);
            errorCount++;
          }
        }

        toast.success(`${t("Imported")} ${successCount} ${t("records successfully!")} ${skippedCount > 0 ? `${skippedCount} ${t("skipped (duplicates).")}` : ""} ${errorCount > 0 ? `${errorCount} ${t("failed.")}` : ""}`);
        fetchApplications();
        e.target.value = ""; // Reset file input
      } catch (error) {
        console.error("File parsing error:", error);
        toast.error(t("Failed to parse file"));
        setSearchParams({});
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL applications? This action cannot be undone!")) {
      return;
    }

    try {
      const { error } = await supabase.from("applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      toast.success(t("All applications cleared successfully!"));
      fetchApplications();
    } catch (error: any) {
      toast.error(t("Failed to clear applications"));
      console.error(error);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filterCompany.length > 0 && !filterCompany.includes(app.companies.name)) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(app.current_status)) return false;
    return true;
  });

  const statuses = [
    "Applied",
    "HR Screening Done",
    "Shortlisted",
    "Interview Scheduled",
    "Interview Rescheduled",
    "Selected",
    "Offer Released",
    "Ghosted",
  ];

  return (
    <div
      className="min-h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50"
    >
      <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>
      <div className="relative container mx-auto px-4 pb-8 pt-4">
        <div className="mb-6">
          <Header />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              id="import-file"
              onChange={handleImport}
            />
            <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()} className="glass-card border-gray-200 bg-white/80">
              <Upload className="h-4 w-4 mr-2" />
              {t("Import")}
            </Button>
            <Button variant="outline" onClick={handleExport} className="glass-card border-gray-200 bg-white/80">
              <Download className="h-4 w-4 mr-2" />
              {t("Export")}
            </Button>
            <Button onClick={() => navigate("/applications/new")} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {t("Add Application")}
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:from-purple-700 hover:to-pink-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("View Dashboard")}
            </Button>
            <Button onClick={() => navigate("/ats-score-checker")} className="bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg hover:from-green-700 hover:to-teal-700">
              <Calculator className="h-4 w-4 mr-2" />
              {t("Check ATS Score")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              className="shadow-lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("Clear All")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 glass-card border-gray-200 bg-white/90 shadow-lg p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex flex-col gap-2 w-full md:w-[300px]">
              <MultiSelect
                options={companies.map((c) => ({ label: c.name, value: c.name }))}
                selected={filterCompany}
                onChange={setFilterCompany}
                placeholder={t("Filter by company...")}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2 w-full md:w-[300px]">
              <MultiSelect
                options={statuses.map((s) => ({ label: t(s), value: s }))}
                selected={filterStatus}
                onChange={setFilterStatus}
                placeholder={t("Filter by status...")}
                className="w-full"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFilterCompany([]);
                setFilterStatus([]);
                setSearchParams({});
              }}
              disabled={filterCompany.length === 0 && filterStatus.length === 0}
              className="glass-card border-gray-200 bg-white/80 hover:bg-white disabled:opacity-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t("Clear Filter")}
            </Button>
          </div>
        </Card>

        <Card className="glass-card border-gray-200 bg-white/90 shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t("Loading...")}</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{t("No applications found")}</p>
              <Button onClick={() => navigate("/applications/new")}>
                {t("Add Your First Application")}
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
                    <TableHead className="font-semibold">{t("Current Status")}</TableHead>
                    <TableHead className="font-semibold">{t("Scheduled Date")}</TableHead>
                    <TableHead className="text-right font-semibold">{t("Actions")}</TableHead>
                  </TableRow >
                </TableHeader >
                <TableBody>
                  {filteredApplications.map((app) => (
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
                      <TableCell>
                        <div
                          className="cursor-pointer hover:opacity-80"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStatusId(app.id);
                            setNewStatus(app.current_status);
                          }}
                        >
                          <StatusBadge status={app.current_status} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {(app.current_status === "Interview Scheduled" || app.current_status === "Interview Rescheduled") && app.scheduled_date ? (
                          <span className="text-sm font-medium text-blue-600">
                            {new Date(app.scheduled_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="glass-card"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/applications/${app.id}`);
                          }}
                        >
                          {t("View")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(app.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table >
            </div >
          )}
        </Card >
      </div >

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This action cannot be undone. This will permanently delete the application.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default Applications;