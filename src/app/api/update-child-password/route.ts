// app/api/update-child-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('Password update API called');
  
  try {
    // Get request body
    const body = await request.json();
    const { childUserId, newPassword, authenticated } = body;
    
    if (!childUserId || !newPassword) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Child user ID and new password are required' },
        { status: 400 }
      );
    }
    
    // Get cookies for the request
    const cookieStore = cookies();
    
    // Create a Supabase client using the route handler client
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    // If not coming from reauth flow, verify parent session
    if (!authenticated) {
      // Verify authentication
      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.log('Auth error:', authError);
        return NextResponse.json(
          { error: 'Authentication error: ' + authError.message },
          { status: 401 }
        );
      }
      
      if (!sessionData.session) {
        console.log('No session found');
        return NextResponse.json(
          { error: 'No active session found. Please log in again.' },
          { status: 401 }
        );
      }
      
      // Get the parent user account to verify permissions
      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', sessionData.session.user.id)
        .eq('upid', 2)
        .single();
        
      if (parentError || !parentData) {
        console.log('Parent account not found:', parentError);
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 403 }
        );
      }
      
      // Get the child's account details
      const { data: childAccount, error: childAccountError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', childUserId)
        .eq('upid', 3)
        .single();
        
      if (childAccountError || !childAccount) {
        console.log('Child account not found:', childAccountError);
        return NextResponse.json(
          { error: 'Child account not found' },
          { status: 404 }
        );
      }
      
      // Verify parent-child relationship
      const { data: relationship, error: relationshipError } = await supabase
        .from('isparentof')
        .select('*')
        .eq('parent_id', parentData.id)
        .eq('child_id', childAccount.id)
        .single();
        
      if (relationshipError || !relationship) {
        console.log('No parent-child relationship found:', relationshipError);
        return NextResponse.json(
          { error: 'You do not have permission to update this child account' },
          { status: 403 }
        );
      }
    }
    // For reauth flow, we skip the permission checks as they were already done
    // in the child account update page before storing the data in localStorage
    
    // Create admin client for password update
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Use Supabase admin API to update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      childUserId,
      { password: newPassword }
    );
    
    if (updateError) {
      console.log('Password update error:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('Password update successful');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in password update API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}