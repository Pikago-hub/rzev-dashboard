import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <main className="relative flex-1 flex flex-col h-full min-h-screen">
          {children}
        </main>
        <Toaster />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
