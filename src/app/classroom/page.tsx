'use client';

import { supabase } from '@/lib/supabase'; // Import Supabase for potential use
import Navbar from '../components/Navbar';
import ChatBot from "../components/ChatBot";

type Classroom = {
  id: number;
  name: string;
  teacher: string;
  books: Array<{ id: number; title: string; genre: string }>;
  videos: Array<{ id: number; title: string; duration: string }>;
};

export default function ClassroomPage() {
  // Hard-coded data
  const classrooms: Classroom[] = [
    {
      id: 1,
      name: "Science Class",
      teacher: "Ms. Joan",
      books: [
        { id: 3, title: "Physics Book", genre: "Science" },
        { id: 4, title: "Chemistry Book", genre: "Science" },
      ],
      videos: [
        { id: 3, title: "The World of Physics", duration: "16 minutes" },
        { id: 4, title: "Introduction to Chemistry", duration: "18 minutes" },
      ],
    },
    {
      id: 2,
      name: "English Class",
      teacher: "Mr. Lee",
      books: [
        { id: 5, title: "Shakespearean Drama", genre: "Literature" },
        { id: 6, title: "Modern Poetry", genre: "Literature" },
      ],
      videos: [
        { id: 5, title: "Exploring Shakespeare", duration: "22 minutes" },
        { id: 6, title: "Understanding Poetry", duration: "30 minutes" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-25 px-6">
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">Classrooms</h2>

          {classrooms.length > 0 ? (
            <div className="space-y-8">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="bg-white shadow-md rounded-lg p-6">
                  <h3 className="text-xl font-bold text-blue-600">{classroom.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Teacher: <span className="font-medium">{classroom.teacher}</span>
                  </p>

                  <div className="mb-4">
                    <h4 className="text-lg font-medium text-black mb-2">Books</h4>
                    {classroom.books.length > 0 ? (
                      <ul className="list-disc list-inside text-gray-700">
                        {classroom.books.map((book) => (
                          <li key={book.id}>
                            {book.title} <span className="text-gray-500">({book.genre})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No books available.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-black mb-2">Videos</h4>
                    {classroom.videos.length > 0 ? (
                      <ul className="list-disc list-inside text-gray-700">
                        {classroom.videos.map((video) => (
                          <li key={video.id}>
                            {video.title} <span className="text-gray-500">({video.duration})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No videos available.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No classrooms available.</p>
          )}
        </div>
        <ChatBot />
      </div>
    </div>
  );
}
