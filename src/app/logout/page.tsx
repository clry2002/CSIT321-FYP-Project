"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 

const Logout = () => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log("Logging out user...");
      
      // Sign out from Supabase session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        setIsLoggingOut(false);
      } else {
        console.log("Successfully signed out");
        
        // Small delay to ensure signout is processed
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Redirect directly to landing page instead of root
        router.replace("/landing");
      }
    } catch (error) {
      console.error("Unexpected error during logout:", error);
      setIsLoggingOut(false);
      // Still try to redirect to landing
      router.replace("/landing");
    }
  };

  const handleCancel = () => {
    // Navigate back to previous page or to home
    router.back();
  };

  // If already in the process of logging out, show the loading screen
  if (isLoggingOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Logging Out...</h1>
          <p className="text-white">Please wait while we sign you out.</p>
        </div>
      </div>
    );
  }

  // Otherwise, show the confirmation modal
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="bg-gray-900 p-6 rounded-lg w-96">
        <h3 className="text-xl font-bold mb-4 text-white">Confirm Logout</h3>
        <p className="mb-4 text-white">Are you sure you want to logout?</p>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;