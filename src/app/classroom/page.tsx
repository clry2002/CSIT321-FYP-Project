'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// import { useUser } from '@supabase/auth-helpers-react';
import Navbar from '../components/Navbar';
import ChatBot from '../components/ChatBot';
import { useRouter } from 'next/navigation'; // Import useRouter

type Classroom = {
  crid: number;
  name: string;
  description: string;
  invitation_status: 'pending' | 'accepted' | 'rejected';
  educatorFullName?: string;
};


type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
};

export default function ClassroomPage() {
 // const user = useUser();
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [invitedClassrooms, setInvitedClassrooms] = useState<Classroom[]>([]);
  const [activeClassrooms, setActiveClassrooms] = useState<Classroom[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(false);
  // const [loading, setLoading] = useState(true);
  const [, setLoading] = useState(true);
  const [userState, setUserState] = useState<SupabaseUser | null>(null);

  const router = useRouter(); // Initialize useRouter hook

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetched user:', user);
      if (user) {
        setUserState(user);
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUserState(session?.user || null);
        console.log('User onAuthStateChange:', session?.user);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!userState || !userState.id) return;

    const fetchUserAccountId = async () => {
      try {
        console.log('Fetching user account ID...');
        const { data, error } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', userState.id)
          .single();

        if (error) throw error;

        console.log('User account ID fetched:', data?.id);
        setUserAccountId(data?.id || null);
      } catch (err) {
        console.error('Error fetching user account ID:', err instanceof Error ? err.message : err);
      }
    };

    fetchUserAccountId();
  }, [userState]);

  useEffect(() => {
    if (!userAccountId) return;

    const fetchInvitedClassrooms = async () => {
      setLoadingInvited(true);
      try {
        console.log('Fetching invited classrooms for user account ID:', userAccountId);
        const { data: invites, error: inviteError } = await supabase
          .from('temp_classroomstudents')
          .select('crid, invitation_status')
          .eq('uaid_child', userAccountId);

        if (inviteError) throw inviteError;

        console.log('Fetched invited classrooms:', invites);

        const classroomIds = invites?.map(i => i.crid) || [];
       // const invitationStatuses = invites?.map(i => i.invitation_status) || [];

        if (classroomIds.length === 0) {
          console.log('No invited classrooms found.');
          setInvitedClassrooms([]);
        } else {
          // Fetch classroom data along with invitation status and educator
          const { data: classroomData, error: classError } = await supabase
            .from('temp_classroom')
            .select('crid, name, description, uaid_educator')
            .in('crid', classroomIds);

          if (classError) throw classError;

          console.log('Fetched classroom data:', classroomData);

          // Fetch educator fullname based on uaid_educator
          const classroomsWithEducatorFullName = await Promise.all(classroomData?.map(async (classroom) => {
            const { data: educatorData, error: educatorError } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('id', classroom.uaid_educator)
              .single();

            if (educatorError) throw educatorError;

            return {
              ...classroom,
              educatorFullName: educatorData?.fullname || 'Unknown Educator',
              invitation_status: invites.find(invite => invite.crid === classroom.crid)?.invitation_status || 'pending',
            };
          })) || [];

          // Filter classrooms based on invitation status
          setInvitedClassrooms(classroomsWithEducatorFullName.filter(classroom => classroom.invitation_status === 'pending'));
          setActiveClassrooms(classroomsWithEducatorFullName.filter(classroom => classroom.invitation_status === 'accepted'));
        }
      } catch (err) {
        console.error('Error fetching invited classrooms:', err instanceof Error ? err.message : err);
        setInvitedClassrooms([]);
      } finally {
        setLoadingInvited(false);
      }
    };

    fetchInvitedClassrooms();
  }, [userAccountId]);

  // Handle accepting the invitation
  const handleAcceptInvitation = async (crid: number) => {
    try {
      const { error } = await supabase
        .from('temp_classroomstudents')
        .update({ invitation_status: 'accepted' })
        .eq('uaid_child', userAccountId)
        .eq('crid', crid);

      if (error) throw error;

      // Update the state immediately to reflect the accepted status
      setInvitedClassrooms(prev => prev.filter(classroom => classroom.crid !== crid));
      const acceptedClassroom = invitedClassrooms.find(classroom => classroom.crid === crid);
      if (acceptedClassroom) {
        setActiveClassrooms(prev => [...prev, { ...acceptedClassroom, invitation_status: 'accepted' }]);
      }
      console.log('Invitation accepted for classroom:', crid);
    } catch (err) {
      console.error('Error accepting invitation:', err instanceof Error ? err.message : err);
    }
  };

  const handleRejectInvitation = async (crid: number) => {
    const confirmReject = window.confirm('Are you sure you want to decline this classroom invitation?');
    if (!confirmReject) return;
  
    try {
      const { error } = await supabase
        .from('temp_classroomstudents')
        .update({ invitation_status: 'rejected' })
        .eq('uaid_child', userAccountId)
        .eq('crid', crid);
  
      if (error) throw error;
  
      // Remove the rejected classroom from both sections
      setInvitedClassrooms(prev => prev.filter(classroom => classroom.crid !== crid));
      setActiveClassrooms(prev => prev.filter(classroom => classroom.crid !== crid));
      console.log('Invitation rejected for classroom:', crid);
    } catch (err) {
      console.error('Error rejecting invitation:', err instanceof Error ? err.message : err);
    }
  };  

  // Redirect to the classroom board when a user clicks on an active classroom
  const handleClassroomClick = (crid: number) => {
    router.push(`/classroomboard/${crid}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-30 px-6 pb-6">
        <h2 className="text-2xl font-serif mb-6 text-black">Classrooms</h2>

        {/* Active Classrooms Section */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-3 text-blue-700">Active Classrooms</h3>
          {activeClassrooms.length > 0 ? (
            <div className="space-y-4">
              {activeClassrooms.map((classroom) => (
                <div 
                  key={classroom.crid} 
                  className="bg-white shadow-md rounded-lg p-4 cursor-pointer" 
                  onClick={() => handleClassroomClick(classroom.crid)} // Add click handler
                >
                  <h4 className="text-lg font-bold text-blue-600">{classroom.name}</h4>
                  <p className="text-sm text-gray-600">Description: {classroom.description}</p>
                  <p className="text-sm text-gray-600">Managed by: {classroom.educatorFullName}</p>
                  {/* Invitation Status is not displayed in Active Classrooms */}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">You don&apos;t have any active classrooms.</p>
          )}
        </div>

        {/* Invited Classrooms Section */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold mb-3 text-green-700">Invited Classrooms</h3>
          {loadingInvited && invitedClassrooms.length === 0 ? (
            <p className="text-gray-400">Loading invited classrooms...</p>
          ) : invitedClassrooms.length > 0 ? (
            <div className="space-y-4">
              {invitedClassrooms.map((classroom) => (
                <div key={classroom.crid} className="bg-white shadow-md rounded-lg p-4">
                  <h4 className="text-lg font-bold text-blue-600">{classroom.name}</h4>
                  <p className="text-sm text-gray-600">Teacher: {classroom.description}</p>
                  <p className="text-sm text-gray-600">Invitation Status: {classroom.invitation_status}</p>
                  <p className="text-sm text-gray-600">Managed by: {classroom.educatorFullName}</p>
                  {classroom.invitation_status === 'pending' && (
                    <div className="flex space-x-4 mt-4">
                      <button
                        className="px-4 py-2 bg-green-500 text-white rounded"
                        onClick={() => handleAcceptInvitation(classroom.crid)}
                      >
                        Accept
                      </button>
                      <button
                        className="px-4 py-2 bg-red-500 text-white rounded"
                        onClick={() => handleRejectInvitation(classroom.crid)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !loadingInvited && <p className="text-gray-400">You don&apos;t have any invites.</p>
          )}
        </div>
      </div>
      <ChatBot />
    </div>
  );
}
  