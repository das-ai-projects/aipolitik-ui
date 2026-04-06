'use client';

import {
  useLanguagePreference,
  useTranslatedText,
  useUpdatePreferredLanguage,
} from '@/components/LanguagePreferenceContext';
import type { PreferredLanguage } from '@/lib/graphql/languagePreference';

const OPTIONS: { value: PreferredLanguage; label: string }[] = [
  { value: 'EN', label: 'English' },
  { value: 'ES', label: 'Español' },
  { value: 'FR', label: 'Français' },
  { value: 'PT', label: 'Português' },
  { value: 'DE', label: 'Deutsch' },
];

export default function SettingsPage() {
  const title = useTranslatedText('Settings');
  const subtitle = useTranslatedText(
    'Choose the language used across the app. Content is translated from English.'
  );
  const labelLang = useTranslatedText('Preferred language');
  const saving = useTranslatedText('Saving…');
  const { preferredLanguage, meLoading } = useLanguagePreference();
  const [updateLanguage, { loading: updating }] = useUpdatePreferredLanguage();

  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-xl text-slate-600">{subtitle}</p>

      <div className="mt-10 max-w-md">
        <label htmlFor="preferred-language" className="block text-sm font-medium text-slate-700">
          {labelLang}
        </label>
        <select
          id="preferred-language"
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
          disabled={meLoading || updating}
          value={preferredLanguage}
          onChange={(e) => {
            const language = e.target.value as PreferredLanguage;
            void updateLanguage({ variables: { language } });
          }}
        >
          {OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {updating && <p className="mt-2 text-sm text-slate-500">{saving}</p>}
      </div>
    </div>
  );
}
