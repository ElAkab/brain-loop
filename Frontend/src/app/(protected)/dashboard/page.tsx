import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { PageTransition } from '@/components/ui/page-transition';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch categories with note counts
  const { data: categories } = await supabase
    .from('categories')
    .select('*, notes(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <PageTransition><DashboardContent categories={categories || []} /></PageTransition>;
}
