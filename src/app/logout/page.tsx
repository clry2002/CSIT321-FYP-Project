"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Use next/navigation for routing

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    // Clear authentication data
    localStorage.removeItem("authToken");

    // Redirect to the landing page
    router.push("/");
  }, [router]);

  return (
    <div>
      <h1>Logging Out...</h1>
    </div>
  );
};

export default Logout;