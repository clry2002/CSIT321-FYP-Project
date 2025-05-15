'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/app/components/Navbar';
import ChatBot from '@/app/components/ChatBot';
import { useRouter } from 'next/navigation';

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
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [invitedClassrooms, setInvitedClassrooms] = useState<Classroom[]>([]);
  const [activeClassrooms, setActiveClassrooms] = useState<Classroom[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [, setLoading] = useState(true);
  const [userState, setUserState] = useState<SupabaseUser | null>(null);
  const [dataFetched, setDataFetched] = useState(false);

  const router = useRouter();

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
      setLoadingActive(true);
      try {
        console.log('Fetching invited classrooms for user account ID:', userAccountId);
        const { data: invites, error: inviteError } = await supabase
          .from('temp_classroomstudents')
          .select('crid, invitation_status')
          .eq('uaid_child', userAccountId);

        if (inviteError) throw inviteError;

        console.log('Fetched invited classrooms:', invites);

        const classroomIds = invites?.map(i => i.crid) || [];

        if (classroomIds.length === 0) {
          console.log('No invited classrooms found.');
          setInvitedClassrooms([]);
          setActiveClassrooms([]);
        } else {
          const { data: classroomData, error: classError } = await supabase
            .from('temp_classroom')
            .select('crid, name, description, uaid_educator')
            .in('crid', classroomIds);

          if (classError) throw classError;

          console.log('Fetched classroom data:', classroomData);

          const classroomsWithEducatorFullName = await Promise.all(classroomData?.map(async (classroom) => {
            const { data: educatorData, error: educatorError } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('id', classroom.uaid_educator)
              .single();

            if (educatorError) throw educatorError;

            return {
              ...classroom,
              educatorFullName: educatorData?.fullname || 'Unknown Teacher', // Keep "Teacher"
              invitation_status: invites.find(invite => invite.crid === classroom.crid)?.invitation_status || 'pending',
            };
          })) || [];

          setInvitedClassrooms(classroomsWithEducatorFullName.filter(classroom => classroom.invitation_status === 'pending'));
          setActiveClassrooms(classroomsWithEducatorFullName.filter(classroom => classroom.invitation_status === 'accepted'));
        }
      } catch (err) {
        console.error('Error fetching invited classrooms:', err instanceof Error ? err.message : err);
        setInvitedClassrooms([]);
        setActiveClassrooms([]);
      } finally {
        setLoadingInvited(false);
        setLoadingActive(false);
        setDataFetched(true);
      }
    };

    fetchInvitedClassrooms();
  }, [userAccountId]);

  const handleAcceptInvitation = async (crid: number) => {
    try {
      const { error } = await supabase
        .from('temp_classroomstudents')
        .update({ invitation_status: 'accepted' })
        .eq('uaid_child', userAccountId)
        .eq('crid', crid);

      if (error) throw error;

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
    const confirmReject = window.confirm('Are you sure you want to decline this classroom invitation?'); // Keep "classroom invitation"
    if (!confirmReject) return;

    try {
      const { error } = await supabase
        .from('temp_classroomstudents')
        .update({ invitation_status: 'rejected' })
        .eq('uaid_child', userAccountId)
        .eq('crid', crid);

      if (error) throw error;

      setInvitedClassrooms(prev => prev.filter(classroom => classroom.crid !== crid));
      setActiveClassrooms(prev => prev.filter(classroom => classroom.crid !== crid));
      console.log('Invitation rejected for classroom:', crid);
    } catch (err) {
      console.error('Error rejecting invitation:', err instanceof Error ? err.message : err);
    }
  };

  const handleClassroomClick = (crid: number) => {
    router.push(`/classroomboard/${crid}`);
  };

  // Custom loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-6">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400"></div>
      <span className="ml-3 text-gray-300">Loading...</span>
    </div>
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        backgroundImage: 'url("/stars.png")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-20 px-6 pb-6 bg-black/30 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-white mb-8 text-center mt-10">Your Classrooms</h2>

        {/* Active Classrooms Section */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-yellow-400 mb-4 flex items-center">
            Active Classrooms
          </h3>
          {loadingActive ? (
            <LoadingSpinner />
          ) : activeClassrooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeClassrooms.map((classroom) => (
                <div
                  key={classroom.crid}
                  className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl p-6 cursor-pointer hover:scale-105 transition duration-300"
                  onClick={() => handleClassroomClick(classroom.crid)}
                >
                  <h4 className="text-xl font-bold text-indigo-700 mb-2">{classroom.name}</h4>
                  <p className="text-sm text-gray-700 mb-2">Description: {classroom.description}</p> {/* Keep "Description" */}
                  <p className="text-sm text-gray-700">Teacher: {classroom.educatorFullName}</p> {/* Keep "Teacher" */}
                  <div className="mt-3 text-right">
                    <span className="inline-flex items-center bg-indigo-200 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      Ready to Explore! {/* Slightly more active wording */}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            dataFetched && <p className="text-gray-400">You don&apos;t have any active classrooms.</p>
          )}
        </div>

        {/* Invited Classrooms Section */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-cyan-400 mb-4 flex items-center">
            Classroom Invitations
          </h3>
          {loadingInvited ? (
            <LoadingSpinner />
          ) : invitedClassrooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitedClassrooms.map((classroom) => (
                <div key={classroom.crid} className="bg-white/80 backdrop-blur-sm shadow-md rounded-xl p-6">
                  <h4 className="text-xl font-bold text-purple-700 mb-2">{classroom.name}</h4>
                  <p className="text-sm text-gray-700 mb-2">Teacher: {classroom.description}</p>
                  <p className="text-sm text-gray-700 mb-3">Invitation Status: <span className={`font-semibold ${classroom.invitation_status === 'pending' ? 'text-orange-500' : classroom.invitation_status === 'accepted' ? 'text-green-500' : 'text-red-500'}`}>{classroom.invitation_status === 'pending' ? 'Pending' : classroom.invitation_status === 'accepted' ? 'Accepted' : 'Rejected'}</span></p> {/* Keep original statuses */}
                  <p className="text-sm text-gray-700">Managed by: {classroom.educatorFullName}</p>
                  {classroom.invitation_status === 'pending' && (
                    <div className="flex space-x-4 mt-4">
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition duration-200"
                        onClick={() => handleAcceptInvitation(classroom.crid)}
                      >
                        Accept
                      </button>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-200"
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
            dataFetched && <p className="text-gray-400">You don&apos;t have any invites.</p>
          )}
        </div>
      </div>
      <ChatBot />
    </div>
  );
}