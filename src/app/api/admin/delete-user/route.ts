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
    // user_id - auth user id (admin); account_id - child account id (parent)
    const { user_id, account_id } = await request.json();
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the user using admin client
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    if (error) {
      console.error('Error deleting auth user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Trigger delete child account process from parent account
    if (account_id) {
      const { error: accountError } = await supabaseAdmin
        .from('user_account')
        .delete()
        .eq('id', account_id);
        
      if (accountError) {
        console.error('Error deleting user_account:', accountError);
        return NextResponse.json(
          { error: accountError.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in delete-user route:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}