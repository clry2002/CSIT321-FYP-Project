// 'use client';

// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { useRouter } from 'next/navigation';
// import EduNavbar from '../../components/eduNavbar';
// import Link from 'next/link';

// type Classroom = {
//   crid: number;
//   name: string;
//   description: string;
// };

// export default function ViewClassrooms() {
//   const [classrooms, setClassrooms] = useState<Classroom[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [isModalOpen, setIsModalOpen] = useState(false); 
//   const [classroomToDelete, setClassroomToDelete] = useState<number | null>(null);
//   const router = useRouter();

//   // Function to handle delete confirmation
//   const handleDelete = async () => {
//     if (classroomToDelete === null) return;

//     const { error } = await supabase
//       .from('temp_classroom')
//       .delete()
//       .eq('crid', classroomToDelete);

//     if (error) {
//       alert('Failed to delete classroom.');
//     } else {
//       setClassrooms(prev => prev.filter(c => c.crid !== classroomToDelete));
//       setIsModalOpen(false); 
//     }
//   };

//   const openDeleteModal = (crid: number) => {
//     setClassroomToDelete(crid);
//     setIsModalOpen(true); 
//   };

//   const closeDeleteModal = () => {
//     setIsModalOpen(false);
//     setClassroomToDelete(null);
//   };

//   useEffect(() => {
//     const fetchClassrooms = async () => {
//       setLoading(true);
//       setErrorMessage('');

//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) {
//         router.push('/login');
//         return;
//       }

//       const { data, error } = await supabase
//         .from('user_account')
//         .select('id')
//         .eq('user_id', user.id)
//         .single();

//       if (error || !data) {
//         setErrorMessage('Failed to fetch user account.');
//         setLoading(false);
//         return;
//       }

//       const { data: classroomData, error: classroomError } = await supabase
//         .from('temp_classroom')
//         .select('crid, name, description')
//         .eq('uaid_educator', data.id);

//       if (classroomError) {
//         setErrorMessage('Failed to fetch classrooms.');
//       } else {
//         setClassrooms(classroomData || []);
//       }

//       setLoading(false);
//     };

//     fetchClassrooms();
//   }, [router]);

//   return (
//     <div className="p-6 bg-gray-100 min-h-screen">
//       <EduNavbar />
//       <main className="p-6 mt-20">
//         <h1 className="text-2xl font-bold mb-4 text-black">My Classrooms</h1>

//         {loading && <p className="text-gray-600">Loading...</p>}
//         {errorMessage && <p className="text-red-600">{errorMessage}</p>}

//         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//             {classrooms.map((classroom) => (
//                 <div key={classroom.crid} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
//                     <h2 className="text-xl font-semibold text-black">{classroom.name}</h2>
//                     <p className="text-gray-700">{classroom.description}</p>
//                     {/* Link to Classroom Details Page */}
//                     <Link href={`/teacher/classroom-details/${classroom.crid}`} passHref>
//                     <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
//                         View Details
//                         </button>
//                         </Link>
//                         </div>
//                     ))}
//                 </div>

//         {classrooms.length === 0 && !loading && (
//           <div className="mt-4">
//             <p className="text-gray-600">No classrooms created yet.</p>
//             <button
//                 type="button"
//                 onClick={() => router.push('/teacher/create-classroom-new')}
//               className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//             >
//               Create Classroom
//             </button>
//           </div>
//         )}
    

//       {classrooms.length && !loading && (
//           <div className="mt-22 absolute top-1 right-10 ">
//             <button
//                 type="button"
//                 onClick={() => router.push('/teacher/create-classroom-new')}
//               className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//             >
//               Create Classroom
//             </button>
//           </div>
//         )}
//       </main>

//       {/* Modal for confirmation */}
//       {isModalOpen && (
//         <div className="fixed inset-0 flex justify-center items-center">
//             <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
//             <h2 className="text-xl font-semibold text-black">Confirm Deletion</h2>
//             <p className="text-gray-700 mt-2">Are you sure you want to delete this classroom?</p>
//             <div className="mt-4 flex justify-end space-x-4">
//                 <button
//                 onClick={closeDeleteModal}
//                 className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
//                 >
//                 Cancel
//                 </button>
//                 <button
//                 onClick={handleDelete}
//                 className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
//                 >
//                 Confirm
//                 </button>
//             </div>
//             </div>
//         </div>
//       )}
//     </div>
//   );
// }
