'use client';

import React, { useState } from 'react';
import EduNavbar from '../../components/eduNavbar';

type Classroom = {
  id: number;
  name: string;
  students: { name: string; progress: number }[]; // Array of students with their progress
};

export default function ViewClassroom() {
  // const [classrooms, setClassrooms] = useState<Classroom[]>([
    const [classrooms] = useState<Classroom[]>([
    {
      id: 1,
      name: 'Classroom A',
      students: [
        { name: 'Student A', progress: 69 },
        { name: 'Student B', progress: 96 },
      ],
    },
    {
      id: 2,
      name: 'Classroom B',
      students: [
        { name: 'Student C', progress: 38 },
        { name: 'Student D', progress: 88 },
      ],
    },
  ]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Navbar */}
      <EduNavbar /> {/* Render EduNavbar at the top */}

      {/* Main Content */}
      <div className="px-6 py-25">
        {/* Header Section */}
        <h1 className="text-2xl font-serif text-black mb-5">View Classrooms</h1>

        {/* Classroom List Section */}
        <div className="space-y-5">
          {classrooms.length ? (
            classrooms.map((classroom) => (
              <div key={classroom.id} className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-serif text-black mb-3">{classroom.name}</h2>
                <p className="text-gray-500 text-sm mb-2">
                  Number of Students: {classroom.students.length}
                </p>
                <div className="border-t border-gray-200 pt-3">
                  <h3 className="text-black font-medium text-sm mb-2">Students & Progress:</h3>
                  {classroom.students.map((student, index) => (
                    <div key={index} className="flex justify-between text-gray-700 text-sm">
                      <span>{student.name}</span>
                      <span>Progress: {student.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No classrooms available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
