"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Ensure this points to your Supabase client

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      // Sign out from Supabase session
      await supabase.auth.signOut();

      // Redirect to landing page
      router.push("/");
    };

    logout();
  }, [router]);

  return (
    <div>
      <h1>Logging Out...</h1>
    </div>
  );
};

export default Logout;
