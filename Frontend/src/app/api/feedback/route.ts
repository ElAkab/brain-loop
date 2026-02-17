import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const rating = url.searchParams.get('rating');

  let query = supabase
    .from('feedback')
    .select('id, rating, comment, created_at')
    .order('created_at', { ascending: false });

  if (rating) {
    query = query.eq('rating', rating);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // Get user session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rating, comment } = body;

    if (!rating) {
        return NextResponse.json({ error: 'Rating is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
