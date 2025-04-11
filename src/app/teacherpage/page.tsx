'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import EduNavbar from '../components/eduNavbar';
import Link from 'next/link';

type Classroom = {
  crid: number;
  name: string;
  description: string;
};

export default function ViewClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchClassrooms = async () => {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setErrorMessage('Failed to fetch user account.');
        setLoading(false);
        return;
      }

      const { data: classroomData, error: classroomError } = await supabase
        .from('temp_classroom')
        .select('crid, name, description')
        .eq('uaid_educator', data.id);

      if (classroomError) {
        setErrorMessage('Failed to fetch classrooms.');
      } else {
        setClassrooms(classroomData || []);
      }

      setLoading(false);
    };

    fetchClassrooms();
  }, [router]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <EduNavbar />
      <main className="p-6 mt-20">
        <h1 className="text-2xl font-bold mb-4 text-black">My Classrooms</h1>

        {loading && <p className="text-gray-600">Loading...</p>}
        {errorMessage && <p className="text-red-600">{errorMessage}</p>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <div key={classroom.crid} className="relative group">
              <Link
                href={`/teacher/classroom-details/${classroom.crid}`}
                passHref
              >
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 cursor-pointer transition duration-300 hover:border-blue-400 hover:shadow-lg group overflow-hidden">
                  <div className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-20 transition duration-300 rounded-lg pointer-events-none" />
                  <h2 className="text-xl font-semibold text-black relative z-10">{classroom.name}</h2>
                  <p className="text-gray-700 relative z-10">{classroom.description}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {classrooms.length === 0 && !loading && (
          <div className="mt-4">
            <p className="text-gray-600">No classrooms created yet.</p>
            <button
              type="button"
              onClick={() => router.push('/teacher/create-classroom-new')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Classroom
            </button>
          </div>
        )}

        {classrooms.length > 0 && !loading && (
          <div className="mt-22 absolute top-1 right-10">
            <button
              type="button"
              onClick={() => router.push('/teacher/create-classroom-new')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Classroom
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
