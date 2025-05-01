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

// This is the content for app/page.tsx
export default function HomePage() {
  // This component will be wrapped by your layout component
  // No authentication logic needed here - AuthRouteGuard handles that
  
  // Return null or a minimal loading component
  // The AuthRouteGuard will handle redirection
  return null;
}