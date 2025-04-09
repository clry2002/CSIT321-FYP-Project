'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '../../components/Navbar'; // Import Navbar component
import { useParams } from 'next/navigation'; // Using useParams for dynamic routes

type Classroom = {
  crid: number;
  name: string;
  description: string;
  educatorFullName: string;
};

export default function ClassroomBoardPage() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = useParams(); // Getting the dynamic 'id' from URL params

  useEffect(() => {
    const fetchClassroomDetails = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('temp_classroom')
          .select('crid, name, description, uaid_educator')
          .eq('crid', id)
          .single();

        if (error) {
          throw error;
        }

        const educatorData = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', data?.uaid_educator)
          .single();

        if (educatorData.error) {
          throw educatorData.error;
        }

        setClassroom({
          crid: data.crid,
          name: data.name,
          description: data.description,
          educatorFullName: educatorData.data?.fullname || 'Unknown Educator',
        });

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch classroom details');
        setLoading(false);
      }
    };

    fetchClassroomDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <div className="text-2xl text-blue-600">Loading Classroom...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-100">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex justify-center items-center h-screen bg-yellow-100">
        <div className="text-2xl text-yellow-600">No classroom found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 overflow-hidden">
      <Navbar /> {/* Your Navbar component */}
      
      <div className="flex-1 overflow-y-auto pt-30 px-6 pb-6">
        <h2 className="text-4xl font-bold text-center text-blue-700 mb-6">Welcome to Your Classroom!</h2>

        <div className="bg-white shadow-lg rounded-xl p-8 max-w-xl mx-auto">
          <div className="flex items-center mb-6">
            <span className="text-4xl text-yellow-500 mr-4">👨‍🏫</span>
            <h3 className="text-3xl font-semibold text-blue-600">{classroom.name}</h3>
          </div>
          
          <p className="text-lg text-gray-700 mb-4">{classroom.description}</p>

          <div className="flex justify-between items-center mt-6">
            <div>
              <span className="text-sm text-gray-600">Managed by</span>
              <h4 className="text-xl font-medium text-blue-600">{classroom.educatorFullName}</h4>
            </div>
            {/* Removed the "Go to Class!" button */}
          </div>
        </div>
      </div>
    </div>
  );
}
