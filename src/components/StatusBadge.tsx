interface StatusBadgeProps {
  status: string;
}

// Color mapping for each event type
const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
  "HR Screening Done": {
    bg: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-300",
  },
  "Shortlisted": {
    bg: "bg-purple-100",
    text: "text-purple-900",
    border: "border-purple-300",
  },
  "Interview Scheduled": {
    bg: "bg-blue-200",
    text: "text-blue-900",
    border: "border-blue-400",
  },
  "Interview Rescheduled": {
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
  },
  "Selected": {
    bg: "bg-green-100",
    text: "text-green-900",
    border: "border-green-300",
  },
  "Offer Released": {
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-300",
  },
  "Ghosted": {
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-300",
  },
  "Applied": {
    bg: "bg-gray-100",
    text: "text-gray-900",
    border: "border-gray-300",
  },
};

import { useLanguage } from "@/contexts/LanguageContext";

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useLanguage();
  const colors = statusColorMap[status] || {
    bg: "bg-gray-100",
    text: "text-gray-900",
    border: "border-gray-300",
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full font-medium text-sm border ${colors.bg} ${colors.text} ${colors.border}`}>
      {t(status)}
    </div>
  );
};
