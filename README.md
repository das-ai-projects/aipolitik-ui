# AI Politik UI

Next.js (App Router) frontend for AI Politik: explore AI-generated candidate content, chats, debates, follows, and language preferences. Authentication uses **AWS Cognito** via **AWS Amplify v6**.

## Prerequisites

- Node.js 18.x or newer (align with `package.json` / your deployment platform).
- A deployed **aipolitik-mongo** GraphQL API (ALB URL) and a **Cognito** user pool + app client (see [aipolitik-infra](../aipolitik-infra/) and [aipolitik-mongo](../aipolitik-mongo/)).

## Environment variables

Create `.env.local` in this directory (never commit it). All client-side values must use the `NEXT_PUBLIC_` prefix.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_AWS_COGNITO_POOL_ID` | Yes | Cognito User Pool ID (e.g. `us-east-1_xxxxxxxxx`). |
| `NEXT_PUBLIC_AWS_COGNITO_APP_CLIENT_ID` | Yes | Cognito **public** app client ID (no client secret), same pool as above. |
| `NEXT_PUBLIC_GRAPHQL_URL` | Yes | GraphQL HTTP endpoint: the **ALB base URL** from the mongo stack output `GraphQLUrl`, e.g. `http://your-alb.us-east-1.elb.amazonaws.com/`. Apollo sends `POST` requests to this URL. |
| `NEXT_PUBLIC_AWS_COGNITO_REGION` | No | AWS region (defaults can be derived from the pool ID). |

**Important:** `NEXT_PUBLIC_GRAPHQL_URL` must match the deployed API (see [aipolitik-mongo/docs/GRAPHQL_API_CONTRACT.md](../aipolitik-mongo/docs/GRAPHQL_API_CONTRACT.md)). The API uses **HTTP** (not HTTPS) on the ALB until you terminate TLS in front of it.

After changing `.env.local`, restart the dev server (`npm run dev`).

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login` for protected areas (`AuthGuard`).

## How the app talks to the API

- [lib/apollo-client.ts](lib/apollo-client.ts) uses `HttpLink` pointed at `NEXT_PUBLIC_GRAPHQL_URL` and attaches `Authorization: Bearer <Cognito ID token>` from `fetchAuthSession()` on each request.
- The GraphQL API verifies the **ID token** (not the access token) in Lambda. Keep the Amplify session valid so tokens refresh automatically.

## Project structure (high level)

```
app/                    # App Router pages (login, authenticated home, chats, debates, etc.)
components/             # UI and feature components (sidebars, lists, Apollo providers, etc.)
lib/                    # Apollo client, GraphQL helpers, types
utils/                  # Amplify config, withAuth HOC
```

## Build and deploy

```bash
npm run build
```

Deploy to Vercel, AWS Amplify Hosting, or any Node host: set the same `NEXT_PUBLIC_*` variables in the host’s environment. Ensure Cognito **callback / sign-out URLs** include your deployed origin (configured in Cognito or via [aipolitik-infra](../aipolitik-infra/) `cognito_callback_urls`).

## Related repositories

- [aipolitik-mongo](../aipolitik-mongo/) – GraphQL API and SAM/ALB stack.
- [aipolitikCandidateChat](../aipolitikCandidateChat/) – Bedrock agents for chat and debate.
- [aipolitik-infra](../aipolitik-infra/) – Cognito and shared infrastructure.

## License

See repository root or your organization’s policy.
