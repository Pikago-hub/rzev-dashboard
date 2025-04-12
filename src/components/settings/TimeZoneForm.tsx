import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkspaceTimeZone {
  timezone?: string;
}

interface TimeZoneFormProps {
  workspaceProfile: WorkspaceTimeZone;
  translationFunc: (key: string) => string;
  onTimeZoneChange: (timezone: string) => void;
}

// List of common timezones
const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Europe/Athens", label: "Eastern European Time (EET)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Asia/Kolkata", label: "Indian Standard Time (IST)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZT)" },
];

export const TimeZoneForm = ({
  workspaceProfile,
  translationFunc: t,
  onTimeZoneChange,
}: TimeZoneFormProps) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(
    workspaceProfile?.timezone || "UTC"
  );

  useEffect(() => {
    if (workspaceProfile?.timezone) {
      setSelectedTimeZone(workspaceProfile.timezone);
    }
  }, [workspaceProfile]);

  const handleTimeZoneChange = (value: string) => {
    setSelectedTimeZone(value);
    onTimeZoneChange(value);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timezone-select">{t("business.timezone")}</Label>
        <Select value={selectedTimeZone} onValueChange={handleTimeZoneChange}>
          <SelectTrigger id="timezone-select" className="w-full">
            <SelectValue placeholder={t("business.selectTimezone")} />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {t("business.timezoneDescription")}
        </p>
      </div>
    </div>
  );
};
