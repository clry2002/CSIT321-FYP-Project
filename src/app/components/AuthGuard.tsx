'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import React, { ReactNode } from 'react';
import { useSession } from '@/contexts/SessionContext';

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
];

// Define paths that should be exempt from role checking (for reauthentication flows)
const REAUTH_EXEMPT_PATHS: string[] = [
  '/parent/createchild',
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

export default function AuthRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const sessionContext = useSession();
  
  // Extract the loading state from your context
  const isSessionLoading = sessionContext.loading || false;
  
  // Check if we're in a reauthentication process
  const isReauthProcess = searchParams?.get('reauth') === 'true';
  
  // Check if we're in a login process
  const isAuthProcess = searchParams?.get('action') === 'login' || 
                        searchParams?.get('action') === 'signup' ||
                        searchParams?.get('authProcess') === 'true';

  useEffect(() => {
    console.log('AuthGuard effect running. Path:', pathname);
    console.log('Session loading?', isSessionLoading);
    console.log('Is auth process?', isAuthProcess);
    console.log('Is reauth process?', isReauthProcess);
    
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
        
        if (authError) {
          console.error('Auth error:', authError);
          router.push('/auth/login'); // Go to your login path
          return;
        }
        
        if (!user) {
          console.log('No authenticated user found, redirecting to login');
          router.push('/auth/login'); // Go to your login path
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
          router.push('/error');
          return;
        }

        // Get the numeric role ID with proper typing
        const userRoleId: number = userData?.upid || 0;
        console.log('User role ID:', userRoleId);
        
        // Special case for root page: redirect to appropriate dashboard
        if (pathname === '/' || pathname === '') {
          const targetDashboard = DEFAULT_REDIRECTS[userRoleId] || '/dashboard';
          console.log('Root path detected, redirecting to dashboard:', targetDashboard);
          router.push(targetDashboard);
          return;
        }

        // If we're on a reauth exempt path and in reauth process, skip the role check
        if (isReauthExemptPath && isReauthProcess) {
          console.log('Reauth exempt path, skipping role check');
          setIsLoading(false);
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
          
          if (!allowedRoleIds.includes(userRoleId)) {
            console.log(`Access denied: User with role ${userRoleId} cannot access ${pathname}`);
            router.push('/unauthorized');
            return;
          }
        }

        console.log('Authentication check successful, rendering page');
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/error');
      }
    };

    checkAuth();
  }, [pathname, router, isSessionLoading, isAuthProcess, isReauthProcess, searchParams]);

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
          <h1 className="text-2xl font-bold">Loading</h1>
          <p>Please wait while we verify your access...</p>
        </div>
      </div>
    );
  }

  // Show welcome screen for root path being redirected
  if ((pathname === '/' || pathname === '') && !isAuthProcess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // For other pages, render children
  return children as React.ReactElement;
}
















