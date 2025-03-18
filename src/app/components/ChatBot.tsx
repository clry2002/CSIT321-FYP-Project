'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { Send } from 'lucide-react';
import './styles.css'; // Import your existing styles for additional customization

const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage } = useChatbot();
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Automatically scroll to the latest message when the messages array updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput(''); // Clear input field
    await sendMessage(userMessage); // Send message through the custom hook
  };

  return (
    <div className="flex flex-col h-full border rounded-lg shadow-md bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Book Recommendation Bot</h2>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="chat-container flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 transition-transform duration-300 ease-in-out ${
                message.role === 'user'
                  ? 'bg-rose-500 text-black self-end hover:scale-105 shadow-lg'
                  : 'bg-gray-100 text-gray-900 hover:scale-105 shadow-md'
              }`}
            >
              {message.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: message.content }} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {/* Show "Thinking..." when waiting for a response */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 rounded-lg p-3">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-100">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for book recommendations..."
            className="flex-1 p-2 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBot;
