'use client';

import React, { useState } from 'react';
import EduNavbar from '../../components/eduNavbar';

type Classroom = {
  id: number;
  name: string;
  books: string[];
  videos: string[];
  students: { id: number; name: string }[];
  schedule: string;
};

export default function ManageClassroom() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    {
      id: 1,
      name: 'Classroom 1',
      books: ['Documentary', 'Game Videos'],
      videos: ['Science', 'Explore the world'],
      students: [
        { id: 1, name: 'Student A' },
        { id: 2, name: 'Student B' },
      ],
      schedule: 'Mon, Wed, Fri - 10 AM to 11 AM',
    },
    {
      id: 2,
      name: 'Classroom 2',
      books: ['Math', 'Game Videos'],
      videos: ['Math 101', 'Learn to count!'],
      students: [
        { id: 1, name: 'Student A' },
        { id: 2, name: 'Student B' },
      ],
      schedule: 'Mon, Wed, Fri - 10 AM to 11 AM',
    },
  ]);

  const [newResource, setNewResource] = useState({ type: '', value: '' });
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  // Handle new resource input (books, videos, schedules)
  const handleResourceInput = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setNewResource((prev) => ({ ...prev, [name]: value }));
  };

  // Add a resource to the selected classroom
  // const addResource = () => {
  //   if (selectedClassroom && newResource.value) {
  //     const updatedClassrooms = classrooms.map((classroom) =>
  //       classroom.id === selectedClassroom.id
  //         ? {
  //             ...classroom,
  //             [newResource.type]: [...(classroom as any)[newResource.type], newResource.value],
  //           }
  //         : classroom
  //     );
  //     setClassrooms(updatedClassrooms);
  //     setNewResource({ type: '', value: '' }); // Reset input fields
  //   }
  // };

  // Update classroom schedule
  const updateSchedule = (id: number, newSchedule: string) => {
    setClassrooms((prevState) =>
      prevState.map((classroom) =>
        classroom.id === id ? { ...classroom, schedule: newSchedule } : classroom
      )
    );
  };

  // Remove classroom
  const removeClassroom = (id: number) => {
    setClassrooms((prevState) => prevState.filter((classroom) => classroom.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar */}
      <EduNavbar />

      {/* Main Content */}
      <div className="px-6 py-25">
        {/* Header Section */}
        <h1 className="text-2xl font-serif text-black mb-5">Manage Classrooms</h1>

        {/* Classroom List Section */}
        <div className="space-y-5">
          {classrooms.length ? (
            classrooms.map((classroom) => (
              <div key={classroom.id} className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-serif text-black mb-3">{classroom.name}</h2>
                <p className="text-gray-500 text-sm mb-2">
                  Books: {classroom.books.join(', ') || 'None'}
                </p>
                <p className="text-gray-500 text-sm mb-2">
                  Videos: {classroom.videos.join(', ') || 'None'}
                </p>
                <p className="text-gray-500 text-sm mb-2">
                  Number of Students: {classroom.students.length}
                </p>
                <p className="text-gray-500 text-sm mb-2">Schedule: {classroom.schedule}</p>

                {/* Add Resource Section */}
                <div className="mt-3">
                  <input
                    type="text"
                    name="value"
                    placeholder="Add Book or Video"
                    value={newResource.value}
                    onChange={handleResourceInput}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-2"
                  />
                  <select
                    name="type"
                    value={newResource.type}
                    onChange={handleResourceInput}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select Resource Type
                    </option>
                    <option value="books">Book</option>
                    <option value="videos">Video</option>
                  </select>
                  <button
                    onClick={() => setSelectedClassroom(classroom)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
                  >
                    Add Resource
                  </button>
                </div>

                {/* Update Schedule */}
                <button
                  className="text-blue-500 text-sm underline"
                  onClick={() =>
                    updateSchedule(
                      classroom.id,
                      prompt(`Update schedule for ${classroom.name}`, classroom.schedule) ||
                        classroom.schedule
                    )
                  }
                >
                  Update Schedule
                </button>

                {/* Delete Classroom */}
                <button
                  className="text-red-500 text-sm underline ml-4"
                  onClick={() => removeClassroom(classroom.id)}
                >
                  Remove Classroom
                </button>
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
