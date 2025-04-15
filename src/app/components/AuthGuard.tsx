// 'use client';

// import { ReactNode, useEffect, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import { useSession } from '@/contexts/SessionContext';

// // Define profile types directly in the AuthGuard file
// export const PROFILE_TYPES = {
//   PUBLISHER: 1,
//   PARENT: 2,
//   CHILD: 3,
//   ADMINISTRATOR: 4,
//   EDUCATOR: 5
// } as const;

// // Type safety for profile types
// export type ProfileType = typeof PROFILE_TYPES[keyof typeof PROFILE_TYPES];

// // Map of profile types to their permitted page paths
// const PROFILE_PERMITTED_PATHS: Record<number, RegExp[]> = {
//   [PROFILE_TYPES.PUBLISHER]: [
//     /^\/publisher/,
//     // /^\/dashboard$/,
//     // /^\/settings$/,
//     // /^\/profile$/
//   ],
//   [PROFILE_TYPES.PARENT]: [
//     /^\/parent/,
//     // /^\/dashboard$/,
//     // /^\/settings$/,
//     // /^\/profile$/
//   ],
//   [PROFILE_TYPES.CHILD]: [
//     /^\/child/,
//     // /^\/dashboard$/,
//     // /^\/games/,
//     // /^\/profile$/
//   ],
//   [PROFILE_TYPES.ADMINISTRATOR]: [
//     /^\/admin/,
//     // /^\/dashboard$/,
//     // /^\/settings$/,
//     // /^\/profile$/
//   ],
//   [PROFILE_TYPES.EDUCATOR]: [
//     /^\/educator/,
//     // /^\/dashboard$/,
//     // /^\/settings$/,
//     // /^\/profile$/
//   ]
// };

// // Paths accessible to all authenticated users
// const PUBLIC_AUTHENTICATED_PATHS = [
//   /^\/$/,
//   /^\/logout$/,
//   /^\/help$/,
//   /^\/support$/,
//   /^\/access-denied$/
// ];

// // Helper function to get profile type name for better logging
// function getProfileTypeName(profileType: number): string {
//   switch (profileType) {
//     case PROFILE_TYPES.PUBLISHER: return 'Publisher';
//     case PROFILE_TYPES.PARENT: return 'Parent';
//     case PROFILE_TYPES.CHILD: return 'Child';
//     case PROFILE_TYPES.ADMINISTRATOR: return 'Administrator';
//     case PROFILE_TYPES.EDUCATOR: return 'Educator';
//     default: return `Unknown (${profileType})`;
//   }
// }

// // Function to check if a user is allowed to access a path
// function canAccessPath(pathname: string, profileType: number): boolean {
//   // Check if it's a publicly accessible path for all authenticated users
//   if (PUBLIC_AUTHENTICATED_PATHS.some(pattern => pattern.test(pathname))) {
//     return true;
//   }
  
//   // Check if the path is permitted for this profile type
//   const permittedPaths = PROFILE_PERMITTED_PATHS[profileType] || [];
//   return permittedPaths.some(pattern => pattern.test(pathname));
// }

// interface AuthGuardProps {
//   children: ReactNode;
//   requiredProfileType?: ProfileType;
// }

// export default function AuthGuard({ children, requiredProfileType }: AuthGuardProps) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const { userAccount, userProfile, loading } = useSession();
//   const [isChecking, setIsChecking] = useState(true);
  
//   useEffect(() => {
//     // Only run auth checks once loading is complete
//     if (!loading) {
//       console.log("Auth check running with:", { 
//         userAccount: userAccount ? { id: userAccount.id, upid: userAccount.upid } : null, 
//         userProfile: userProfile ? { upid: userProfile.upid, suspended: userProfile.suspended } : null, 
//         requiredProfileType: requiredProfileType ? getProfileTypeName(requiredProfileType) : 'None',
//         pathname
//       });
      
//       // Check 1: User must be logged in
//       if (!userAccount) {
//         console.log("No user account, redirecting to login");
//         router.replace('/auth/login');
//         return;
//       }
      
//       // Check 2: Profile type validation for the page
//       if (requiredProfileType !== undefined) {
//         if (!userProfile) {
//           console.log("No user profile found, redirecting to home");
//           router.replace('/');
//           return;
//         }
        
//         if (userProfile.upid !== requiredProfileType) {
//           console.log(`Profile type mismatch: expected ${getProfileTypeName(requiredProfileType)}, got ${getProfileTypeName(userProfile.upid)}`);
//           router.replace('/access-denied');
//           return;
//         }
        
//         // Uncomment if you want to check for suspended users
//         // if (userProfile.suspended) {
//         //   console.log("User profile is suspended, redirecting to suspended page");
//         //   router.replace('/suspended');
//         //   return;
//         // }
//       }
      
//       // Check 3: Path-based access control - ensure the user can access this path
//       if (userProfile && !canAccessPath(pathname, userProfile.upid)) {
//         console.log(`User with profile type ${getProfileTypeName(userProfile.upid)} cannot access ${pathname}`);
//         router.replace('/access-denied');
//         return;
//       }
      
//       // All checks passed
//       console.log("Auth check passed, rendering children");
//       setIsChecking(false);
//     }
//   }, [userAccount, userProfile, loading, router, requiredProfileType, pathname]);
  
//   // Show loading while session data is loading OR while we're performing checks
//   if (loading || isChecking) {
//     return <div className="flex justify-center items-center h-screen">Loading...</div>;
//   }
  
//   // Authentication successful, render children
//   return <>{children}</>;
// }