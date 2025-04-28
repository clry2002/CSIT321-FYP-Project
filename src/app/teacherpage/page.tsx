'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import EduNavbar from '../components/eduNavbar';
import Link from 'next/link';
import { AcademicCapIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

type Classroom = {
    crid: number;
    name: string;
    description: string;
    acceptedCount?: number;
    rejectedCount?: number;
    pendingCount?: number;
};

export default function ViewClassrooms() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [canCreateClassroom, setCanCreateClassroom] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchClassroomsWithStudentCounts = async () => {
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

                const { data: userData, error: userAccountError } = await supabase
                    .from('user_account')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (userAccountError || !userData) {
                    setErrorMessage('Failed to fetch user account.');
                    setLoading(false);
                    return;
                }

                // Fetch classrooms created by the current educator
                const { data: classroomData, error: classroomError } = await supabase
                    .from('temp_classroom')
                    .select('crid, name, description')
                    .eq('uaid_educator', userData.id);

                if (classroomError) {
                    setErrorMessage('Failed to fetch classrooms.');
                    setLoading(false);
                    return;
                }

                // Fetch all student records for the educator's classrooms
                const classroomIds = classroomData.map((classroom) => classroom.crid);
                const { data: studentData, error: studentError } = await supabase
                    .from('temp_classroomstudents')
                    .select('crid, invitation_status')
                    .in('crid', classroomIds);

                if (studentError) {
                    setErrorMessage('Failed to fetch classroom students.');
                    setLoading(false);
                    return;
                }

                // Calculate student counts for each status per classroom
                const classroomsWithCounts = classroomData.map((classroom) => {
                    const acceptedStudents = studentData.filter(
                        (student) => student.crid === classroom.crid && student.invitation_status === 'accepted'
                    );
                    const rejectedStudents = studentData.filter(
                        (student) => student.crid === classroom.crid && student.invitation_status === 'rejected'
                    );
                    const pendingStudents = studentData.filter(
                        (student) => student.crid === classroom.crid && student.invitation_status === 'pending'
                    );
                    return {
                        ...classroom,
                        acceptedCount: acceptedStudents.length,
                        rejectedCount: rejectedStudents.length,
                        pendingCount: pendingStudents.length,
                    };
                });

                setClassrooms(classroomsWithCounts);

            } catch (err) {
                setErrorMessage('An error occurred while fetching data.');
                console.error(err);
            }

            setLoading(false);
        };

        fetchClassroomsWithStudentCounts();
    }, [router]);

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen"> {/* Soft gradient background */}
            <EduNavbar />
            <main className="container mx-auto py-10 px-6 sm:px-8 md:px-10 lg:px-12 mt-20">
                <h1 className="text-3xl font-semibold text-gray-800 mb-8 flex items-center space-x-3">
                    <AcademicCapIcon className="h-7 w-7 text-blue-600" /> {/* Richer blue */}
                    <span className="text-black">My Classrooms</span> {/* Classic black for text */}
                </h1>

                {loading && <div className="text-center py-6"><p className="text-gray-600 italic">Loading classrooms...</p></div>}
                {errorMessage && <div className="text-center py-6"><p className="text-red-500">{errorMessage}</p></div>}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classrooms.map((classroom) => (
                        <Link
                            key={classroom.crid}
                            href={`/teacher/classroom-details/${classroom.crid}`}
                            className="block rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-300 overflow-hidden"
                        >
                            <div className="flex flex-col h-full">
                                <div className="bg-blue-500 text-white p-6"> {/* Top half blue */}
                                    <div className="font-semibold mb-4 text-xl truncate">{classroom.name}</div> {/* Larger font size */}
                                </div>
                                <div className="bg-white p-6 flex flex-col justify-between flex-grow"> {/* Bottom half white */}
                                    <p className="text-gray-700 mb-4 line-clamp-3 flex-grow">{classroom.description}</p>
                                    <div className="mt-2 flex justify-start space-x-4 text-sm text-gray-500">
                                        {typeof classroom.acceptedCount === 'number' && (
                                            <div className="flex items-center space-x-1">
                                                <UserGroupIcon className="h-4 w-4 text-green-600" />
                                                <span className="flex items-center"><b className="font-semibold mr-1 text-gray-700">{classroom.acceptedCount}</b> Accepted</span>
                                            </div>
                                        )}
                                        {typeof classroom.pendingCount === 'number' && classroom.pendingCount > 0 && (
                                            <div className="flex items-center space-x-1">
                                                <ClockIcon className="h-4 w-4 text-yellow-600" />
                                                <span className="flex items-center"><b className="font-semibold mr-1 text-gray-700">{classroom.pendingCount}</b> Pending</span>
                                            </div>
                                        )}
                                        {typeof classroom.rejectedCount === 'number' && classroom.rejectedCount > 0 && (
                                            <div className="flex items-center space-x-1">
                                                <UserGroupIcon className="h-4 w-4 text-red-600 opacity-80" />
                                                <span className="flex items-center"><b className="font-semibold mr-1 text-gray-700">{classroom.rejectedCount}</b> Rejected</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {classrooms.length === 0 && !loading && canCreateClassroom && (
                    <div className="mt-12 text-center">
                        <p className="text-gray-700 mb-4">No classrooms created yet. Ready to inspire?</p>
                        <button
                            type="button"
                            onClick={() => router.push('/teacher/create-classroom-new')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <AcademicCapIcon className="h-5 w-5 inline-block mr-2 -mt-0.5" />
                            Create New Classroom
                        </button>
                    </div>
                )}

                {classrooms.length === 0 && !loading && !canCreateClassroom && (
                    <div className="mt-12 text-center">
                        <p className="text-gray-700 mb-4">No classrooms created yet.</p>
                        <p className="text-red-600">Classroom creation has been temporarily disabled.</p>
                    </div>
                )}

                {classrooms.length > 0 && !loading && canCreateClassroom && (
                    <button
                        type="button"
                        onClick={() => router.push('/teacher/create-classroom-new')}
                        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
                    >
                        <AcademicCapIcon className="h-5 w-5" />
                        <span>Create Classroom</span>
                    </button>
                )}
            </main>
        </div>
    );
}