import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Standard GraphQL-over-HTTP client. Works with any backend that:
 * - Accepts POST to the given URL with JSON body { query, variables?, operationName? }
 * - Returns JSON GraphQL response
 * - Accepts optional "Authorization: Bearer <token>" for auth
 *
 * Only NEXT_PUBLIC_GRAPHQL_URL needs to change if the backend endpoint changes
 * (e.g. API Gateway → Lambda Function URL or ALB).
 */
function makeApolloClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  });

  // Fetch the Cognito ID token before every request and attach it as a
  // Bearer token. fetchAuthSession() silently refreshes the token when it
  // is close to expiry, so this always sends a valid credential.
  const authLink = setContext(async (_, { headers }) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      return {
        headers: {
          ...headers,
          ...(token && { authorization: `Bearer ${token}` }),
        },
      };
    } catch {
      return { headers };
    }
  });

  return new ApolloClient({
    link: from([authLink, httpLink]),
    cache: new InMemoryCache(),
  });
}

export default makeApolloClient;
