'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Use Next.js router for navigation
import EduNavbar from '../components/eduNavbar'; // Import the EduNavbar component

export default function TeacherHome() {
  const router = useRouter(); // Initialize Next.js router

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Navbar */}
      <EduNavbar /> {/* Render the EduNavbar component */}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-30">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif text-black">Welcome back, Teacher!</h1>
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {/* View Classroom Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">View Classroom</h2>
            <p className="text-gray-500 text-sm mb-4">
              View your classroom and monitor student progress in real-time.
            </p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
              onClick={() => router.push('/teacher/view-classroom')} // Navigate to View Classroom page
            >
              Go to Classroom
            </button>
          </div>

          {/* Manage Classroom Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Manage Classroom</h2>
            <p className="text-gray-500 text-sm mb-4">
              Add books and videos, adjust classroom settings, update student information, remove old classrooms, and manage schedules.
            </p>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
              onClick={() => router.push('/teacher/manage-classroom')} // Navigate to Manage Classroom page
            >
              Manage Classroom
            </button>
          </div>

          {/* Create Classroom Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Create Classroom</h2>
            <p className="text-gray-500 text-sm mb-4">
              Create a new classroom to begin organizing and managing your students.
            </p>
            <button
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg w-full"
              onClick={() => router.push('/teacher/create-classroom')} // Navigate to Create Classroom page
            >
              Create Classroom
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">View Reports</h2>
          <p className="text-gray-500 text-sm mb-4">
            Working Create Classroom Function
          </p>
          <button
            className="bg-purple-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/teacher/create-classroom-new')}
          >
            Create Classroom
          </button>
        </div>

          {/* Settings Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Settings</h2>
            <p className="text-gray-500 text-sm mb-4">
              Configure your account settings and preferences.
            </p>
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-lg w-full"
              onClick={() => router.push('/teacher/settings')}
            >
              Go to Settings
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
