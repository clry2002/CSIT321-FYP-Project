'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';


type EditClassroomProps = {
  classroom: {
    crid: number;
    name: string;
    description: string;
  };
  onCancel: () => void;
  onSave: (name: string, description: string) => void; // Changed to match expected signature
};

export default function EditClassroom({ classroom, onCancel, onSave }: EditClassroomProps) {
  const [name, setName] = useState(classroom.name);
  const [description, setDescription] = useState(classroom.description);
  const [errorMessage, setErrorMessage] = useState('');

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);

    const { data } = await supabase
      .from('temp_classroom')
      .select('crid')
      .eq('name', newName)
      .neq('crid', classroom.crid);

    if (data && data.length > 0) {
      setErrorMessage('A classroom with this name already exists.');
    } else {
      setErrorMessage('');
    }
  };

  const handleSaveChanges = async () => {
    if (!name || !description) {
      setErrorMessage('Please fill in both the name and description.');
      return;
    }

    const { error } = await supabase
      .from('temp_classroom')
      .update({ name, description })
      .eq('crid', classroom.crid);

    if (error) {
      setErrorMessage('Failed to update classroom details.');
    } else {
      // Pass name and description separately instead of as an object
      onSave(name, description);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 text-black">Edit Classroom</h1>
      <div className="mb-4">
        <label className="block text-gray-700 font-bold">Classroom Name</label>
        <input
          type="text"
          className="w-full p-2 border rounded text-black"
          value={name}
          onChange={handleNameChange}
        />
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-bold">Description</label>
        <textarea
          className="w-full p-2 border rounded text-black"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </div>
    </>
  );
}