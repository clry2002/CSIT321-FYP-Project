'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import Navbar from '../../components/Navbar'; 
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

type Classroom = {
  crid: number;
  name: string;
  description: string;
  educatorFullName: string;
  cid: number | null; // Allow cid to be null
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState<string | null>(null); 
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { id } = useParams(); 
  const router = useRouter(); 

  // Combined authentication and data loading process
  useEffect(() => {
    console.log("Starting authentication and data loading process...");
    
    const loadClassroomData = async () => {
      setIsLoading(true);
      
      try {
        // Check user authentication
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authData?.user) {
          console.error('Authentication error:', authError);
          setIsLoading(false);
          return;
        }
        
        console.log("User authenticated, fetching user account ID...");
        
        // Retrieve user account ID
        const { data: userAccountData, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();
        
        if (userAccountError || !userAccountData) {
          console.error('Error fetching user account:', userAccountError);
          setIsLoading(false);
          return;
        }
        
        const currentUserAccountId = userAccountData.id;
        setUserAccountId(currentUserAccountId);
        console.log(`User account ID: ${currentUserAccountId}`);
        
        // Check classroom access
        const { data: invitationData, error: invitationError } = await supabase
          .from('temp_classroomstudents')
          .select('uaid_child, invitation_status')
          .eq('crid', id)
          .eq('uaid_child', currentUserAccountId)
          .single();
        
        if (invitationError || !invitationData) {
          console.error('Invitation check error:', invitationError);
          setError('No invitation found for this classroom');
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        
        const { invitation_status } = invitationData;
        if (invitation_status === 'pending' || invitation_status === 'null' || invitation_status === 'rejected') {
          console.log(`Access denied. Invitation status: ${invitation_status}`);
          setError(`Your invitation status is ${invitation_status}. Access denied.`);
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
      
        setHasAccess(true);
        console.log("Access granted, fetching classroom data...");
        
        // Retrieve classroom details
        const { data: classroomData, error: classroomError } = await supabase
          .from('temp_classroom')
          .select('crid, name, description, uaid_educator, cid')
          .eq('crid', id)
          .single();
        
        if (classroomError) {
          console.error('Classroom data error:', classroomError);
          setError('Failed to fetch classroom details');
          setIsLoading(false);
          return;
        }
        
        // Retrieve educator details
        const { data: educatorData, error: educatorError } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', classroomData.uaid_educator)
          .single();
        
        if (educatorError) {
          console.error('Educator data error:', educatorError);
          setError('Failed to fetch educator details');
          setIsLoading(false);
          return;
        }
        
        // Set classroom data
        setClassroom({
          crid: classroomData.crid,
          name: classroomData.name,
          description: classroomData.description,
          educatorFullName: educatorData?.fullname || 'Unknown Educator',
          cid: classroomData.cid
        });
        
        // Retrieve content if available
        if (classroomData.cid !== null) {
          console.log(`Fetching content for CID: ${classroomData.cid}`);
          
          const { data: contentData, error: contentError } = await supabase
            .from('temp_content')
            .select('coverimage, title, cfid, contenturl')
            .eq('cid', classroomData.cid)
            .single();
          
          if (contentError) {
            console.error('Content data error:', contentError);
            // Don't set error - classroom can exist without content
          } else if (contentData) {
            setContent({
              coverimage: contentData.coverimage,
              title: contentData.title,
              cfid: contentData.cfid,
              contenturl: contentData.contenturl,
            });
          }
        }
        
        console.log("All data loaded successfully");
      } catch (err) {
        console.error('Unexpected error during data loading:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClassroomData();
  }, [id]);

  const handleRedirectToDetail = (cid: number, cfid: number) => {
    if (cfid === 1) {
      router.push(`/videodetail/${cid}`);
    } else if (cfid === 2) {
      router.push(`/bookdetail/${cid}`);
    }
  };

  // Display loading state when page is loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-blue-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-2xl text-blue-600">Loading Classroom...</div>
          </div>
        </div>
      </div>
    );
  }

  // Display error message if any
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

  // Check if user is authenticated
  if (!userAccountId) {
    return (
      <div className="flex flex-col h-screen bg-yellow-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-yellow-600">You must be logged in to view this classroom.</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user has access to the classroom
  if (hasAccess === false) {
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

  // Check if classroom data was fetched
  if (!classroom) {
    return (
      <div className="flex flex-col h-screen bg-yellow-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-yellow-600">No classroom found.</div>
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

          {/* Display content only if cid is not null */}
          {classroom.cid !== null && content && (
            <>
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
                    onClick={() => classroom.cid !== null && handleRedirectToDetail(classroom.cid, content.cfid)}
                    className="mt-4 text-2xl text-blue-600 font-semibold text-center cursor-pointer"
                  >
                    {content.title}
                  </h4>
                </div>
              ) : (
                <div className="mt-6">
                  <h4 className="text-xl font-semibold text-gray-600 mb-2">Books to read!</h4>
                  <Image
                    src={content.coverimage}
                    width={500}
                    height={667}
                    alt={content.title}
                    className="rounded-lg"
                    style={{ 
                      objectFit: 'contain',
                      width: '100%',
                      height: 'auto'
                    }}
                  />
                  <h4
                    onClick={() => classroom.cid !== null && handleRedirectToDetail(classroom.cid, content.cfid)}
                    className="mt-4 text-2xl text-blue-600 font-semibold text-center cursor-pointer"
                  >
                    {content.title}
                  </h4>
                </div>
              )}
            </>
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