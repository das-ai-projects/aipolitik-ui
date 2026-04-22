'use client';

import Link from 'next/link';
import { Linkedin, MessageCircle } from 'lucide-react';
import RandomCandidatesFollow from '@/components/RandomCandidatesFollow';
import { useTranslatedText } from '@/components/LanguagePreferenceContext';

export default function RightSideBar() {
  const contactBlurb = useTranslatedText('Like what you see? Contact Me!');
  return (
    <aside className="w-1/3 min-w-[320px] shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <div className="pt-8 px-5 pb-5">
        <RandomCandidatesFollow />
      </div>
      <div className="mt-auto p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center gap-5">
          <h2 className="text-slate-700 font-semibold text-base leading-snug text-center">
            {contactBlurb}
          </h2>
          <div className="flex items-center justify-center gap-5">
            <Link
              href={'https://www.linkedin.com/in/ayandas1/'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-slate-500 hover:text-[#0A66C2] transition-colors"
            >
              <Linkedin className="h-7 w-7" />
            </Link>
            <Link
              href={'https://www.threads.com/@ayan_das_4719'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Threads"
              className="text-slate-500 hover:text-black transition-colors"
            >
              <MessageCircle className="h-7 w-7" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
