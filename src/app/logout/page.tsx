// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation"; // Use next/navigation for routing

// const Logout = () => {
//   const router = useRouter();

//   useEffect(() => {
//     // Clear authentication data
//     localStorage.removeItem("authToken");

//     // Redirect to the landing page
//     router.push("/");
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
