import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient(req);
    const searchParams = req.nextUrl.searchParams;
    const rating = searchParams.get('rating');

    let query = supabase
      .from('feedback')
      .select('id, rating, comment, created_at')
      .order('created_at', { ascending: false });

    if (rating) {
      query = query.eq('rating', rating);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database fetch error:', error);
      // Check if table doesn't exist (Supabase/Postgres specific error code or message)
      if (error.code === '42P01') { // undefined_table
        return NextResponse.json([]); // Return empty array if table missing to avoid 500 in UI
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Feedback GET API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient(req);
  
  // Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error in feedback:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rating, comment } = body;

    if (!rating) {
        return NextResponse.json({ error: 'Rating is required' }, { status: 400 });
    }

    // Ensure user_id is passed correctly. The table expects UUID.
    // user.id is string (UUID format) from Supabase Auth.
    
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
      console.error('Database insertion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Feedback API Error:', err);
    return NextResponse.json({ error: 'Invalid request: ' + err.message }, { status: 400 });
  }
}
