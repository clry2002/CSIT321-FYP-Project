'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import Navbar from '../../components/Navbar'; 
import { useParams, useRouter } from 'next/navigation'; 

type Classroom = {
  crid: number;
  name: string;
  description: string;
  educatorFullName: string;
  cid: number; 
};

type Content = {
  coverimage: string; 
  title: string; 
  cfid: number; 
  contenturl: string; 
};

export default function ClassroomBoardPage() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [content, setContent] = useState<Content | null>(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState<string | null>(null); 
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false); 
  const [hasAccess, setHasAccess] = useState(false); 
  const { id } = useParams(); 
  const router = useRouter(); 

  useEffect(() => {
    const fetchUserAccountId = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!data?.user) {
          setIsUserAuthenticated(false);
          return;
        }

        setIsUserAuthenticated(true);
        const { data: userAccountData, error } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (error) throw error;

        if (userAccountData) setUserAccountId(userAccountData.id);
      } catch (err) {
        console.error('Error fetching user account ID:', err instanceof Error ? err.message : err);
      }
    };

    fetchUserAccountId();
  }, []);

  useEffect(() => {
    const fetchClassroomDetails = async () => {
      if (!id || !userAccountId) return;

      try {
        const { data, error } = await supabase
          .from('temp_classroom')
          .select('crid, name, description, uaid_educator, cid')
          .eq('crid', id)
          .single();

        if (error) throw error;

        const educatorData = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', data.uaid_educator)
          .single();

        if (educatorData.error) throw educatorData.error;

        setClassroom({
          crid: data.crid,
          name: data.name,
          description: data.description,
          educatorFullName: educatorData.data?.fullname || 'Unknown Educator',
          cid: data.cid,
        });

        const { data: contentData, error: contentError } = await supabase
          .from('temp_content')
          .select('coverimage, title, cfid, contenturl')
          .eq('cid', data.cid)
          .single();

        if (contentError) throw contentError;

        if (contentData) {
          setContent({
            coverimage: contentData.coverimage,
            title: contentData.title,
            cfid: contentData.cfid,
            contenturl: contentData.contenturl,
          });
        }

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

        const { invitation_status } = invitationData;
        if (invitation_status === 'pending') {
          setError('Your invitation status is not accepted.');
          setLoading(false);
          return;
        }

        if (invitation_status === 'null' || invitation_status === 'rejected') {
          setError('You do not have access to this classroom.');
          setLoading(false);
          return;
        }

        setHasAccess(true);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch classroom details');
        setLoading(false);
      }
    };

    fetchClassroomDetails();
  }, [id, userAccountId]);

  const handleRedirectToDetail = (cid: number, cfid: number) => {
    if (cfid === 1) {
      router.push(`/videodetail/${cid}`);
    } else if (cfid === 2) {
      router.push(`/bookdetail/${cid}`);
    }
  };

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
      <div className="flex flex-col h-screen bg-red-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-red-600 text-center">{error}</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/classroom')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-screen bg-red-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-red-600 text-center">You do not have access to this classroom.</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/classroom')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!classroom || !content) {
    return (
      <div className="flex justify-center items-center h-screen bg-yellow-100">
        <div className="text-2xl text-yellow-600">No classroom or content found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 overflow-hidden">
      <Navbar />

      <div className="flex-1 overflow-y-auto pt-30 px-6 pb-6">
        <h2 className="text-4xl font-bold text-center text-blue-700 mb-6">Welcome to Your Classroom!</h2>

        <div className="bg-white shadow-lg rounded-xl p-8 max-w-xl mx-auto">
          <div className="flex items-center mb-6">
            <span className="text-4xl text-yellow-500 mr-4">👨‍🏫</span>
            <h3 className="text-3xl font-semibold text-blue-600">{classroom.name}</h3>
          </div>

          <h4 className="text-sm font-bold text-gray-600 mb-2">Description</h4>
          <p className="text-lg text-gray-700">{classroom.description}</p>

          <div className="flex justify-between items-center mt-6">
            <div>
              <span className="text-sm font-bold text-gray-600">Managed by</span>
              <h4 className="text-lg font-medium text-gray-600">{classroom.educatorFullName}</h4>
            </div>
          </div>

          {content.cfid === 1 ? (
            <div className="mt-6">
              <h4 className="text-xl font-semibold text-gray-600 mb-2">Videos to watch!</h4>
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${content.contenturl.split('v=')[1]}`}
                  title={content.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-[280px] rounded-lg"
                />
              </div>
              <h4
                onClick={() => handleRedirectToDetail(classroom.cid, content.cfid)}
                className="mt-4 text-2xl text-blue-600 font-semibold text-center cursor-pointer"
              >
                {content.title}
              </h4>
            </div>
          ) : (
            <div className="mt-6">
              <h4 className="text-xl font-semibold text-gray-600 mb-2">Books to read!</h4>
              <img
                src={content.coverimage}
                alt={content.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              <h4
                onClick={() => handleRedirectToDetail(classroom.cid, content.cfid)}
                className="mt-4 text-2xl text-blue-600 font-semibold text-center cursor-pointer"
              >
                {content.title}
              </h4>
            </div>
          )}

          {/* View Discussion Board Section */}
          <div className="mt-10 text-center">
            <h4 className="text-xl font-semibold text-gray-700 mb-4">Want to discuss with your classmates?</h4>
            <button
              onClick={() => router.push(`/classroomboard/${id}/discussion`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl text-lg hover:bg-purple-700 transition duration-200"
            >
              View Discussion Board 💬
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
