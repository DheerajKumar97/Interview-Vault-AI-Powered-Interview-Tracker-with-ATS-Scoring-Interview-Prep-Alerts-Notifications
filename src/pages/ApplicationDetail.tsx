import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import dashboardBg from "@/assets/dashboard-bg.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Plus, Building2, Briefcase, Calendar, Eye, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Application {
  id: string;
  company_id: string;
  job_title: string;
  applied_date: string;
  current_status: string;
  job_description: string;
  hr_name?: string;
  hr_phone?: string;
  hr_linkedin?: string;
  company_website?: string;
  industry?: string;
  location?: string;
  companies: {
    name: string;
    industry: string;
    location: string;
    company_website?: string;
    hr_name?: string;
    hr_phone?: string;
    hr_linkedin?: string;
  };
}

interface InterviewEvent {
  id: string;
  event_type: string;
  event_date: string;
  notes: string;
  created_at: string;
}

const eventTypeLabels: Record<string, string> = {
  APPLIED: "Applied",
  CALL: "HR Screening Done",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_RESCHEDULED: "Interview Rescheduled",
  SELECTED: "Selected",
  OFFER_RELEASED: "Offer Released",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

// Define the chronological order of event types
const eventTypeOrder: Record<string, number> = {
  APPLIED: -1,
  CALL: 0,
  SHORTLISTED: 1,
  INTERVIEW_SCHEDULED: 2,
  INTERVIEW_RESCHEDULED: 3,
  SELECTED: 4,
  OFFER_RELEASED: 5,
  REJECTED: 6,
  GHOSTED: 7,
};

// Validation helper function to check date sequence
const validateDateSequence = (
  newEventType: string,
  newEventDate: string,
  existingEvents: InterviewEvent[],
  appliedDate: string
): { isValid: boolean; error?: string } => {
  const newDate = new Date(newEventDate);
  const applied = new Date(appliedDate);

  // Check if new event date is after applied date
  if (newDate < applied) {
    return {
      isValid: false,
      error: `Event date must be after the application date (${new Date(appliedDate).toLocaleDateString()}).`,
    };
  }

  // Get the order of the new event
  const newEventOrder = eventTypeOrder[newEventType];

  // Find all existing events of the same or earlier types
  const relevantEvents = existingEvents.filter(
    (event) => eventTypeOrder[event.event_type] !== undefined
  );

  // Check against previous stage (must be greater than)
  const previousStageType = Object.entries(eventTypeOrder).find(
    ([_, order]) => order === newEventOrder - 1
  )?.[0];

  if (previousStageType) {
    const previousEvent = relevantEvents.find((e) => e.event_type === previousStageType);
    if (previousEvent) {
      const previousDate = new Date(previousEvent.event_date);
      if (newDate <= previousDate) {
        return {
          isValid: false,
          error: `${eventTypeLabels[newEventType]} date must be after ${eventTypeLabels[previousStageType]} date (${previousDate.toLocaleDateString()}).`,
        };
      }
    }
  }

  // Check against next stage (must be less than)
  const nextStageType = Object.entries(eventTypeOrder).find(
    ([_, order]) => order === newEventOrder + 1
  )?.[0];

  if (nextStageType) {
    const nextEvent = relevantEvents.find((e) => e.event_type === nextStageType);
    if (nextEvent) {
      const nextDate = new Date(nextEvent.event_date);
      if (newDate >= nextDate) {
        return {
          isValid: false,
          error: `${eventTypeLabels[newEventType]} date must be before ${eventTypeLabels[nextStageType]} date (${nextDate.toLocaleDateString()}).`,
        };
      }
    }
  }

  return { isValid: true };
};

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [application, setApplication] = useState<Application | null>(null);
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  // Event Form Data
  const [eventFormData, setEventFormData] = useState({
    eventType: "CALL",
    eventDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Edit Application Form Data
  const [editFormData, setEditFormData] = useState({
    job_title: "",
    hr_name: "",
    hr_phone: "",
    hr_linkedin: "",
    company_website: "",
    location: "",
    industry: "",
    job_description: "",
  });

  useEffect(() => {
    if (id) {
      fetchApplication();
      fetchEvents();
    }
  }, [id]);

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          company_id,
          job_title,
          applied_date,
          current_status,
          job_description,
          hr_name,
          hr_phone,
          hr_linkedin,
          company_website,
          industry,
          location,
          companies (
            name,
            industry,
            location,
            company_website
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setApplication(data);

      // Initialize edit form data
      setEditFormData({
        job_title: data.job_title || "",
        hr_name: data.hr_name || "",
        hr_phone: data.hr_phone || "",
        hr_linkedin: data.hr_linkedin || "",
        company_website: data.company_website || data.companies?.company_website || "",
        location: data.location || data.companies?.location || "",
        industry: data.industry || data.companies?.industry || "",
        job_description: data.job_description || "",
      });

      // Autofill missing application data from company data
      if (data.companies) {
        const updates: any = {};
        let needsUpdate = false;

        if (!data.company_website && data.companies.company_website) {
          updates.company_website = data.companies.company_website;
          needsUpdate = true;
        }
        if (!data.industry && data.companies.industry) {
          updates.industry = data.companies.industry;
          needsUpdate = true;
        }
        if (!data.location && data.companies.location) {
          updates.location = data.companies.location;
          needsUpdate = true;
        }
        if (!data.hr_name && data.companies.hr_name) {
          updates.hr_name = data.companies.hr_name;
          needsUpdate = true;
        }
        if (!data.hr_phone && data.companies.hr_phone) {
          updates.hr_phone = data.companies.hr_phone;
          needsUpdate = true;
        }
        if (!data.hr_linkedin && data.companies.hr_linkedin) {
          updates.hr_linkedin = data.companies.hr_linkedin;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log("Autofilling missing application data...", updates);
          const { error: updateError } = await supabase
            .from("applications")
            .update(updates)
            .eq("id", id);

          if (updateError) {
            console.error("Failed to autofill application data:", updateError);
          } else {
            // Update local state to reflect changes
            setApplication({ ...data, ...updates });
          }
        }
      }
    } catch (error: any) {
      toast.error("Failed to fetch application");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_events")
        .select("*")
        .eq("application_id", id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleUpdateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update Application
      const { error: appError } = await supabase
        .from("applications")
        .update({
          job_title: editFormData.job_title,
          hr_name: editFormData.hr_name,
          hr_phone: editFormData.hr_phone,
          hr_linkedin: editFormData.hr_linkedin,
          company_website: editFormData.company_website,
          location: editFormData.location,
          industry: editFormData.industry,
          job_description: editFormData.job_description,
        })
        .eq("id", id);

      if (appError) throw appError;

      // Update Company if company_id exists
      if (application?.company_id) {
        const { error: companyError } = await supabase
          .from("companies")
          .update({
            company_website: editFormData.company_website,
            industry: editFormData.industry,
            location: editFormData.location,
            hr_name: editFormData.hr_name,
            hr_phone: editFormData.hr_phone,
            hr_linkedin: editFormData.hr_linkedin,
          })
          .eq("id", application.company_id);

        if (companyError) {
          console.error("Error updating company details:", companyError);
          toast.error("Application updated, but failed to update company details.");
        }
      }

      toast.success("Application and Company details updated successfully");
      setEditDialogOpen(false);
      fetchApplication();
    } catch (error: any) {
      toast.error("Failed to update application");
      console.error(error);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    try {
      // Validate date sequence
      if (!application) {
        toast.error("Application data not found");
        return;
      }

      const validation = validateDateSequence(
        eventFormData.eventType,
        eventFormData.eventDate,
        events,
        application.applied_date
      );

      if (!validation.isValid) {
        setValidationError(validation.error || "Invalid date sequence");
        toast.error(validation.error || "Invalid date sequence");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add events");
        return;
      }

      // Insert the event
      const { error: eventError } = await supabase.from("interview_events").insert([{
        application_id: id,
        event_type: eventFormData.eventType,
        event_date: eventFormData.eventDate,
        notes: eventFormData.notes || null,
        user_id: user.id,
      }]);

      if (eventError) throw eventError;

      // Update the application's current_status to match the new event
      const statusMapping: Record<string, string> = {
        APPLIED: "Applied",
        CALL: "HR Screening Done",
        SHORTLISTED: "Shortlisted",
        INTERVIEW_SCHEDULED: "Interview Scheduled",
        INTERVIEW_RESCHEDULED: "Interview Rescheduled",
        SELECTED: "Selected",
        OFFER_RELEASED: "Offer Released",
        REJECTED: "Rejected",
        GHOSTED: "Ghosted",
      };

      const newStatus = statusMapping[eventFormData.eventType];
      console.log("Updating status to:", newStatus, "for application:", id);

      const { error: updateError } = await supabase
        .from("applications")
        .update({ current_status: newStatus })
        .eq("id", id);

      if (updateError) {
        console.error("Status update error:", updateError);
        throw updateError;
      }

      console.log("Status updated successfully!");
      toast.success("Event added and status updated successfully!");
      setDialogOpen(false);
      setValidationError("");
      setEventFormData({
        eventType: "CALL",
        eventDate: new Date().toISOString().split("T")[0],
        notes: "",
      });

      // Refresh the data
      await fetchApplication();
      await fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to add event");
      console.error(error);
    }
  };

  const getEventColor = (eventType: string) => {
    const eventColorMap: Record<string, { border: string; bg: string; textColor: string }> = {
      APPLIED: {
        border: "border-l-4 border-gray-400",
        bg: "bg-gray-50",
        textColor: "text-gray-700",
      },
      CALL: {
        border: "border-l-4 border-blue-500",
        bg: "bg-blue-50",
        textColor: "text-blue-700",
      },
      SHORTLISTED: {
        border: "border-l-4 border-purple-500",
        bg: "bg-purple-50",
        textColor: "text-purple-700",
      },
      INTERVIEW_SCHEDULED: {
        border: "border-l-4 border-blue-600",
        bg: "bg-blue-50",
        textColor: "text-blue-800",
      },
      INTERVIEW_RESCHEDULED: {
        border: "border-l-4 border-amber-500",
        bg: "bg-amber-50",
        textColor: "text-amber-700",
      },
      SELECTED: {
        border: "border-l-4 border-green-600",
        bg: "bg-green-50",
        textColor: "text-green-700",
      },
      OFFER_RELEASED: {
        border: "border-l-4 border-emerald-600",
        bg: "bg-emerald-50",
        textColor: "text-emerald-700",
      },
      REJECTED: {
        border: "border-l-4 border-red-600",
        bg: "bg-red-50",
        textColor: "text-red-700",
      },
      GHOSTED: {
        border: "border-l-4 border-red-600",
        bg: "bg-red-50",
        textColor: "text-red-700",
      },
    };

    return eventColorMap[eventType] || {
      border: "border-l-4 border-gray-500",
      bg: "bg-gray-50",
      textColor: "text-gray-700",
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("Loading...")}</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("Application not found")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <Header />
      </div>
      <div className="relative container mx-auto px-4 pb-8 pt-2 max-w-4xl">
        <div className="flex items-center justify-between mb-6 pt-40">
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/applications")}
              className="shadow-lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t("View Data")}
            </Button>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shadow-sm bg-white">
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("Edit")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("Edit Application Details")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateApplication} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job_title">{t("Job Title")}</Label>
                      <Input
                        id="job_title"
                        value={editFormData.job_title}
                        onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_website">{t("Company Website")}</Label>
                      <Input
                        id="company_website"
                        value={editFormData.company_website}
                        onChange={(e) => setEditFormData({ ...editFormData, company_website: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">{t("Industry")}</Label>
                      <Input
                        id="industry"
                        value={editFormData.industry}
                        onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">{t("Location")}</Label>
                      <Input
                        id="location"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">{t("HR Details")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hr_name">{t("HR Name")}</Label>
                        <Input
                          id="hr_name"
                          value={editFormData.hr_name}
                          onChange={(e) => setEditFormData({ ...editFormData, hr_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hr_phone">{t("HR Phone")}</Label>
                        <Input
                          id="hr_phone"
                          value={editFormData.hr_phone}
                          onChange={(e) => setEditFormData({ ...editFormData, hr_phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="hr_linkedin">{t("HR LinkedIn")}</Label>
                        <Input
                          id="hr_linkedin"
                          value={editFormData.hr_linkedin}
                          onChange={(e) => setEditFormData({ ...editFormData, hr_linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_description">{t("Job Description")}</Label>
                    <Textarea
                      id="job_description"
                      value={editFormData.job_description}
                      onChange={(e) => setEditFormData({ ...editFormData, job_description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      {t("Cancel")}
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {t("Save Changes")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Button variant="outline" size="icon" onClick={() => navigate("/applications")} className="glass-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Application Info */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{application.job_title}</CardTitle>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{application.companies.name}</span>
                    {(application.industry || application.companies.industry) && (
                      <span className="text-sm">• {application.industry || application.companies.industry}</span>
                    )}
                    {(application.location || application.companies.location) && (
                      <span className="text-sm">• {application.location || application.companies.location}</span>
                    )}
                  </div>

                  {/* Company Details Section */}
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">{t("Company")}:</span>{" "}
                      <span className="text-gray-600">{application.companies.name}</span>
                    </div>
                    {(application.company_website || application.companies.company_website) && (
                      <div>
                        <span className="font-semibold text-gray-700">{t("Website")}:</span>{" "}
                        <a
                          href={application.company_website || application.companies.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.company_website || application.companies.company_website}
                        </a>
                      </div>
                    )}
                    {application.hr_name && (
                      <div>
                        <span className="font-semibold text-gray-700">{t("HR Name")}:</span>{" "}
                        <span className="text-gray-600">{application.hr_name}</span>
                      </div>
                    )}
                    {application.hr_phone && (
                      <div>
                        <span className="font-semibold text-gray-700">{t("HR No")}:</span>{" "}
                        <span className="text-gray-600">{application.hr_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>{t("Applied")}: {new Date(application.applied_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={application.current_status} />
            </div>
          </CardHeader>
          {application.job_description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{application.job_description}</p>
            </CardContent>
          )}
        </Card>

        {/* Events Timeline */}
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("Interview Timeline")}</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setValidationError("");
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("Add Event")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("Add Interview Event")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEvent} className="space-y-4">
                    {validationError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800 font-medium">⚠️ Validation Error</p>
                        <p className="text-sm text-red-700 mt-1">{validationError}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="eventType">{t("Event Type")}</Label>
                      <Select
                        value={eventFormData.eventType}
                        onValueChange={(value) => {
                          setEventFormData({ ...eventFormData, eventType: value });
                          setValidationError("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(eventTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {t(label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventDate">{t("Event Date")}</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventFormData.eventDate}
                        onChange={(e) => {
                          setEventFormData({ ...eventFormData, eventDate: e.target.value });
                          setValidationError("");
                        }}
                        required
                      />
                      {application && (
                        <p className="text-xs text-muted-foreground">
                          {t("Application date")}: {new Date(application.applied_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventNotes">{t("Notes")}</Label>
                      <Textarea
                        id="eventNotes"
                        value={eventFormData.notes}
                        onChange={(e) =>
                          setEventFormData({ ...eventFormData, notes: e.target.value })
                        }
                        placeholder="Any additional details..."
                        rows={3}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-xs font-semibold text-blue-900 mb-2">📅 {t("Date Order Requirements")}:</p>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>✓ {t("Shortlisted")} &lt; {t("Interview Scheduled")}</li>
                        <li>✓ {t("Interview Scheduled")} &lt; {t("Interview Rescheduled")}</li>
                        <li>✓ {t("Interview Rescheduled")} &lt; {t("Selected")}</li>
                        <li>✓ {t("Selected")} &lt; {t("Offer Released")}</li>
                        <li>✓ {t("All dates must be after Application Date")}</li>
                      </ul>
                    </div>

                    <Button type="submit" className="w-full">
                      {t("Add Event")}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("No events yet. Add your first event to track progress.")}
                </p>
              ) : (
                events.map((event) => {
                  const colors = getEventColor(event.event_type);
                  return (
                    <div
                      key={event.id}
                      className={`${colors.border} pl-4 py-3 rounded-r-lg ${colors.bg} hover:opacity-80 transition-all cursor-pointer`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`font-semibold ${colors.textColor}`}>
                            {t(eventTypeLabels[event.event_type])}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(event.event_date).toLocaleDateString()}
                          </p>
                          {event.notes && (
                            <p className="text-sm mt-2 text-gray-700">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationDetail;
