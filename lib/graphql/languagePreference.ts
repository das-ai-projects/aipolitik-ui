import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      userId
      preferred_language
    }
  }
`;

export const UPDATE_MY_PREFERRED_LANGUAGE = gql`
  mutation UpdateMyPreferredLanguage($language: PreferredLanguage!) {
    updateMyPreferredLanguage(language: $language) {
      userId
      preferred_language
    }
  }
`;

export const TRANSLATE_TEXTS = gql`
  mutation TranslateTexts($texts: [String!]!) {
    translateTexts(texts: $texts)
  }
`;

/** User-typed search → English for Atlas Search (skip when preferred language is EN). */
export const TRANSLATE_SEARCH_QUERIES = gql`
  mutation TranslateSearchQueries($texts: [String!]!) {
    translateSearchQueries(texts: $texts)
  }
`;

export type PreferredLanguage = 'EN' | 'ES' | 'FR' | 'PT' | 'DE';
