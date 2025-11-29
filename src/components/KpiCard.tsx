import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Building2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  companies?: Array<{
    name: string;
    industry?: string;
    company_size?: string;
    hr_name?: string;
    hr_phone?: string;
  }>;
  onClick?: () => void;
}

export const KpiCard = ({ title, value, icon: Icon, description, companies, onClick }: KpiCardProps) => {
  const titleWords = title.split(' ');
  const firstWord = titleWords[0];
  const restWords = titleWords.slice(1).join(' ');
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Card 
            className="glass-card hover:shadow-card-hover transition-all duration-300 border-0 overflow-hidden cursor-pointer" 
            onClick={onClick}
          >
            <div className="gradient-blue-purple-subtle h-full">
              <CardHeader className="flex flex-row items-start justify-between pb-3 gap-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex-1 min-w-0 leading-tight">
                  <div>{firstWord}</div>
                  {restWords && <div>{restWords}</div>}
                </CardTitle>
                <div className="p-2 rounded-lg gradient-blue-purple flex-shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {value}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground mt-2">{description}</p>
                )}
              </CardContent>
            </div>
          </Card>
        </TooltipTrigger>
        {companies && companies.length > 0 && (
          <TooltipContent side="bottom" className="glass-card border-gray-200 bg-white/95 shadow-2xl p-3 max-w-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <Building2 className="h-4 w-4 text-purple-600" />
                <p className="font-bold text-sm">{title}</p>
              </div>
              <div className="space-y-1">
                {companies.slice(0, 5).map((company, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                  </div>
                ))}
                {companies.length > 5 && (
                  <p className="text-xs text-gray-500 pl-3 pt-1">
                    +{companies.length - 5} more companies
                  </p>
                )}
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
