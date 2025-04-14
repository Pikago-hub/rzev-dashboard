"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash } from "lucide-react";
import { ServiceVariant } from "@/types/service";

// Type for translation function
type TranslationFunction = (key: string) => string;

interface ServiceVariantListProps {
  variants: ServiceVariant[];
  onEdit?: (variant: ServiceVariant) => void;
  onDelete?: (id: string) => void;
  translationFunc: TranslationFunction;
}

export function ServiceVariantList({
  variants,
  onEdit,
  onDelete,
  translationFunc: t,
}: ServiceVariantListProps) {
  // Format price with currency symbol
  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Format duration in minutes
  const formatDuration = (duration: number | null) => {
    if (duration === null) return "-";
    return `${duration} ${t("minutes")}`;
  };

  return (
    <div className="border rounded-md">
      {variants.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("variantName")}</TableHead>
              <TableHead>{t("duration")}</TableHead>
              <TableHead>{t("price")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              {(onEdit || onDelete) && (
                <TableHead className="w-[100px]">
                  {t("common.actions")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell className="font-medium">{variant.name}</TableCell>
                <TableCell>{formatDuration(variant.duration)}</TableCell>
                <TableCell>{formatPrice(variant.price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={variant.active ? "default" : "outline"}
                    className="whitespace-nowrap"
                  >
                    {variant.active ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(variant)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t("common.edit")}</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(variant.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">{t("common.delete")}</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="py-6 text-center text-muted-foreground">
          {t("noVariants")}
        </div>
      )}
    </div>
  );
}
