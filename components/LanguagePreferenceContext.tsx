'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  ME_QUERY,
  TRANSLATE_TEXTS,
  UPDATE_MY_PREFERRED_LANGUAGE,
  type PreferredLanguage,
} from '@/lib/graphql/languagePreference';

const BATCH_MS = 90;

type Waiter = { resolve: (value: string) => void };

type LanguagePreferenceContextValue = {
  preferredLanguage: PreferredLanguage;
  meLoading: boolean;
  requestTranslation: (text: string) => Promise<string>;
  translateMany: (texts: string[]) => Promise<string[]>;
};

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

export function LanguagePreferenceProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const { data, loading: meLoading } = useQuery<{
    me: { userId: string; preferred_language: PreferredLanguage };
  }>(ME_QUERY, { fetchPolicy: 'cache-and-network' });
  const preferredLanguage: PreferredLanguage = data?.me?.preferred_language ?? 'EN';

  const cacheRef = useRef<Map<string, string>>(new Map());
  const batchRef = useRef<Set<string>>(new Set());
  const waitersRef = useRef<Map<string, Waiter[]>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = useCallback((lang: PreferredLanguage, text: string) => `${lang}\0${text}`, []);

  const resolveWaitersForText = useCallback((text: string, value: string) => {
    const list = waitersRef.current.get(text);
    if (!list) return;
    waitersRef.current.delete(text);
    list.forEach((w) => w.resolve(value));
  }, []);

  const flushBatch = useCallback(async () => {
    const lang = preferredLanguage;
    const pending = [...batchRef.current];
    batchRef.current.clear();
    if (pending.length === 0) return;

    const toRequest: string[] = [];
    for (const text of pending) {
      const ck = cacheKey(lang, text);
      if (lang === 'EN' || cacheRef.current.has(ck)) {
        const val = lang === 'EN' ? text : (cacheRef.current.get(ck) as string);
        resolveWaitersForText(text, val);
      } else {
        toRequest.push(text);
      }
    }

    if (toRequest.length === 0) return;

    const unique = [...new Set(toRequest)];
    try {
      const { data: mutData } = await client.mutate<{ translateTexts: string[] }>({
        mutation: TRANSLATE_TEXTS,
        variables: { texts: unique },
      });
      const translated = mutData?.translateTexts ?? unique;
      unique.forEach((t, i) => {
        const out = translated[i] ?? t;
        cacheRef.current.set(cacheKey(lang, t), out);
      });
      for (const text of toRequest) {
        const ck = cacheKey(lang, text);
        resolveWaitersForText(text, cacheRef.current.get(ck) ?? text);
      }
    } catch (e) {
      console.error('[LanguagePreference] translateTexts failed', e);
      for (const text of toRequest) {
        resolveWaitersForText(text, text);
      }
    }
  }, [cacheKey, client, preferredLanguage, resolveWaitersForText]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushBatch();
    }, BATCH_MS);
  }, [flushBatch]);

  const requestTranslation = useCallback(
    (text: string): Promise<string> => {
      if (text.length === 0) {
        return Promise.resolve('');
      }
      if (preferredLanguage === 'EN') {
        return Promise.resolve(text);
      }
      const ck = cacheKey(preferredLanguage, text);
      const hit = cacheRef.current.get(ck);
      if (hit !== undefined) {
        return Promise.resolve(hit);
      }
      return new Promise((resolve) => {
        let arr = waitersRef.current.get(text);
        if (!arr) {
          arr = [];
          waitersRef.current.set(text, arr);
        }
        arr.push({ resolve });
        batchRef.current.add(text);
        scheduleFlush();
      });
    },
    [cacheKey, preferredLanguage, scheduleFlush]
  );

  const translateMany = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (preferredLanguage === 'EN' || texts.length === 0) {
        return texts;
      }
      const lang = preferredLanguage;
      const out: string[] = new Array(texts.length);
      const misses: { index: number; text: string }[] = [];
      texts.forEach((t, i) => {
        const ck = cacheKey(lang, t);
        const c = cacheRef.current.get(ck);
        if (c !== undefined) {
          out[i] = c;
        } else {
          misses.push({ index: i, text: t });
        }
      });
      if (misses.length === 0) {
        return out;
      }
      const uniqueTexts = [...new Set(misses.map((m) => m.text))];
      try {
        const { data: mutData } = await client.mutate<{ translateTexts: string[] }>({
          mutation: TRANSLATE_TEXTS,
          variables: { texts: uniqueTexts },
        });
        const translated = mutData?.translateTexts ?? uniqueTexts;
        const map = new Map(uniqueTexts.map((t, i) => [t, translated[i] ?? t]));
        for (const m of misses) {
          const val = map.get(m.text) ?? m.text;
          cacheRef.current.set(cacheKey(lang, m.text), val);
          out[m.index] = val;
        }
      } catch (e) {
        console.error('[LanguagePreference] translateMany failed', e);
        for (const m of misses) {
          out[m.index] = m.text;
        }
      }
      return out;
    },
    [cacheKey, client, preferredLanguage]
  );

  useEffect(() => {
    cacheRef.current = new Map();
    batchRef.current = new Set();
    waitersRef.current = new Map();
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, [preferredLanguage]);

  const value = useMemo(
    () => ({
      preferredLanguage,
      meLoading,
      requestTranslation,
      translateMany,
    }),
    [meLoading, preferredLanguage, requestTranslation, translateMany]
  );

  return (
    <LanguagePreferenceContext.Provider value={value}>{children}</LanguagePreferenceContext.Provider>
  );
}

export function useLanguagePreference(): LanguagePreferenceContextValue {
  const ctx = useContext(LanguagePreferenceContext);
  if (!ctx) {
    throw new Error('useLanguagePreference must be used within LanguagePreferenceProvider');
  }
  return ctx;
}

/** English source string → display string in the user’s preferred language (async via batch translate). */
export function useTranslatedText(source: string): string {
  const { preferredLanguage, requestTranslation } = useLanguagePreference();
  const [display, setDisplay] = useState(source);

  useEffect(() => {
    if (preferredLanguage === 'EN') {
      setDisplay(source);
      return;
    }
    let cancelled = false;
    requestTranslation(source).then((t) => {
      if (!cancelled) setDisplay(t);
    });
    return () => {
      cancelled = true;
    };
  }, [preferredLanguage, requestTranslation, source]);

  return display;
}

export function Translated({ text, className }: { text: string; className?: string }) {
  const display = useTranslatedText(text);
  return <span className={className}>{display}</span>;
}

export function useUpdatePreferredLanguage() {
  return useMutation(UPDATE_MY_PREFERRED_LANGUAGE, {
    refetchQueries: [{ query: ME_QUERY }],
  });
}
