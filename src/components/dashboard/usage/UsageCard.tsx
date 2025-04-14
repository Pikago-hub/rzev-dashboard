"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UsageCardProps {
  title: string;
  description?: string;
  current: number;
  limit: number;
  unit?: string;
  percentage: number;
  isInTrial?: boolean;
}

export function UsageCard({
  title,
  description,
  current,
  limit,
  unit = "",
  percentage,
  isInTrial = false,
}: UsageCardProps) {
  const t = useTranslations("dashboard.usage");

  // Determine color based on usage percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-destructive";
    if (percent >= 75) return "bg-warning";
    return "bg-primary";
  };

  const progressColor = getProgressColor(percentage);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isInTrial && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {t("trialBadge")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            {current.toLocaleString()} / {limit.toLocaleString()}
            {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{description || t("usageDescription", { resource: title.toLowerCase() })}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Progress value={percentage} className={`h-2 ${progressColor}`} />
        <p className="text-xs text-muted-foreground mt-2">
          {percentage}% {t("used")}
        </p>
      </CardContent>
    </Card>
  );
}
