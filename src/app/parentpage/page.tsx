'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use Next.js router for navigation

export default function ParentHome() {
  const router = useRouter(); // Initialize Next.js router
  const [children, setChildren] = useState([
    { id: 1, name: 'Child 1', age: 6, history: ['Asked about book recommendations', 'Asked about videos'] },
    { id: 2, name: 'Child 2', age: 9, history: ['Requested book recommendations', 'Asked for documentaries'] },
  ]);

  // Function to add a new child
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif text-black">Welcome back, Parent!</h1>
          <div className="flex space-x-3">
            <button
              className="bg-gray-900 text-white px-4 py-2 rounded-lg"
              onClick={() => console.log('Open Settings')}
            >
              Settings
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
              onClick={() => router.push('/logout')} // Navigate to the logout page
            >
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Child Profiles Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child Profiles</h2>
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-black text-sm">{child.name}</h3>
                  <p className="text-gray-500 text-xs">Age: {child.age || 'Unknown'}</p>
                </div>
                <button
                  className="text-blue-500 text-xs underline"
                  onClick={() => console.log(`Manage Profile for ${child.name}`)}
                >
                  Manage Profile
                </button>
              </div>
            ))}
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
              /* Need to add Functionality to create Kids User Profile */
              onClick={() => router.push('/profile')}
            >
              + Add Child
            </button>
          </div>

          {/* Child Chatbot History Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child ChatBot History</h2>
            {children.map((child) => (
              <div key={child.id} className="mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-sm text-black">{child.name}'s History</h3>
                    <ul className="list-disc list-inside text-gray-600 text-xs">
                      {child.history.length ? (
                        child.history.map((entry, index) => <li key={index}>{entry}</li>)
                      ) : (
                        <li>No history available</li>
                      )}
                    </ul>
                  </div>
                  <button
                    className="text-blue-500 text-xs underline ml-4"
                    onClick={() => console.log(`View History for ${child.name}`)}
                  >
                    View History
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Child Profile Settings Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Parental Control</h2>
            {children.map((child) => (
              <button
                key={child.id}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full mb-2"
                onClick={() => console.log(`Settings for ${child.name}`)}
              >
                Manage {child.name}'s Profile
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
