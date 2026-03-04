import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import ApolloClientProvider from '@/components/ApolloProvider';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ApolloClientProvider>
        <div className="flex h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </ApolloClientProvider>
    </AuthGuard>
  );
}
