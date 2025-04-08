'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import EduNavbar from '../../../components/eduNavbar';

type Classroom = {
  crid: number;
  name: string;
  description: string;
};

type ChildUser = {
  id: string;
  username: string;
  fullname: string;
};

enum InvitationStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected', 
}

type ClassroomStudent = {
  uaid_child: string;
  invitation_status: InvitationStatus;
  user_account: {
    username: string;
    fullname: string;
  };
};

export default function ClassroomDetails() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [allChildren, setAllChildren] = useState<ChildUser[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [classroomStudents, setClassroomStudents] = useState<ClassroomStudent[]>([]);

  const router = useRouter();
  const { crid } = useParams();

  // Remove students
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<ClassroomStudent | null>(null);



  // Fetch child users and classroom students
  useEffect(() => {
    const fetchChildUsers = async () => {
      const { data, error } = await supabase
        .from('user_account')
        .select('id, username, fullname')
        .eq('upid', 3);

      if (!error && data) setAllChildren(data);
    };

    const fetchClassroomStudents = async () => {
      const { data, error } = await supabase
        .from('temp_classroomstudents')
        .select(`
          uaid_child,
          invitation_status,
          user_account (
            username,
            fullname
          )
        `)
        .eq('crid', crid);

      if (!error && data) {
        const formattedData = data.map((item: any) => ({
          ...item,
          user_account: item.user_account,
        }));
        setClassroomStudents(formattedData);
      }
    };

    const fetchClassroomDetails = async () => {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase
        .from('temp_classroom')
        .select('crid, name, description')
        .eq('crid', crid)
        .single();

      if (error || !data) {
        setErrorMessage('Failed to fetch classroom details.');
      } else {
        setClassroom(data);
        setName(data.name);
        setDescription(data.description);
      }
      setLoading(false);
    };

    if (crid) {
      fetchChildUsers();
      fetchClassroomStudents();
      fetchClassroomDetails();
    }
  }, [crid]);

  const handleAddStudent = async () => {
    const selectedChild = allChildren.find((child) => child.username === selectedUsername);
    if (!selectedChild) {
      alert('Selected username not found.');
      return;
    }

    const { error } = await supabase.from('temp_classroomstudents').insert({
      crid: crid,
      uaid_child: selectedChild.id,
    });
  
    if (error) {
      alert('Failed to add student.');
    } else {
       // Remove the added student from the dropdown list
       setAllChildren((prevChildren) =>
        prevChildren.filter((child) => child.username !== selectedUsername)
      );
      setSelectedUsername(''); // Reset the dropdown selection
      // Refresh list
      const { data } = await supabase
        .from('temp_classroomstudents')
        .select(`
          uaid_child,
          invitation_status,
          user_account (
            username,
            fullname
          )
        `)
        .eq('crid', crid);
  
      if (data) {
        const formattedData: ClassroomStudent[] = data.map((item: any) => ({
          uaid_child: item.uaid_child,
          invitation_status: item.invitation_status as InvitationStatus, // Cast to the enum
          user_account: item.user_account,
        }));
        setClassroomStudents(formattedData);
      }
    }
  };

  const handleRemoveStudent = async (uaid_child: string | null) => {
    if (!uaid_child) return; // In case no student is selected
  
    // Remove the student from the classroom
    const { error } = await supabase
      .from('temp_classroomstudents')
      .delete()
      .eq('crid', crid)
      .eq('uaid_child', uaid_child);
  
    if (error) {
      alert('Failed to remove student.');
    } else {
      // Reload classroom students after removal
      const { data } = await supabase
        .from('temp_classroomstudents')
        .select(`
          uaid_child,
          invitation_status,
          user_account (
            username,
            fullname
          )
        `)
        .eq('crid', crid);
  
      if (data) {
        const formattedData: ClassroomStudent[] = data.map((item: any) => ({
          uaid_child: item.uaid_child,
          invitation_status: item.invitation_status as InvitationStatus, // Cast to the enum
          user_account: item.user_account,
        }));
        setClassroomStudents(formattedData);
      }
  
      // After removing, we also need to add the student back to the available list of children
      const { data: allChildrenData } = await supabase
        .from('user_account')
        .select('id, username, fullname')
        .eq('upid', 3); // Adjust this query based on your specific logic
  
      if (allChildrenData) {
        setAllChildren(allChildrenData);
      }
    }
  
    // Close the confirmation modal after removal
    setShowConfirmModal(false);
  };
  
  
  
  const handleDelete = async () => {
    if (!classroom) return;
    const { error } = await supabase
      .from('temp_classroom')
      .delete()
      .eq('crid', classroom.crid);

    if (error) {
      alert('Failed to delete classroom.');
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!name || !description) {
      setErrorMessage('Please fill in both the name and description.');
      return;
    }

    const { error } = await supabase
      .from('temp_classroom')
      .update({ name, description })
      .eq('crid', classroom?.crid);

    if (error) {
      alert('Failed to update classroom details.');
    } else {
      setClassroom({ crid: classroom!.crid, name, description });
      setIsEditing(false);
    }
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);

    const { data } = await supabase
      .from('temp_classroom')
      .select('crid')
      .eq('name', newName)
      .neq('crid', classroom?.crid);

    if (data && data.length > 0) {
      setErrorMessage('A classroom with this name already exists.');
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
            <h1 className="text-2xl font-bold mb-4 text-black">
              {isEditing ? 'Edit Classroom' : classroom.name}
            </h1>

            {isEditing ? (
              <>
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
                    onClick={() => {
                      setIsEditing(false);
                      setName(classroom.name);
                      setDescription(classroom.description);
                      setErrorMessage('');
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700 mb-4">{classroom.description}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Edit Classroom
                </button>
              </>
            )}

            {!isEditing && (
              <>
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded mt-4"
                >
                  Delete Classroom
                </button>

                <button
                  onClick={() => router.back()}
                  className="bg-gray-500 text-white px-4 py-2 rounded mt-4 ml-4"
                >
                  Back
                </button>
              </>
            )}

            {/* Add student section */}
            <div className="mt-6 border-t pt-4">
              <h2 className="text-lg font-semibold text-black mb-2">Add Student</h2>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="p-2 border rounded text-black"
                >
                  <option value="">Select a student</option>
                  {allChildren.map((child) => (
                    <option key={child.id} value={child.username}>
                      {child.fullname} ({child.username})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddStudent}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Add Student
                </button>
              </div>
            </div>

          {/* Student list */}
          <div className="mt-6 border-t pt-4">
            <h2 className="text-lg font-semibold text-black mb-2">Students in Classroom</h2>
            <ul className="list-disc pl-5 text-black">
              {classroomStudents.map((student) => (
                <li key={student.uaid_child} className="flex justify-between items-center">
                  <div>
                    {student.user_account.fullname} ({student.user_account.username}) - Status:{' '}
                    {student.invitation_status === InvitationStatus.Accepted
                      ? 'Accepted'
                      : 'Pending'}
                  </div>
                  <button
                    onClick={() => {
                      setStudentToRemove(student); // Save full student object
                      setShowConfirmModal(true);   // Show confirmation modal
                    }}
                    className="bg-red-500 text-white px-2 py-1 rounded ml-4"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-black">
                  Are you sure you want to remove {' '}
                  <span className="font-bold text-red-600">
                    {studentToRemove!.user_account.fullname}
                  </span> {' '}
                  from this classroom?
                  </h3>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="bg-gray-300 text-black px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRemoveStudent(studentToRemove!.uaid_child)} // Proceed with the removal
                    className="bg-green-500 text-white px-4 py-2 rounded-md"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

            {/* Delete confirmation modal */}
            {isConfirmingDelete && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-lg p-6 shadow-lg w-1/3">
                  <h2 className="text-lg font-semibold text-black mb-4">
                    Are you sure you want to delete this classroom?
                  </h2>
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={handleDelete}
                      className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded"
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
