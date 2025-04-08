'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import EduNavbar from '../../../components/eduNavbar';

// Define the Classroom type
type Classroom = {
  crid: number;
  name: string;
  description: string;
};

export default function ClassroomDetails() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Track whether we are in edit mode
  const [name, setName] = useState(''); // Track the classroom name in the form
  const [description, setDescription] = useState(''); // Track the classroom description in the form
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false); // Track delete confirmation
  const router = useRouter();
  const { crid } = useParams(); 

  // Fetch the classroom details when the page loads
  useEffect(() => {
    const fetchClassroomDetails = async () => {
      setLoading(true);
      setErrorMessage('');

      // Fetch classroom details based on crid
      const { data, error } = await supabase
        .from('temp_classroom')
        .select('crid, name, description')
        .eq('crid', crid)
        .single();

      if (error || !data) {
        setErrorMessage('Failed to fetch classroom details.');
      } else {
        setClassroom(data);
        setName(data.name); // Set initial form values
        setDescription(data.description); // Set initial form values
      }

      setLoading(false);
    };

    if (crid) {
      fetchClassroomDetails();
    }
  }, [crid]);

  // Handle classroom deletion
  const handleDelete = async () => {
    if (!classroom) return;  // Ensure classroom is not null

    const { error } = await supabase
      .from('temp_classroom')
      .delete()
      .eq('crid', classroom.crid);

    if (error) {
      alert('Failed to delete classroom.');
    } else {
      router.back();  // Redirect back to the classroom list
    }
  };

  // Handle editing submission
  const handleSave = async () => {
    if (!name || !description) {
      setErrorMessage('Please fill in both the name and description.');
      return;
    }
  
    // Check if the classroom name already exists
    const { data, error } = await supabase
      .from('temp_classroom')
      .select('crid')
      .eq('name', name)  // Check for the classroom name
      .neq('crid', classroom?.crid); 
  
    if (data && data.length > 0) {
      setErrorMessage('A classroom with this name already exists. Please choose a different name.');
      return;
    } else {
        setErrorMessage('');
    }
    if (classroom) {
        const { error } = await supabase
        .from('temp_classroom')
        .update({ name, description })
        .eq('crid', classroom?.crid);  

        if (error) {
        alert('Failed to update classroom details.');
        } else {
        setClassroom({ crid: classroom.crid, name, description });  
        setIsEditing(false); 
        }
    }
  };

    // Handle real-time validation of classroom name
    const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
    
        // Check if classroom name already exists
        const { data, error } = await supabase
          .from('temp_classroom')
          .select('crid')
          .eq('name', newName)  
          .neq('crid', classroom?.crid);  
    
        if (data && data.length > 0) {
          setErrorMessage('A classroom with this name already exists. Please choose a different name.');
        } else {
          setErrorMessage('');
        }
      };
    
      if (loading) return <p className="text-gray-600">Loading...</p>;


  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <EduNavbar />
      <main className="p-6 mt-20">
  
        {classroom ? (
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h1 className="text-2xl font-bold mb-4 text-black">{isEditing ? 'Edit Classroom' : classroom.name}</h1>
  
            {isEditing ? (
            <div>
                <div className="mb-4">
                <label htmlFor="name" className="font-bold block text-gray-700">Classroom Name</label>
                <input
                    id="name"
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded mt-1 text-black"
                    value={name}
                    onChange={handleNameChange}
                />
                </div>

                {errorMessage && <p className="text-red-600">{errorMessage}</p>}

                <div className="mb-4">
                <label htmlFor="description" className="font-bold block text-gray-700">Description</label>
                <textarea
                    id="description"
                    className="w-full p-2 border border-gray-300 rounded mt-1 text-black"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                </div>

                <div className="flex space-x-4">
                <button
                    onClick={() => {
                    setIsEditing(false); 
                    setName(classroom.name);  
                    setDescription(classroom.description);
                    setErrorMessage('');
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Cancel
                </button>

                <button
                    onClick={handleSave}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Save Changes
                </button>
                </div>
            </div>
            ) : (
            <div>
                <p className="text-gray-700 mb-4">{classroom.description}</p>
                <button
                onClick={() => setIsEditing(true)} // Switch to edit mode
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                >
                Edit Classroom
                </button>
            </div>
            )}

            {/* Delete Button will only appear when not in editing mode */}
            {!isEditing && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                Delete Classroom
              </button>
            )}

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mb-4"
            >
              Back
            </button>
  
            {/* Modal for Delete Confirmation */}
            {isConfirmingDelete && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 shadow-lg w-1/3">
                  <h2 className="text-lg font-semibold text-black mb-4">Are you sure you want to delete this classroom?</h2>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={handleDelete} 
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)} 
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Classroom not found.</p>
        )}
      </main>
    </div>
  );
}  