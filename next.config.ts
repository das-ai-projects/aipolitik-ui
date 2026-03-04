import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AWS_COGNITO_REGION: process.env.AWS_COGNITO_REGION,
    AWS_COGNITO_POOL_ID: process.env.AWS_COGNITO_POOL_ID,
    AWS_COGNITO_APP_CLIENT_ID: process.env.AWS_COGNITO_APP_CLIENT_ID,
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ddk4x72zkug5e.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
