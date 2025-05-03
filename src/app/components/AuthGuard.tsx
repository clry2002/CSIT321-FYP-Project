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
  const sessionContext = useSession();
  
  // Extract the loading state from your context
  const isSessionLoading = sessionContext.loading || false;
  
  // Check if we're in a reauthentication process
  const isReauthProcess = searchParams?.get('reauth') === 'true';
  
  // Check if we're in a login process
  const isAuthProcess = searchParams?.get('action') === 'login' || 
                        searchParams?.get('action') === 'signup' ||
                        searchParams?.get('authProcess') === 'true';

  // Reset authChecked when pathname changes
  useEffect(() => {
    setAuthChecked(false);
  }, [pathname]);

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
    '/teacher': [5],
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
    '/adminpage',  // Add back to PUBLIC_PATHS but still protected by ROUTE_PERMISSIONS
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
    
    // Skip auth check for public paths
    if (isPublicPath) {
      console.log('Public path detected, skipping auth check');
      setIsLoading(false);
      setAuthChecked(true);
      return;
    }
    
    // Check if current path is exempt from role checking for reauthentication flows
    const isReauthExemptPath = REAUTH_EXEMPT_PATHS.some(path =>
      pathname === path || pathname?.startsWith(path + '/')
    );
    
    // Skip auth check for:
    // 1. Auth processes
    // 2. Anything in the /auth directory
    // 3. Reauthentication exempt paths
    if (isAuthProcess || 
        pathname?.startsWith('/auth/') ||
        (isReauthExemptPath && isReauthProcess)) {
      console.log('Skipping auth check - auth directory, auth process, or reauth exempt path');
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Handle auth error by redirecting to landing page
        if (authError) {
          console.error('Auth error:', authError);
          // Only redirect to landing if not on admin page
          if (!pathname?.startsWith('/adminpage')) {
            redirectTo('/landing');
          }
          return;
        }
        
        // If no user, redirect to landing page
        if (!user) {
          console.log('No authenticated user found, redirecting to landing page');
          // Only redirect to landing if not on admin page
          if (!pathname?.startsWith('/adminpage')) {
            redirectTo('/landing');
          }
          return;
        }

        console.log('User authenticated:', user.id);

        // Get user role from Supabase using your schema
        const { data: userData, error } = await supabase
          .from('user_account')
          .select('upid')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Only redirect to error if not on admin page
          if (!pathname?.startsWith('/adminpage')) {
            redirectTo('/error');
          }
          return;
        }

        // Get the numeric role ID with proper typing
        const userRoleId: number = userData?.upid || 0;
        console.log('User role ID:', userRoleId);
        
        // Special case for root page: redirect to appropriate dashboard
        if (pathname === '/' || pathname === '') {
          const targetDashboard = DEFAULT_REDIRECTS[userRoleId] || '/dashboard';
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

        // Check role permissions for all paths
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
          
          if (!allowedRoleIds.includes(userRoleId)) {
            console.log(`Access denied: User with role ${userRoleId} cannot access ${pathname}`);
            redirectTo('/unauthorized');
            return;
          }
        }

        // Only after role check passes, allow access to public paths
        if (isPublicPath) {
          console.log('Public path access granted after role check');
          setIsLoading(false);
          setAuthChecked(true);
          return;
        }

        console.log('Authentication check successful, rendering page');
        setIsLoading(false);
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        redirectTo('/error');
      }
    };

    // Only run checkAuth if we haven't already checked auth
    if (!authChecked) {
      checkAuth();
    }
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