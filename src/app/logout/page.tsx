// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase"; // Ensure this points to your Supabase client

// const Logout = () => {
//   const router = useRouter();

//   useEffect(() => {
//     const logout = async () => {
//       // Sign out from Supabase session
//       await supabase.auth.signOut();

//       // Redirect to landing page
//       router.push("/");
//     };

//     logout();
//   }, [router]);

//   return (
//     <div>
//       <h1>Logging Out...</h1>
//     </div>
//   );
// };

// export default Logout;

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        console.log("Logging out user...");
        
        // Sign out from Supabase session
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error("Error signing out:", error);
        } else {
          console.log("Successfully signed out");
          
          // Small delay to ensure signout is processed
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Redirect directly to landing page instead of root
          router.replace("/landing");
        }
      } catch (error) {
        console.error("Unexpected error during logout:", error);
        // Still try to redirect to landing
        router.replace("/landing");
      }
    };

    logout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Logging Out...</h1>
        <p>Please wait while we sign you out.</p>
      </div>
    </div>
  );
};

export default Logout;