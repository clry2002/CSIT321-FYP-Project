'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EduNavbar from '../../components/eduNavbar';
import { X } from 'lucide-react';

type AddedStudent = {
  id: string;
  fullname: string;
  username: string;
  email?: string;
};

export default function CreateClassroom() {
  const router = useRouter();
  const [classroomName, setClassroomName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [newClassroomId, setNewClassroomId] = useState<number | null>(null);
  
  // Student add form states
  const [studentEmail, setStudentEmail] = useState('');
  const [studentError, setStudentError] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addedStudents, setAddedStudents] = useState<AddedStudent[]>([]);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  
  // Real-time validation logic for classroom name
  useEffect(() => {
    const checkClassroomName = async () => {
      if (classroomName === '') {
        setErrorMessage('');
        return;
      }

      const { data: existingClassroom } = await supabase
        .from('temp_classroom')
        .select('name')
        .eq('name', classroomName)
        .single();
      
      if (existingClassroom) {
        setErrorMessage('Classroom name already exists. Please type another classroom name.');
      } else {
        setErrorMessage('');
      }
    };

    // Directly call the validation function without timeout
    checkClassroomName();
  }, [classroomName]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Get the current authenticated user
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(userError?.message || 'User not authenticated');
      }

      // Get the user_account ID
      const {
        data: userData,
        error: userAccountError
      } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userAccountError || !userData) {
        throw new Error(userAccountError?.message || 'Failed to fetch user account');
      }

      const uaid_educator = userData.id;

      // Check if classroom name already exists
      const { data: existingClassroom } = await supabase
        .from('temp_classroom')
        .select('name')
        .eq('name', classroomName)
        .single();

      if (existingClassroom) {
        setErrorMessage('Classroom name already exists. Please type another classroom name.');
        setLoading(false);
        return;
      }

      // Insert the classroom and get the returned ID
      const { data: newClassroom, error: insertError } = await supabase
        .from('temp_classroom')
        .insert([
          {
            name: classroomName,
            description,
            uaid_educator
          }
        ])
        .select('crid')
        .single();

      if (insertError || !newClassroom) {
        throw new Error(insertError?.message || 'Failed to create classroom');
      }

      // We don't create a discussion automatically - leave it for the educator to create

      // Show the success message and add student form
      setNewClassroomId(newClassroom.crid);
      setShowSuccessMessage(true);
      setLoading(false);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error creating classroom:', error);
        setErrorMessage(error.message || 'Failed to create classroom');
      } else {
        console.error('Unknown error:', error);
        setErrorMessage('Failed to create classroom');
      }
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentEmail) {
      setStudentError('Please enter a valid email.');
      return;
    }

    setAddingStudent(true);
    setStudentError('');

    try {
      // Normalize email to lowercase for case-insensitive comparison
      const normalizedEmail = studentEmail.trim().toLowerCase();

      // Step 1: Query the auth.users table via the Supabase function
      const { data: authUser, error: authError } = await supabase
        .rpc('get_user_by_email', { email: normalizedEmail });

      if (authError || !authUser || !authUser[0]?.id) {
        setStudentError('No user found for this email.');
        setAddingStudent(false);
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
        setAddingStudent(false);
        return;
      }

      // Step 3: Check if the profile type is 3 (student)
      if (userAccount.upid !== 3) {
        setStudentError('Only students can be added.');
        setAddingStudent(false);
        return;
      }

      // Step 4: Check if the student already exists in our local array
      if (addedStudents.some(student => student.id === userAccount.id)) {
        setStudentError('This student has already been added.');
        setAddingStudent(false);
        return;
      }

      // Step 5: Check if the email already exists in the temp_classroomstudents table
      const { data: existingStudent } = await supabase
        .from('temp_classroomstudents')
        .select('uaid_child')
        .eq('uaid_child', userAccount.id)
        .eq('crid', newClassroomId)
        .single();

      if (existingStudent) {
        setStudentError('This student has already been added to the classroom.');
        setAddingStudent(false);
        return;
      }

      // Step 6: Insert into temp_classroomstudents
      const { error: insertError } = await supabase
        .from('temp_classroomstudents')
        .insert({
          crid: newClassroomId,
          uaid_child: userAccount.id
        });

      if (insertError) {
        setStudentError('Failed to add student.');
        setAddingStudent(false);
        return;
      }

      // Add the student to our local array with full details
      setAddedStudents(prev => [...prev, {
        id: userAccount.id,
        fullname: userAccount.fullname,
        username: userAccount.username,
        email: studentEmail // Save email for reference
      }]);
      
      // Clear the form after successful addition
      setStudentEmail('');
      setStudentError('');
      
      // Show a temporary success message
      setStudentError('Student added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        if (setStudentError) setStudentError('');
      }, 3000);
      
    } catch (error) {
      console.error('Error adding student:', error);
      setStudentError('An error occurred while adding the student.');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      setRemovingStudent(studentId);
      
      // Remove from database
      const { error } = await supabase
        .from('temp_classroomstudents')
        .delete()
        .eq('crid', newClassroomId)
        .eq('uaid_child', studentId);
        
      if (error) {
        console.error('Error removing student:', error);
        return;
      }
      
      // Remove from local state
      setAddedStudents(prev => prev.filter(student => student.id !== studentId));
    } catch (err) {
      console.error('Error removing student:', err);
    } finally {
      setRemovingStudent(null);
    }
  };

  const handleFinish = () => {
    // Navigate to the classroom details page with discussion tab active and show popup
    if (newClassroomId) {
      // Use query parameters to:
      // 1. Set the active tab to discussions
      // 2. Trigger the welcome popup
      router.push(`/educator/classroom-details/${newClassroomId}?tab=discussions&showDiscussionPopup=true`);
    } else {
      router.push('/educatorpage');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        console.log('User not authenticated, redirecting to login');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <EduNavbar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-30 mt-20">
        {showSuccessMessage ? (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-green-600 mb-2">Classroom Created Successfully!</h2>
              <p className="text-gray-700">Your classroom {classroomName} has been created.</p>
            </div>
            
            {/* Add Student Form */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Students</h3>
              <p className="text-gray-600 mb-4">Invite students to join your classroom by entering their email addresses.</p>
              
              <div className="mb-4">
                <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Student Email
                </label>
                <div className="flex space-x-2">
                  <input
                    id="studentEmail"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => {
                      setStudentEmail(e.target.value);
                      if (studentError && studentError !== 'Student added successfully!') setStudentError('');
                    }}
                    placeholder="student@example.com"
                    className="flex-1 p-2 border rounded text-black"
                  />
                  <button
                    onClick={handleAddStudent}
                    disabled={addingStudent || !studentEmail}
                    className={`px-4 py-2 rounded ${
                      addingStudent || !studentEmail
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {addingStudent ? 'Adding...' : 'Add'}
                  </button>
                </div>
                {studentError && (
                  <div className={`mt-2 text-sm ${
                    studentError === 'Student added successfully!' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {studentError}
                  </div>
                )}
              </div>
              
              {/* Student List */}
              {addedStudents.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Added Students ({addedStudents.length})</h4>
                  <div className="bg-gray-50 rounded-md border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {addedStudents.map(student => (
                        <li key={student.id} className="flex justify-between items-center p-3">
                          <div>
                            <p className="font-medium text-gray-800">{student.fullname}</p>
                            <p className="text-sm text-gray-500">@{student.username}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(student.id)}
                            disabled={removingStudent === student.id}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                            aria-label={`Remove ${student.fullname}`}
                          >
                            {removingStudent === student.id ? (
                              <span className="text-sm">Removing...</span>
                            ) : (
                              <X size={18} />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleFinish}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                >
                  {addedStudents.length > 0 ? 'Continue to Classroom' : 'Skip for Now'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-serif text-black">Create Classroom</h1>
            </div>

            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="classroomName" className="text-gray-700">Classroom Name</label>
                  <input
                    id="classroomName"
                    type="text"
                    value={classroomName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassroomName(e.target.value)}
                    className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg text-black"
                    placeholder="Enter classroom name"
                    required
                  />
                </div>
                {errorMessage && (
                  <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                )}
                <div>
                  <label htmlFor="description" className="text-gray-700">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg text-black"
                    placeholder="Enter classroom description"
                    required
                  />
                </div>

                <div className="flex justify-end mt-4 gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()} 
                    className="bg-gray-300 text-black px-6 py-2 rounded-lg hover:bg-gray-400"
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Classroom'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}