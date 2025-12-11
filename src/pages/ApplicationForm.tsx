import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";

// Fuzzy logic helpers
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const getAcronym = (str: string) => {
  const words = str.trim().split(/[\s-]+/);
  if (words.length <= 1) return "";
  return words.map(w => w[0]).join('').toLowerCase();
};

const levenshteinDistance = (a: string, b: string) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];

};

// Common aliases map (normalized)
const commonAliases: Record<string, string[]> = {
  "cts": ["cognizant", "cognizanttechnologysolutions"],
  "tcs": ["tataconsultancyservices"],
  "infy": ["infosys"],
  "hcl": ["hcltechnologies", "hcltech"],
  "wipro": ["wiprolimited"],
  "ibm": ["internationalbusinessmachines"],
  "aws": ["amazonwebservices"],
  "ms": ["microsoft"],
  "fb": ["facebook", "meta"],
  "kp": ["kpit"],
};

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; company_website?: string; industry?: string; location?: string; company_size?: string }[]>([]);
  const [newCompany, setNewCompany] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestedCompany, setSuggestedCompany] = useState<{ id: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    companyId: "",
    companyName: "",
    industry: "",
    location: "",
    website: "",
    hrName: "",
    hrPhone: "",
    hrLinkedin: "",
    companySize: "",
    jobTitle: "",
    appliedDate: new Date().toISOString().split("T")[0],
    status: "Applied",
    jobDescription: "",
  });


  const statusOptions = [
    "Applied",
    "HR Screening Done",
    "Shortlisted",
    "Interview Scheduled",
    "Interview Rescheduled",
    "Selected",
    "Offer Released",
    "Rejected",
    "Ghosted"
  ];

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, industry, location, company_website, company_size")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleCompanySelect = (companyId: string) => {
    const selectedCompany = companies.find(c => c.id === companyId);
    if (selectedCompany) {
      setFormData({
        ...formData,
        companyId,
        companyName: selectedCompany.name,
        website: selectedCompany.company_website || "",
        industry: selectedCompany.industry || "",
        location: selectedCompany.location || "",
        companySize: selectedCompany.company_size || ""
      });
    }
  };

  const checkCompanyExists = (name: string) => {
    if (!name.trim()) {
      setSuggestedCompany(null);
      return;
    }

    const inputName = name.trim();
    const nInput = normalize(inputName);
    const inputAcronym = getAcronym(inputName);

    const match = companies.find(c => {
      const cName = c.name;
      const nCName = normalize(cName);
      const cAcronym = getAcronym(cName);

      // 1. Exact match (normalized)
      if (nInput === nCName) return true;

      // 2. Acronym match
      if (inputAcronym && inputAcronym === nCName) return true; // Input is "Tata..." (tcs), Existing is "tcs"
      if (cAcronym && nInput === cAcronym) return true; // Input is "tcs", Existing is "Tata..." (tcs)

      // 3. Substring match (if length >= 3)
      if (nInput.length >= 3 && nCName.includes(nInput)) return true; // "idea" in "ideas2technologies"
      if (nCName.length >= 3 && nInput.includes(nCName)) return true;

      // 4. Alias match
      if (commonAliases[nInput] && commonAliases[nInput].includes(nCName)) return true; // "cts" -> "cognizant"
      // Check if existing company is an alias for input (reverse check not strictly needed for "cts" input, but good for completeness)

      // 5. Levenshtein distance
      if (Math.abs(nInput.length - nCName.length) < 3) {
        const dist = levenshteinDistance(nInput, nCName);
        if (dist <= 2 && nInput.length > 3) return true;
      }

      return false;
    });

    setSuggestedCompany(match || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add applications");
        return;
      }

      let companyId = formData.companyId;

      // Create new company if needed
      if (newCompany || !formData.companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert([
            {
              name: formData.companyName,
              industry: formData.industry || null,
              location: formData.location || null,
              company_website: formData.website || null,
              company_size: formData.companySize || null,
              hr_name: formData.hrName || null,
              hr_phone: formData.hrPhone || null,
              hr_linkedin: formData.hrLinkedin || null,
            },
          ])
          .select()
          .single();

        if (companyError) throw companyError;
        if (!companyData) throw new Error("Failed to create company");
        companyId = companyData.id;
      } else if (companyId) {
        // Optionally update existing company HR/contact info if provided
        const companyUpdate: Record<string, string> = {};
        if (formData.industry.trim()) companyUpdate.industry = formData.industry.trim();
        if (formData.location.trim()) companyUpdate.location = formData.location.trim();
        if (formData.website.trim()) companyUpdate.company_website = formData.website.trim();
        if (formData.companySize.trim()) companyUpdate.company_size = formData.companySize.trim();
        if (formData.hrName.trim()) companyUpdate.hr_name = formData.hrName.trim();
        if (formData.hrPhone.trim()) companyUpdate.hr_phone = formData.hrPhone.trim();
        if (formData.hrLinkedin.trim()) companyUpdate.hr_linkedin = formData.hrLinkedin.trim();

        if (Object.keys(companyUpdate).length > 0) {
          const { error: companyUpdateError } = await supabase
            .from("companies")
            .update(companyUpdate)
            .eq("id", companyId);
          if (companyUpdateError) throw companyUpdateError;
        }
      }

      // Create application
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .insert([
          {
            company_id: companyId,
            job_title: formData.jobTitle,
            applied_date: formData.appliedDate,
            current_status: formData.status,
            job_description: formData.jobDescription || null,
            notes: null,
            name: formData.companyName,
            user_id: user.id,
            industry: formData.industry || null,
            location: formData.location || null,
            company_website: formData.website || null,
            company_size: formData.companySize || null,
            hr_name: formData.hrName || null,
            hr_phone: formData.hrPhone || null,
            hr_linkedin: formData.hrLinkedin || null,
          },
        ])
        .select()
        .single();

      if (appError) throw appError;
      if (!appData) throw new Error("Failed to create application");

      // Map status to event type for initial event
      const statusToEventType: Record<string, string> = {
        "Applied": "APPLIED",
        "HR Screening Done": "CALL",
        "Shortlisted": "SHORTLISTED",
        "Interview Scheduled": "INTERVIEW_SCHEDULED",
        "Interview Rescheduled": "INTERVIEW_RESCHEDULED",
        "Selected": "SELECTED",
        "Offer Released": "OFFER_RELEASED",
        "Rejected": "REJECTED",
        "Ghosted": "GHOSTED"
      };

      const eventType = statusToEventType[formData.status] || "CALL";

      // Create initial event with matching event type
      const { error: eventError } = await supabase
        .from("interview_events")
        .insert([{
          application_id: appData.id,
          event_type: eventType,
          event_date: formData.appliedDate,
          notes: "Initial application",
          user_id: user.id,
        }]);

      if (eventError) throw eventError;

      toast.success("Application added successfully!");
      navigate(`/applications/${appData.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add application");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full py-4">
        <Header />
      </div>
      <div className="container mx-auto px-4 pb-8 max-w-2xl">
        <div className="flex items-center justify-start mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/applications")} className="glass-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Selection */}
              <div className="space-y-2">
                <Label>Company</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!newCompany ? "default" : "outline"}
                    onClick={() => setNewCompany(false)}
                    className="flex-1"
                  >
                    Existing
                  </Button>
                  <Button
                    type="button"
                    variant={newCompany ? "default" : "outline"}
                    onClick={() => setNewCompany(true)}
                    className="flex-1"
                  >
                    New Company
                  </Button>
                </div>
              </div>

              {!newCompany ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Select Company</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {formData.companyId
                            ? companies.find((company) => company.id === formData.companyId)?.name
                            : "Search and select company..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search company..." />
                          <CommandEmpty>No company found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {companies.map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={() => {
                                  handleCompanySelect(company.id);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.companyId === company.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {company.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                        placeholder="e.g., Tech, Finance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder="e.g., San Francisco"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Company Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="e.g., https://company.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hrName">HR Name</Label>
                      <Input
                        id="hrName"
                        value={formData.hrName}
                        onChange={(e) =>
                          setFormData({ ...formData, hrName: e.target.value })
                        }
                        placeholder="Enter HR name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hrPhone">HR Phone</Label>
                      <Input
                        id="hrPhone"
                        value={formData.hrPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, hrPhone: e.target.value })
                        }
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hrLinkedin">HR LinkedIn</Label>
                      <Input
                        id="hrLinkedin"
                        value={formData.hrLinkedin}
                        onChange={(e) =>
                          setFormData({ ...formData, hrLinkedin: e.target.value })
                        }
                        placeholder="LinkedIn URL"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        setFormData({ ...formData, companySize: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Large">Large</SelectItem>
                        <SelectItem value="Mid">Mid</SelectItem>
                        <SelectItem value="Small">Small</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => {
                        setFormData({ ...formData, companyName: e.target.value });
                        checkCompanyExists(e.target.value);
                      }}
                      required={newCompany}
                      placeholder="Enter company name"
                    />
                    {suggestedCompany && (
                      <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <span>
                          Did you mean <strong>{suggestedCompany.name}</strong>?
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="hover:bg-yellow-100 text-yellow-700"
                          onClick={() => {
                            setNewCompany(false);
                            handleCompanySelect(suggestedCompany.id);
                            setSuggestedCompany(null);
                          }}
                        >
                          Use Existing
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                        required={newCompany}
                        placeholder="e.g., Tech, Finance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        required={newCompany}
                        placeholder="e.g., San Francisco"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Company Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      required={newCompany}
                      placeholder="e.g., https://company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size *</Label>
                    <Input
                      id="companySize"
                      value={formData.companySize}
                      onChange={(e) =>
                        setFormData({ ...formData, companySize: e.target.value })
                      }
                      required={newCompany}
                      placeholder="e.g., Large Scale, Mid Scale, Small Scale"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hrName">HR Name</Label>
                      <Input
                        id="hrName"
                        value={formData.hrName}
                        onChange={(e) =>
                          setFormData({ ...formData, hrName: e.target.value })
                        }
                        placeholder="HR Contact Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hrPhone">HR Phone</Label>
                      <Input
                        id="hrPhone"
                        value={formData.hrPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, hrPhone: e.target.value })
                        }
                        placeholder="HR Phone Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hrLinkedin">HR LinkedIn</Label>
                      <Input
                        id="hrLinkedin"
                        value={formData.hrLinkedin}
                        onChange={(e) =>
                          setFormData({ ...formData, hrLinkedin: e.target.value })
                        }
                        placeholder="HR LinkedIn URL"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Job Details */}
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, jobTitle: e.target.value })
                  }
                  required
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appliedDate">Applied Date *</Label>
                <Input
                  id="appliedDate"
                  type="date"
                  value={formData.appliedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, appliedDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  value={formData.jobDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, jobDescription: e.target.value })
                  }
                  required
                  placeholder="Describe the job role, responsibilities, requirements..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Adding..." : "Add Application"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/applications")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationForm;
