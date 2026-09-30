import { redirect } from 'next/navigation';

// Shared post links used to open a separate public page. Posts are only visible
// to signed-in members of the institution, so links now open the post in the portal
// (the middleware sends signed-out visitors to sign in first).
export default async function SharedPostRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/feed/${encodeURIComponent(id)}`);
}
