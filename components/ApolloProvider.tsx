'use client';

import { ApolloProvider } from '@apollo/client/react';
import { useMemo } from 'react';
import makeApolloClient from '@/lib/apollo-client';

export default function ApolloClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Instantiate once per browser session. makeApolloClient is called inside
  // useMemo so the client is stable across re-renders but still created on
  // the client side (where Amplify auth is available).
  const client = useMemo(() => makeApolloClient(), []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
