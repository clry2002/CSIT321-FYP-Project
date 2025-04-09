'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '../../components/Navbar'; // Import Navbar component
import { useParams } from 'next/navigation'; 
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
  const [userAccountId, setUserAccountId] = useState<string | null>(null); // State for User Account ID
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false); // To check user authentication
  const [hasAccess, setHasAccess] = useState(false); // To check if the user can access the classroom
  const { id } = useParams(); // Getting the dynamic 'id' from URL params

  // Fetch user account data function
  useEffect(() => {
    const fetchUserAccountId = async () => {
      try {
        // Using getUser() to fetch the current user
        const { data, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!data?.user) {
          console.log('No authenticated user found.');
          setIsUserAuthenticated(false); // Mark as not authenticated
          return;
        }

        setIsUserAuthenticated(true); // User is authenticated

        console.log('Authenticated User:', data.user);

        // Now fetch the user account ID from the database
        const { data: userAccountData, error } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', data.user.id) // Fetch based on the current authenticated user
          .single();

        if (error) {
          throw error;
        }

        if (userAccountData) {
          setUserAccountId(userAccountData?.id);
          console.log('Fetched User Account ID:', userAccountData?.id);
        } else {
          console.log('No user account found for this user');
          setUserAccountId(null);
        }
      } catch (err) {
        console.error('Error fetching user account ID:', err instanceof Error ? err.message : err);
      }
    };

    fetchUserAccountId();
  }, []); // Run once when the component mounts

  // Fetch classroom details and check invitation status
  useEffect(() => {
    const fetchClassroomDetails = async () => {
      if (!id || !userAccountId) return;

      try {
        const { data, error } = await supabase
          .from('temp_classroom') // The table where classroom details are stored
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

        // Check if the user has access (match `uaid_child` and invitation status is 'accepted')
        const { data: invitationData, error: invitationError } = await supabase
          .from('temp_classroomstudents')
          .select('uaid_child, invitation_status')
          .eq('crid', id) 
          .eq('uaid_child', userAccountId)
          .single();

        if (invitationError || !invitationData) {
          setError('No accepted invitation found or error: ' + invitationError?.message);
          setLoading(false);
          return;
        }

        // Check invitation status
        const { invitation_status } = invitationData;
        if (invitation_status === 'pending') {
          setError('Your invitation status is not accepted. Please check your invitation.');
          setLoading(false);
          return;
        }

        // For 'null' or 'rejected', set the error to indicate no access
        if (invitation_status === 'null' || invitation_status === 'rejected') {
          setError('Classroom does not exist / You do not have access to this classroom.');
          setLoading(false);
          return;
        }

        setHasAccess(true); // User has access if all conditions match
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch classroom details');
        setLoading(false);
      }
    };

    fetchClassroomDetails();
  }, [id, userAccountId]); // Re-run when `id` or `userAccountId` changes

  if (!isUserAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-yellow-100">
        <div className="text-2xl text-yellow-600">You must be logged in to view this classroom.</div>
      </div>
    );
  }

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

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-100">
        <div className="text-2xl text-red-600">You do not have access to this classroom.</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
