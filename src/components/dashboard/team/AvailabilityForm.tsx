"use client";

import { useState, useEffect } from "react";
import { useForm, Resolver } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBrowserClient } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

// Define the form schema
const availabilitySchema = z.object({
  day_of_week: z.string().min(1, { message: "Day is required" }),
  start_time: z.string().min(1, { message: "Start time is required" }),
  end_time: z.string().min(1, { message: "End time is required" }),
  is_available: z.boolean().default(true),
}).refine((data) => {
  // Check if end time is after start time
  return data.start_time < data.end_time;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
});

type AvailabilityFormValues = z.infer<typeof availabilitySchema>;

interface AvailabilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  teamMemberId: string;
  availability?: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  };
  translationFunc: (key: string) => string;
}

export function AvailabilityForm({
  open,
  onOpenChange,
  onSuccess,
  teamMemberId,
  availability,
  translationFunc: t,
}: AvailabilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Debug incoming props
  console.log('Availability props:', availability);

  // Generate array of available times in 30-minute increments
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const time = `${hour.toString().padStart(2, "0")}:${minute}`;
    return time;
  });

  // Debug time options format
  console.log('Time options format (first few):', timeOptions.slice(0, 5));
  
  // Check if incoming time format matches dropdown format
  if (availability?.start_time) {
    console.log('Does start_time exist in options?', 
      timeOptions.includes(availability.start_time),
      'Value:', availability.start_time
    );
  }

  // Format time value to ensure it's in HH:MM format
  const formatTimeValue = (timeValue: string | null | undefined): string => {
    if (!timeValue) return "";
    
    // If time has seconds (HH:MM:SS), remove them
    if (timeValue.length > 5 && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue.substring(0, 5);
    }
    
    return timeValue;
  };

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilitySchema) as Resolver<AvailabilityFormValues>,
    defaultValues: {
      day_of_week: availability ? availability.day_of_week.toString() : "",
      start_time: availability ? formatTimeValue(availability.start_time) : "",
      end_time: availability ? formatTimeValue(availability.end_time) : "",
      is_available: availability ? availability.is_available : true,
    },
  });

  // Debug form values
  console.log('Form default values:', {
    day_of_week: availability ? availability.day_of_week.toString() : "",
    start_time: availability ? availability.start_time : "",
    end_time: availability ? availability.end_time : "",
  });

  // Update form values when availability changes
  useEffect(() => {
    if (open && availability) {
      // Debug time format from database
      console.log('Original times from DB:', { 
        startTime: availability.start_time,
        endTime: availability.end_time,
        startTimeType: typeof availability.start_time,
        startTimeLength: availability.start_time?.length
      });
      
      const resetValues = {
        day_of_week: availability.day_of_week.toString(),
        start_time: formatTimeValue(availability.start_time),
        end_time: formatTimeValue(availability.end_time),
        is_available: availability.is_available,
      };
      console.log('Resetting form with values:', resetValues);
      form.reset(resetValues);
      
      // Debug form state after reset
      setTimeout(() => {
        console.log('Form values after reset:', form.getValues());
      }, 0);
    }
  }, [availability, form, open]);

  // Handle clean closing of the dialog
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: AvailabilityFormValues) => {
    try {
      setIsSubmitting(true);

      // Format time values for database storage
      const formattedStartTime = formatTimeValue(data.start_time);
      const formattedEndTime = formatTimeValue(data.end_time);

      if (availability?.id) {
        // Update existing availability
        const { error } = await supabase
          .from("team_member_availabilities")
          .update({
            day_of_week: parseInt(data.day_of_week),
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            is_available: data.is_available,
            updated_at: new Date().toISOString(),
          })
          .eq("id", availability.id);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("notifications.availabilityUpdateSuccess"),
        });
      } else {
        // Add new availability
        const { error } = await supabase.from("team_member_availabilities").insert({
          team_member_id: teamMemberId,
          day_of_week: parseInt(data.day_of_week),
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          is_available: data.is_available,
        });

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("notifications.availabilityAddSuccess"),
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving availability:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.error"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {availability?.id
              ? t("availability.editAvailability")
              : t("availability.addAvailability")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="day_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("availability.dayOfWeek")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">{t("availability.days.sunday")}</SelectItem>
                      <SelectItem value="1">{t("availability.days.monday")}</SelectItem>
                      <SelectItem value="2">{t("availability.days.tuesday")}</SelectItem>
                      <SelectItem value="3">{t("availability.days.wednesday")}</SelectItem>
                      <SelectItem value="4">{t("availability.days.thursday")}</SelectItem>
                      <SelectItem value="5">{t("availability.days.friday")}</SelectItem>
                      <SelectItem value="6">{t("availability.days.saturday")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => {
                console.log('start_time field value:', field.value);
                return (
                <FormItem>
                  <FormLabel>{t("availability.startTime")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`start-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => {
                console.log('end_time field value:', field.value);
                return (
                <FormItem>
                  <FormLabel>{t("availability.endTime")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`end-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}}
            />

            <FormField
              control={form.control}
              name="is_available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t("availability.available")}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("availability.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("common.loading")
                  : availability?.id
                  ? t("availability.update")
                  : t("availability.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 