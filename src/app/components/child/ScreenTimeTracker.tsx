// // components/child/ScreenTimeTracker.tsx
// 'use client';

// import { useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { screenTimeService } from '@/services/screenTimeService';

// const ScreenTimeTracker = () => {
//   useEffect(() => {
//     console.log("ScreenTimeTracker mounted");
    
//     // Test database connection
//     supabase.from('user_account').select('count').then(({ data, error }) => {
//       console.log("Supabase connection test:", { data, error });
//     });
    
//     const initializeScreenTime = async () => {
//       try {
//         console.log("Initializing screen time tracking");
//         const { data: { user } } = await supabase.auth.getUser();
        
//         if (!user) {
//           console.log("No authenticated user found");
//           return;
//         }
        
//         console.log("Found user:", user.id);
        
//         // Debug user information
//         await screenTimeService.debugUserInfo();
        
//         const username = await screenTimeService.getUsername(user.id);
//         if (!username) {
//           console.log("Username not found for user:", user.id);
//           return;
//         }
        
//         // Debug time limit specifically
//         await screenTimeService.debugTimeLimit(username);
        
//         console.log("Starting session for username:", username);
//         const session = await screenTimeService.startSession(username);
//         console.log("Session started:", session);
        
//         if (session) {
//           screenTimeService.startHeartbeat();
//           console.log("Heartbeat started");
//         }
//       } catch (error) {
//         console.error("Error in initializeScreenTime:", error);
//       }
//     };

//     initializeScreenTime();

//     // Set up event listeners for when the user leaves
//     const handleBeforeUnload = () => {
//       console.log("beforeunload event triggered");
//       screenTimeService.endSession();
//     };

//     // Handle visibility change (user switching tabs or minimizing browser)
//     const handleVisibilityChange = () => {
//       console.log("Visibility state changed:", document.visibilityState);
//       if (document.visibilityState === 'hidden') {
//         screenTimeService.updateSessionStatus();
//       }
//     };

//     window.addEventListener('beforeunload', handleBeforeUnload);
//     document.addEventListener('visibilitychange', handleVisibilityChange);

//     // Add an interval check as backup
//     const intervalCheck = setInterval(() => {
//       console.log("Interval check: updating session status");
//       screenTimeService.updateSessionStatus();
//     }, 60000); // Every minute

//     return () => {
//       console.log("ScreenTimeTracker unmounting");
//       screenTimeService.endSession();
//       window.removeEventListener('beforeunload', handleBeforeUnload);
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//       clearInterval(intervalCheck);
//       console.log("Cleanup complete");
//     };
//   }, []);

//   return null;
// };

// export default ScreenTimeTracker;