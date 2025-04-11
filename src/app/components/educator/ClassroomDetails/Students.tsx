'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

type ChildUser = {
  id: string;
  username: string;
  fullname: string;
};

enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

type ClassroomStudent = {
  uaid_child: string;
  invitation_status: InvitationStatus;
  user_account: {
    username: string;
    fullname: string;
  };
};

type StudentsSectionProps = {
  classroomId: number;
  educatorId: string | null;
};

export default function StudentsSection({ classroomId, educatorId }: StudentsSectionProps) {
  const [allChildren, setAllChildren] = useState<ChildUser[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentError, setStudentError] = useState('');
  const [classroomStudents, setClassroomStudents] = useState<ClassroomStudent[]>([]);
  const [showRejected, setShowRejected] = useState(false);
  const [rejectedStudents, setRejectedStudents] = useState<ClassroomStudent[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<ClassroomStudent | null>(null);
  const [isConfirmingDismissRejected, setIsConfirmingDismissRejected] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const statusLabels = {
    [InvitationStatus.Accepted]: 'Accepted',
    [InvitationStatus.Pending]: 'Pending',
    [InvitationStatus.Rejected]: 'Rejected',
  };

  const toggleRejected = () => {
    setShowRejected(!showRejected);
  };

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
      .eq('crid', classroomId);

    if (!error && data) {
      // Check if the user_account exists before trying to access its properties
      const formattedData = data.map((item: any) => {
        if (item.user_account) {
          return {
            ...item,
            user_account: item.user_account,
          };
        } else {
          console.error('Missing user_account for uaid_child:', item.uaid_child);
          return {
            ...item,
            user_account: {
              username: 'Unknown',
              fullname: 'Unknown',
            },
          };
        }
      });

      // Separate accepted/pending and rejected students
      const acceptedPending = formattedData.filter(
        (item: any) => item.invitation_status !== InvitationStatus.Rejected
      );
      const rejected = formattedData.filter(
        (item: any) => item.invitation_status === InvitationStatus.Rejected
      );

      setClassroomStudents(acceptedPending);
      setRejectedStudents(rejected);
    } else {
      console.error('Failed to fetch classroom students:', error);
    }
  };

  useEffect(() => {
    fetchChildUsers();
    fetchClassroomStudents();
  }, [classroomId]);

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudentEmail(e.target.value);

    // Clear the error message when user starts typing
    if (studentError) {
      setStudentError('');
    }
  };

  const handleAddStudent = async () => {
    if (!studentEmail) {
      setStudentError('Please enter a valid email.');
      return;
    }

    // Step 1: Query the auth.users table via the Supabase function
    const { data: authUser, error: authError } = await supabase
      .rpc('get_user_by_email', { email: studentEmail });

    if (authError || !authUser || !authUser[0]?.id) {
      setStudentError('No user found for this email.');
      return;
    }

    const userId = authUser[0].id; // Access the id correctly from the array

    // Step 2: Use the authUser[0].id to query the user_account table
    const { data: userAccount, error: uaError } = await supabase
      .from('user_account')
      .select('id, username, fullname, upid')
      .eq('user_id', userId)
      .single();

    if (uaError || !userAccount) {
      setStudentError('No user account found for this email.');
      return;
    }

    // Step 3: Check if the profile type is 3 (student)
    if (userAccount.upid !== 3) {
      setStudentError('Only students can be added.');
      return;
    }

    // Step 4: Check if the email already exists in the temp_classroomstudents table
    const { data: existingStudent } = await supabase
      .from('temp_classroomstudents')
      .select('uaid_child')
      .eq('uaid_child', userAccount.id)
      .eq('crid', classroomId)
      .single();

    if (existingStudent) {
      setStudentError('This student has been added to the classroom.');
      return;
    }

    // Step 4: Insert into temp_classroomstudents
    const { error: insertError } = await supabase
      .from('temp_classroomstudents')
      .insert({
        crid: classroomId,
        uaid_child: userAccount.id
      });

    if (insertError) {
      setStudentError('Failed to add student.');
    } else {
      setStudentEmail('');
      fetchClassroomStudents();
      setShowAddStudentModal(false);
    }
  };

  // Dismiss rejected students functionality
  const handleDismissRejected = async () => {
    setIsConfirmingDismissRejected(true);
  };

  // Confirm and dismiss rejected students
  const confirmDismissRejected = async () => {
    if (!educatorId) {
      setStudentError('Educator ID is not available.');
      console.error('Educator ID is not set');
      setIsConfirmingDismissRejected(false);
      return;
    }

    try {
      // Call the PostgreSQL function
      const { error } = await supabase
        .rpc('delete_rejected_classroom_students_v2', {
          classroom_id: classroomId,
          educator_id: educatorId
        });

      if (error) {
        setStudentError('Failed to dismiss rejected students.');
        console.error('Error dismissing rejected students:', error);
      } else {
        console.log('Successfully dismissed rejected students');
        fetchClassroomStudents();
        setShowRejected(false);
        setRejectedStudents([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setStudentError('An error occurred while dismissing students.');
    } finally {
      // Hide confirmation UI
      setIsConfirmingDismissRejected(false);
    }
  };

  const handleRemoveStudent = async (uaid_child: string | null) => {
    if (!uaid_child) return;

    // Remove the student from the classroom
    const { error } = await supabase
      .from('temp_classroomstudents')
      .delete()
      .eq('crid', classroomId)
      .eq('uaid_child', uaid_child);

    if (error) {
      setStudentError('Failed to remove student.');
    } else {
      fetchClassroomStudents();
    }

    setShowConfirmModal(false);
  };

  return (
    <div className="mt-4">
      {/* Validates whether student accounts have been created */}
      <div className="mt-4">
        {allChildren.length === 0 && (
          <h2 className="text-red-600">There are no student accounts created yet. Please ask your students to register for an account.</h2>
        )}
      </div>

      {/* Student list */}
      <div className="mt-6 border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">Students in Classroom</h2>
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Add Student
          </button>
        </div>
        
        {classroomStudents.length > 0 ? (
          <ul className="list-disc pl-5 text-black">
            {classroomStudents.map((student) => (
              <li key={student.uaid_child} className="flex justify-between items-center mb-2">
                <div>
                  {student.user_account.fullname} ({student.user_account.username}) - Status:{' '}
                  <span className="font-medium">
                    {statusLabels[student.invitation_status] || 'Unknown'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStudentToRemove(student);
                    setShowConfirmModal(true);
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded ml-4"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-600 mb-6">No students have been added to your classroom yet. Please add students to get started.</p>
          </div>
        )}
      </div>

      {/* Rejected students section */}
<div className="mt-6 border-t pt-4">
  <div className="flex items-center mb-2">
    <span
      onClick={toggleRejected}
      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center"
    >
      {showRejected ? (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Hide Rejected Students
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show Rejected Students ({rejectedStudents.length})
        </>
      )}
    </span>
  </div>
  
  {showRejected && (
    <div className={`mt-2 rounded-lg border ${rejectedStudents.length > 0 ? 'border-red-100' : 'border-gray-200'} overflow-hidden transition-all duration-300`}>
      {rejectedStudents.length > 0 ? (
        <>
          <div className="bg-red-50 px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium text-red-800">Rejected Students</h3>
            <button
              onClick={handleDismissRejected}
              className="text-red-600 hover:text-red-800 text-sm hover:underline focus:outline-none"
            >
              Dismiss All
            </button>
          </div>
          
          <div className="bg-white">
            <ul className="divide-y divide-gray-100">
              {rejectedStudents.map((student) => (
                <li key={student.uaid_child} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-red-100 text-red-800 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      {student.user_account.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{student.user_account.fullname}</p>
                      <p className="text-sm text-gray-500">@{student.user_account.username}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 px-4 py-6 text-center text-gray-500">
          No rejected students to display
        </div>
      )}
      
      {/* Confirmation UI for dismissing all rejected students */}
      {isConfirmingDismissRejected && (
        <div className="bg-red-50 p-4 border-t border-red-100">
          <p className="text-gray-700 mb-3">Are you sure you want to dismiss all rejected students?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsConfirmingDismissRejected(false)}
              className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDismissRejected}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Yes, Dismiss All
            </button>
          </div>
        </div>
      )}
    </div>
  )}
</div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
       <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">Add Student</h3>
              <button 
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentEmail('');
                  setStudentError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="email"
                value={studentEmail}
                onChange={handleEmailChange}
                placeholder="Enter student email"
                className="p-2 border rounded text-black w-full"
              />
              {studentError && (
                <div className="text-red-600 mt-2 text-sm">
                  {studentError}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setStudentEmail('');
                  setStudentError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded text-black"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Student Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
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
                onClick={() => handleRemoveStudent(studentToRemove!.uaid_child)}
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}