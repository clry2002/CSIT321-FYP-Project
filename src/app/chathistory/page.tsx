'use client';

import { useEffect, useState } from "react";

type ChatMessage = {
  chid: number;
  context: string;
  ischatbot: boolean;
  createddate: string;
};

export default function ChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(""); // Fix: Placed inside component

  useEffect(() => {
    setTime(new Date().toLocaleString()); // Fix: Runs only on client side
  }, []);

  useEffect(() => {
    async function fetchChatHistory() {
      try {
        const response = await fetch("/api/chat-history");
        const text = await response.text(); // Read raw response
  
        console.log("API Response:", text); // Debug: Log the response
        
  
        const data = JSON.parse(text); // Parse JSON manually
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setLoading(false);
      }
    }
  
    fetchChatHistory();
  }, []);
  
  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Chat History</h2>
      
      <p className="text-sm text-gray-600">Current Time: {time}</p> {/* Fix: Only runs on client */}
      
      {loading ? (
        <p className="text-gray-700">Loading chat history...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No chat history found.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.chid}
              className={`p-3 rounded-lg shadow ${
                msg.ischatbot ? "bg-gray-200 text-gray-900" : "bg-rose-500 text-white self-end"
              }`}
            >
              <p>{msg.context}</p>
              <span className="text-xs text-gray-600">
                {new Date(msg.createddate).toLocaleString("en-US", { timeZone: "UTC" })} {/* Fix: Ensure consistent formatting */}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
