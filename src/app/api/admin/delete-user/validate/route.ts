import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    // Parse the request with error handling
    let user_id, account_id;
    try {
      const body = await request.json();
      user_id = body.user_id;
      account_id = body.account_id;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Validate that the auth user exists
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
      
      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || 'Auth user not found' },
          { status: 404 }
        );
      }
    } catch (authError:unknown) {
        const errorMessage = authError instanceof Error ? authError.message : 'Unknown auth error';
        return NextResponse.json(
          { error: `Auth validation error: ${errorMessage}` },
          { status: 500 }
      );
    }
    
    // Validate that the account exists
    if (account_id) {
      try {
        const { data, error } = await supabaseAdmin
          .from('user_account')
          .select('id')
          .eq('id', account_id)
          .single();
          
        if (error || !data) {
          return NextResponse.json(
            { error: error?.message || 'User account not found' },
            { status: 404 }
          );
        }
      } catch (dbError: unknown) {
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
        return NextResponse.json(
          { error: `Database validation error: ${errorMessage}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Validation error: ${errorMessage}` },
      { status: 500 }
    );
  }
}