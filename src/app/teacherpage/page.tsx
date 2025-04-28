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
    const [canCreateClassroom, setCanCreateClassroom] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchClassrooms = async () => {
            setLoading(true);
            setErrorMessage('');

            try {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError || !user) {
                    router.push('/login');
                    return;
                }

                // Check educator permissions
                const { data: permissionData, error: permissionError } = await supabase
                    .from('educatorpermissions')
                    .select('active')
                    .eq('permission', 'disable classroom creation')
                    .single();

                if (permissionError) {
                    console.error('Error fetching educator permissions:', permissionError);
                } else {
                    setCanCreateClassroom(!permissionData?.active);
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
            } catch (err) {
                setErrorMessage('An error occurred while fetching data.');
                console.error(err);
            }

            setLoading(false);
        };

        fetchClassrooms();
    }, [router]);

    return (
        <div className="bg-gray-50 min-h-screen">
            <EduNavbar />
            <main className="container mx-auto py-10 px-6 sm:px-8 md:px-10 lg:px-12 mt-20">
                <h1 className="text-2xl font-semibold mb-6 text-gray-800">My Classrooms</h1>

                {loading && <p className="text-gray-600 italic">Loading classrooms...</p>}
                {errorMessage && <p className="text-red-500">{errorMessage}</p>}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classrooms.map((classroom) => (
                        <Link
                            key={classroom.crid}
                            href={`/teacher/classroom-details/${classroom.crid}`}
                            className="block rounded-lg shadow-md border border-gray-300 hover:shadow-lg transition duration-300 overflow-hidden relative group"
                        >
                            <div className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
                            <div className="p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-2 relative z-10">{classroom.name}</h2>
                                <p className="text-gray-700 relative z-10">{classroom.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {classrooms.length === 0 && !loading && canCreateClassroom && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-700 mb-4">No classrooms created yet. Get started by creating one!</p>
                        <button
                            type="button"
                            onClick={() => router.push('/teacher/create-classroom-new')}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            Create New Classroom
                        </button>
                    </div>
                )}

                {classrooms.length === 0 && !loading && !canCreateClassroom && (
                    <div className="mt-8 text-center">
                        <p className="text-gray-700 mb-4">No classrooms created yet.</p>
                        <p className="text-red-500">Classroom creation has been disabled by the administrator.</p>
                    </div>
                )}

                {classrooms.length > 0 && !loading && canCreateClassroom && (
                    <button
                        type="button"
                        onClick={() => router.push('/teacher/create-classroom-new')}
                        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        + Create Classroom
                    </button>
                )}
            </main>
        </div>
    );
}