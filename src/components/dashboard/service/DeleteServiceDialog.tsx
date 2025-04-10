"use client";

import { useTranslations } from "next-intl";
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
import { Service } from "./ServiceList";

type DeleteServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service;
  onDeleteService: () => void;
};

export function DeleteServiceDialog({
  open,
  onOpenChange,
  service,
  onDeleteService,
}: DeleteServiceDialogProps) {
  const t = useTranslations("dashboard.services");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteServiceTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteServiceDescription", { name: service.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDeleteService}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 