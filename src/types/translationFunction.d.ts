/**
 * Type definition for the translation function returned by useTranslations from next-intl
 */

export interface TranslationFunction {
  (key: string): string;
  raw: (key: string) => Record<string, unknown> | string;
}
