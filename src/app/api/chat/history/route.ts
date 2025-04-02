import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
      const { data, error } = await supabase
        .from("temp_chathistory")
        .select("chid, context, ischatbot, createddate")
        .order("createddate", { ascending: true });
  
      if (error) {
        console.error("Supabase Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
  
      console.log("Chat History Data:", data); // Debugging
      return NextResponse.json(data || []);
    } catch (error) {
      console.error("Unexpected Server Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch chat history" },
        { status: 500 }
      );
    }
  }
  
