import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OperatingHours, DayHours } from "@/types/workspace";
import { generateTimeSlots } from "@/utils/calendar-utils";

interface OperatingHoursFormProps {
  operatingHours: OperatingHours | null;
  translationFunc: (key: string) => string;
  onOperatingHoursChange: (hours: OperatingHours) => void;
}

// Day of week mapping
const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export const OperatingHoursForm = ({
  operatingHours,
  translationFunc: t,
  onOperatingHoursChange,
}: OperatingHoursFormProps) => {
  const [hours, setHours] = useState<OperatingHours>(operatingHours || {});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number>(-1);

  // Generate array of available times in 30-minute increments
  const timeOptions = generateTimeSlots();

  // Update local state when props change
  useEffect(() => {
    if (operatingHours) {
      setHours(operatingHours);
    }
  }, [operatingHours]);

  // Handle opening the dialog for adding new hours
  const handleAddHours = () => {
    setCurrentDay("");
    setStartTime("09:00");
    setEndTime("17:00");
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  // Handle opening the dialog for editing existing hours
  const handleEditHours = (day: string, index: number) => {
    const dayKey = day as keyof OperatingHours;
    const dayHours = hours[dayKey];

    if (dayHours && Array.isArray(dayHours) && dayHours[index]) {
      setCurrentDay(day);
      setStartTime(dayHours[index].open);
      setEndTime(dayHours[index].close);
      setIsEditing(true);
      setEditIndex(index);
      setIsDialogOpen(true);
    }
  };

  // Handle removing hours for a day
  const handleRemoveHours = (day: string, index: number) => {
    const updatedHours = { ...hours };
    const dayKey = day as keyof OperatingHours;

    if (updatedHours[dayKey] && Array.isArray(updatedHours[dayKey])) {
      // Remove the specific time slot
      const dayHours = [...(updatedHours[dayKey] as DayHours[])];
      dayHours.splice(index, 1);

      if (dayHours.length === 0) {
        // If no more time slots, remove the day entirely
        delete updatedHours[dayKey];
      } else {
        updatedHours[dayKey] = dayHours;
      }

      setHours(updatedHours);
      onOperatingHoursChange(updatedHours);
    }
  };

  // Handle saving hours
  const handleSaveHours = () => {
    if (!currentDay || !startTime || !endTime) return;

    const updatedHours = { ...hours };
    const dayKey = currentDay as keyof OperatingHours;
    const newTimeSlot = {
      open: startTime,
      close: endTime,
    };

    if (
      isEditing &&
      updatedHours[dayKey] &&
      Array.isArray(updatedHours[dayKey])
    ) {
      // Update existing time slot
      const dayHours = [...(updatedHours[dayKey] as DayHours[])];
      if (editIndex >= 0 && editIndex < dayHours.length) {
        dayHours[editIndex] = newTimeSlot;
        updatedHours[dayKey] = dayHours;
      }
    } else {
      // Add new time slot
      if (!updatedHours[dayKey]) {
        updatedHours[dayKey] = [newTimeSlot];
      } else if (Array.isArray(updatedHours[dayKey])) {
        updatedHours[dayKey] = [
          ...(updatedHours[dayKey] as DayHours[]),
          newTimeSlot,
        ];
      } else {
        // Handle migration from old format (single object) to array format
        updatedHours[dayKey] = [
          updatedHours[dayKey] as unknown as DayHours,
          newTimeSlot,
        ];
      }
    }

    // Sort time slots by start time
    if (updatedHours[dayKey] && Array.isArray(updatedHours[dayKey])) {
      updatedHours[dayKey] = (updatedHours[dayKey] as DayHours[]).sort(
        (a, b) => {
          return a.open.localeCompare(b.open);
        }
      );
    }

    setHours(updatedHours);
    onOperatingHoursChange(updatedHours);
    setIsDialogOpen(false);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  // Get day label from key
  const getDayLabel = (day: string) => {
    const dayObj = DAYS_OF_WEEK.find((d) => d.key === day);
    return dayObj ? t(`business.days.${day}`) || dayObj.label : day;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>{t("business.operatingHours") || "Operating Hours"}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddHours}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          {t("business.addHours") || "Add Hours"}
        </Button>
      </div>

      <div className="space-y-2">
        {Object.keys(hours).length > 0 ? (
          <Card>
            <CardContent className="p-4 space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayKey = day.key as keyof OperatingHours;
                const dayHours = hours[dayKey];

                if (!dayHours) return null;

                // Convert to array if it's not already (for backward compatibility)
                const hoursArray = Array.isArray(dayHours)
                  ? dayHours
                  : [dayHours];

                return (
                  <div key={day.key} className="mb-2">
                    <div className="flex items-center mb-1">
                      <Badge variant="default" className="mr-2">
                        {getDayLabel(day.key)}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          setCurrentDay(day.key);
                          setStartTime("09:00");
                          setEndTime("17:00");
                          setIsEditing(false);
                          setEditIndex(-1);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("business.addTimeSlot") || "Add Time Slot"}
                      </Button>
                    </div>

                    {hoursArray.map((slot, index) => (
                      <div
                        key={`${day.key}-${index}`}
                        className="flex items-center justify-between py-1 text-sm ml-6 border-l-2 pl-2 border-muted"
                      >
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>
                            {formatTime(slot.open)} - {formatTime(slot.close)}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEditHours(day.key, index)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveHours(day.key, index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {t("business.noOperatingHours") || "No operating hours set"}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t("business.editOperatingHours") || "Edit Operating Hours"
                : t("business.addOperatingHours") || "Add Operating Hours"}
            </DialogTitle>
            <DialogDescription>
              {t("business.operatingHoursDescription") ||
                "Set the hours when your business is open"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="day-select">{t("business.day") || "Day"}</Label>
              <Select
                value={currentDay}
                onValueChange={setCurrentDay}
                disabled={isEditing}
              >
                <SelectTrigger id="day-select">
                  <SelectValue
                    placeholder={t("business.selectDay") || "Select day"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.key} value={day.key}>
                      {getDayLabel(day.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">
                  {t("business.openTime") || "Open Time"}
                </Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger id="start-time">
                    <SelectValue
                      placeholder={t("business.selectTime") || "Select time"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">
                  {t("business.closeTime") || "Close Time"}
                </Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger id="end-time">
                    <SelectValue
                      placeholder={t("business.selectTime") || "Select time"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSaveHours}>
              {t("common.save") || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
