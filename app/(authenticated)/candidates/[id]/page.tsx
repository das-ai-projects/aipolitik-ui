import { redirect } from 'next/navigation';

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/leaders/${id}`);
}
