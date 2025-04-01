'use client';

import React, { useState } from 'react';
import EduNavbar from '../../components/eduNavbar'; // Adjust path based on folder structure

type Student = {
  id: number;
  name: string;
};

type Classroom = {
  name: string;
  students: Student[];
};

export default function CreateClassroom() {
  const [classroomName, setClassroomName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');

  // Add new student
  const addStudent = () => {
    if (newStudentName) {
      const newId = students.length ? students[students.length - 1].id + 1 : 1;
      const newStudent: Student = { id: newId, name: newStudentName };
      setStudents((prevStudents) => [...prevStudents, newStudent]);
      setNewStudentName(''); // Clear the input field
    }
  };

  // Create classroom
  const createClassroom = () => {
    if (classroomName && students.length) {
      const newClassroom: Classroom = {
        name: classroomName,
        students: students,
      };

      console.log('Classroom Created:', newClassroom);
      alert(`Classroom "${classroomName}" with ${students.length} students has been created!`);

      // Reset the form
      setClassroomName('');
      setStudents([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <EduNavbar />

      {/* Main Content */}
      <div className="px-6 py-5">
        {/* Header Section */}
        <h1 className="text-2xl font-serif text-black mb-5">Create Classroom</h1>

        {/* Classroom Name Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-5">
          <h2 className="text-lg font-serif text-black mb-3">Classroom Details</h2>
          <input
            type="text"
            placeholder="Enter Classroom Name"
            value={classroomName}
            onChange={(e) => setClassroomName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3"
          />
        </div>

        {/* Add Students Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-5">
          <h2 className="text-lg font-serif text-black mb-3">Add Students</h2>
          <input
            type="text"
            placeholder="Enter Student Name"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3"
          />
          <button
            onClick={addStudent}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
          >
            + Add Student
          </button>
        </div>

        {/* List of Added Students */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-5">
          <h2 className="text-lg font-serif text-black mb-3">Students Added</h2>
          {students.length > 0 ? (
            <ul className="list-disc list-inside">
              {students.map((student) => (
                <li key={student.id} className="text-gray-700 text-sm">
                  {student.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No students added yet.</p>
          )}
        </div>

        {/* Create Classroom Button */}
        <button
          onClick={createClassroom}
          className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
        >
          Create Classroom
        </button>
      </div>
    </div>
  );
}
