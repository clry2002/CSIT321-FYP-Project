// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabase';

// export default function RootPage() {
//   const router = useRouter();

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         const { data: { user } } = await supabase.auth.getUser();

//         if (!user) {
//           router.push('/landing'); // Redirect unauthenticated users to the landing page
//           return;
//         }

//         // Optional: If you want to check for a profile before sending to home/setup
//         const { data: profile } = await supabase
//           .from('user_profiles')
//           .select('*')
//           .eq('user_id', user.id)
//           .single();

//         if (profile) {
//           router.push('/childpage'); // Send users with profiles to childpage
//         } else {
//           router.push('/landing'); // all users default landing page
//         }
//       } catch (error) {
//         console.error('Error checking auth state:', error);
//         router.push('/landing');
//       }
//     };

//     checkAuth();
//   }, [router]);

//   return null; // No UI needed here, just redirects
// }


'use client';

import React from 'react';
import AuthRouteGuard from './components/AuthGuard';

// Add proper TypeScript types for the children prop
export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthRouteGuard>
          {children}
        </AuthRouteGuard>
      </body>
    </html>
  );
}