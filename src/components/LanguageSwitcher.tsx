"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import Flag from "react-world-flags";

const languages = [
  {
    code: "en",
    name: "English",
    countryCode: "US",
  },
  {
    code: "cn",
    name: "中文",
    countryCode: "CN",
  },
  {
    code: "es",
    name: "Español",
    countryCode: "ES",
  },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    router.replace(pathname, { locale: langCode });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="flex items-center">
            <Flag
              code={currentLanguage.countryCode}
              className="h-3.5 w-5 rounded-sm object-cover"
            />
          </span>
          <span className="sr-only md:not-sr-only">{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2"
          >
            <Flag
              code={language.countryCode}
              className="h-3.5 w-5 rounded-sm object-cover"
            />
            <span>{language.name}</span>
            {locale === language.code && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
