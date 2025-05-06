'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import React, { ReactNode } from 'react';
import { useSession } from '@/contexts/SessionContext';

// Inner component that uses useSearchParams safely within Suspense
function AuthGuardInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const sessionContext = useSession();
  
  // Add inactivity timer
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      setIsInactive(false);
      inactivityTimer = setTimeout(() => {
        setIsInactive(true);
      }, INACTIVITY_TIMEOUT);
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer setup
    resetTimer();

    // Cleanup
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);
  
  // Extract the loading state from your context
  const isSessionLoading = sessionContext.loading || false;
  
  // Check if we're in a reauthentication process
  const isReauthProcess = searchParams?.get('reauth') === 'true';
  
  // Check if we're in a login process
  const isAuthProcess = searchParams?.get('action') === 'login' || 
                        searchParams?.get('action') === 'signup' ||
                        searchParams?.get('authProcess') === 'true';

  // Define route permissions with upid values
  const ROUTE_PERMISSIONS: Record<string, number[]> = {
    '/adminpage': [4],             // admin only
    '/parentpage': [2],            // parent only
    '/publisherpage': [1],         // publisher only
    '/childpage': [3],             // child only
    '/educatorpage': [5],          // educator only
    
    // Add profile sub-routes to the permissions
    // Publisher
    '/publisher': [1],

    // Parent
    '/parent': [2],

    // Child
    '/child': [3],

    // Admin
    '/admin': [4],
    
    // Teacher
    '/educator': [5],
  };

  // List of paths that don't require authentication
  const PUBLIC_PATHS: string[] = [
    '/landing',
    '/auth/login',
    '/auth/signup',
    '/auth/resetpassword',
    '/auth/adminlogin',
    '/auth/callback',
    '/auth/confirm',
    '/auth/update-password',
    '/logout',
  ];

  // Define paths that should be exempt from role checking (for reauthentication flows)
  const REAUTH_EXEMPT_PATHS: string[] = [
    '/parent/createchild',
    '/parent/reauth', 
  ];

  // Default redirect for authenticated users based on role
  const DEFAULT_REDIRECTS: Record<number, string> = {
    1: '/publisherpage',  // publisher goes to publisher dashboard
    2: '/parentpage',     // parent goes to parent dashboard
    3: '/childpage',      // child goes to child dashboard 
    4: '/adminpage',      // admin goes to admin dashboard
    5: '/educatorpage',   // educator goes to educator dashboard
    0: '/dashboard',      // fallback for unknown roles
  };

  // Handle redirect with a useCallback to avoid infinite loops
  const redirectTo = useCallback((path: string) => {
    console.log(`Redirecting to: ${path}`);
    // Use replace instead of push to avoid adding to history
    router.replace(path);
  }, [router]);

  useEffect(() => {
    console.log('AuthGuard effect running. Path:', pathname);
    console.log('Session loading?', isSessionLoading);
    console.log('Is auth process?', isAuthProcess);
    console.log('Is reauth process?', isReauthProcess);
    
    // Don't run the effect if we've already checked auth
    if (authChecked) {
      return;
    }
    
    // Check if current path is in public paths
    const isPublicPath = PUBLIC_PATHS.some(path => 
      pathname === path || 
      (pathname?.startsWith(path + '/'))
    );
    
    // Check if current path is exempt from role checking for reauthentication flows
    const isReauthExemptPath = REAUTH_EXEMPT_PATHS.some(path =>
      pathname === path || pathname?.startsWith(path + '/')
    );
    
    // Skip auth check for:
    // 1. Public paths
    // 2. Auth processes
    // 3. Anything in the /auth directory
    // 4. Reauthentication exempt paths
    if (isPublicPath || 
        isAuthProcess || 
        pathname?.startsWith('/auth/') ||
        (isReauthExemptPath && isReauthProcess)) {
      console.log('Skipping auth check - public path, auth directory, auth process, or reauth exempt path');
      setIsLoading(false);
      setAuthChecked(true);
      return;
    }
    
    // Wait until session loading is complete
    if (isSessionLoading) {
      console.log('Session still loading, waiting...');
      return; // Don't do anything while session is loading
    }

    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        
        // First try to refresh the session
        const { data: { session }, error: refreshError } = await supabase.auth.getSession();
        
        if (refreshError) {
          console.error('Session refresh error:', refreshError);
          // If refresh fails, try to sign out to clear any invalid tokens
          await supabase.auth.signOut();
          redirectTo('/landing');
          return;
        }

        // If no session, redirect to landing
        if (!session) {
          console.log('No active session found, redirecting to landing page');
          redirectTo('/landing');
          return;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Handle auth error by redirecting to landing page
        if (authError) {
          console.error('Auth error:', authError);
          // If we get a JWT error, sign out and redirect
          if (authError.message.includes('JWT')) {
            await supabase.auth.signOut();
          }
          redirectTo('/landing');
          return;
        }
        
        // If no user, redirect to landing page
        if (!user) {
          console.log('No authenticated user found, redirecting to landing page');
          redirectTo('/landing');
          return;
        }

        console.log('User authenticated:', user.id);

        // Get user role from Supabase using your schema
        const { data: userData, error } = await supabase
          .from('user_account')
          .select('upid, username')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Only sign out if it's not a "not found" error (PGRST116)
          // This allows admin to stay logged in after deleting other users
          if (error.code !== 'PGRST116') {
            await supabase.auth.signOut();
            redirectTo('/landing');
            return;
          }
        }

        // Special case for root page: redirect to appropriate dashboard
        if (pathname === '/' || pathname === '') {
          const targetDashboard = DEFAULT_REDIRECTS[userData?.upid || 0] || '/dashboard';
          console.log('Root path detected, redirecting to dashboard:', targetDashboard);
          redirectTo(targetDashboard);
          return;
        }

        // If we're on a reauth exempt path and in reauth process, skip the role check
        if (isReauthExemptPath && isReauthProcess) {
          console.log('Reauth exempt path, skipping role check');
          setIsLoading(false);
          setAuthChecked(true);
          return;
        }

        // Improved path matching - check for the most specific path first, then less specific
        // Get all possible base paths for the current pathname
        const pathParts = pathname?.split('/').filter(part => part) || [];
        const possiblePaths: string[] = [];
        
        // Generate all possible parent paths from most specific to least
        let currentPath = '';
        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
          possiblePaths.push(currentPath);
        }
        
        // Reverse the array to check most specific paths first
        possiblePaths.reverse();
        
        // Find the most specific matching path that has permissions defined
        const matchingPath = possiblePaths.find(path => path in ROUTE_PERMISSIONS);
        
        if (matchingPath) {
          const allowedRoleIds = ROUTE_PERMISSIONS[matchingPath];
          console.log('Checking permissions for path:', matchingPath);
          console.log('Allowed roles:', allowedRoleIds);
          
          // Only check role permissions if we have valid user data
          if (userData?.upid && !allowedRoleIds.includes(userData.upid)) {
            console.log(`Access denied: User with role ${userData.upid} cannot access ${pathname}`);
            redirectTo('/unauthorized');
            return;
          }
        }

        // Additional check for admin page access
        if (pathname?.startsWith('/adminpage') && userData?.upid !== 4) {
          console.log('Non-admin user attempting to access admin page, redirecting to unauthorized');
          redirectTo('/unauthorized');
          return;
        }

        console.log('Authentication check successful, rendering page');
        setIsLoading(false);
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        redirectTo('/landing');
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pathname, 
    redirectTo, 
    isSessionLoading, 
    isAuthProcess, 
    isReauthProcess, 
    authChecked
  ]);

  // Skip loading screen for public paths and auth processes
  if (isSessionLoading || isLoading) {
    if (pathname?.startsWith('/auth/') || 
        PUBLIC_PATHS.some(path => pathname === path || pathname?.startsWith(path + '/')) ||
        (REAUTH_EXEMPT_PATHS.some(path => pathname === path || pathname?.startsWith(path + '/')) && isReauthProcess)) {
      return children as React.ReactElement;
    }
    
    // Only show loading screen if user is inactive
    if (!isInactive) {
      return children as React.ReactElement;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-black">Loading...</h1>
          <p className="text-black">Please wait while we verify your access...</p>
        </div>
      </div>
    );
  }

  // Show welcome screen for root path being redirected
  if ((pathname === '/' || pathname === '') && !isAuthProcess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-black">Welcome</h1>
          <p className="text-black">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // For other pages, render children
  return children as React.ReactElement;
}

// Outer component that wraps with Suspense
export default function AuthRouteGuard({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-black">Loading...</h1>
          <p className="text-black">Please wait while we verify your access...</p>
        </div>
      </div>
    }>
      <AuthGuardInner>
        {children}
      </AuthGuardInner>
    </Suspense>
  );
}