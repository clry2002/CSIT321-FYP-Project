'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import EduNavbar from '../../../components/eduNavbar';
import '../../../components/styles.css';
import DeleteClassroom from '../../../components/educator/DeleteClassroom';
import { Pencil, Check, X, MessageCircle, Bell, Users } from 'lucide-react';

// Import section components
import StudentsSection from '../../../components/educator/ClassroomDetails/Students';
// Import the DiscussionBoardSection instead of the page
import { DiscussionBoardSection } from '../../discussionBoard/page';
import AnnouncementBoardSection from '../../../components/educator/ClassroomDetails/AnnouncementBoard';

type Classroom = {
  crid: number;
  name: string;
  description: string;
};

// Define tabs
enum TabType {
  STUDENTS = 'students',
  DISCUSSIONS = 'discussions',
  ANNOUNCEMENTS = 'announcements',
}

export default function ClassroomDetails() {
  // Rest of component stays the same...
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  // const [errorMessage, setErrorMessage] = useState('');
  const [, setErrorMessage] = useState('');
  const [educatorId, setEducatorId] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(TabType.STUDENTS);
  
  // Classroom editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const router = useRouter();
  const { crid } = useParams();

  useEffect(() => {
    fetchEducatorId();

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
    }
    setLoading(false);
  };
  
  fetchClassroomDetails();
}, [crid]);

  const fetchEducatorId = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
  
      if (!user || error) {
        setErrorMessage('Failed to fetch user session.');
        return;
      }
  
      // Query the user_account table for the educator with Upid = 5
      const { data, error: uaError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 5) 
        .single();
  
      if (uaError || !data) {
        setErrorMessage('Failed to fetch educator account.');
        console.error('Error fetching educator:', uaError);
        return;
      }
  
      // Set the educator ID if it exists
      setEducatorId(data.id);
    } catch (error) {
      console.error('Error in fetchEducatorId:', error);
      setErrorMessage('An error occurred while fetching the educator ID.');
    }
  };

  // Function to navigate back to home page
  const handleBackClick = () => {
    router.push('/teacherpage');
  };

  // Function to handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Function to start editing classroom details
  const handleEdit = () => {
    setIsEditing(true);
    setEditedName(classroom?.name || '');
    setEditedDescription(classroom?.description || '');
    setNameError('');
  };

  // Function to save classroom details changes
  const handleSaveChanges = async () => {
    if (!editedName.trim()) {
      setNameError('Classroom name cannot be empty');
      return;
    }

    // Check if name already exists
    const { data } = await supabase
      .from('temp_classroom')
      .select('crid')
      .eq('name', editedName)
      .neq('crid', classroom?.crid);

    if (data && data.length > 0) {
      setNameError('A classroom with this name already exists.');
      return;
    }

    if (classroom) {
      const { error } = await supabase
        .from('temp_classroom')
        .update({ 
          name: editedName,
          description: editedDescription
        })
        .eq('crid', classroom.crid);

      if (error) {
        setErrorMessage('Failed to update classroom details.');
      } else {
        setClassroom({
          ...classroom,
          name: editedName,
          description: editedDescription
        });
        setIsEditing(false);
      }
    }
  };

  // Cancel editing function
  const handleCancelEdit = () => {
    setIsEditing(false);
    setNameError('');
  };

  if (loading) return <p className="text-gray-600">Loading...</p>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <EduNavbar />
      <main className="p-6 mt-20">
        {classroom ? (
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="mb-4">
              <a
              onClick={handleBackClick}
              className="text-blue-600 hover:underline cursor-pointer text-sm"
            >
              ← Back
            </a>
              
            {/* Classroom header with editable name and description */}
            <div className="mb-4">
              {isEditing ? (
                <div>
                  {/* Name input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classroom Name</label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full text-lg font-bold text-black border-2 border-blue-500 rounded p-2 focus:outline-none"
                      autoFocus
                    />
                    {nameError && <p className="text-red-600 text-sm mt-1">{nameError}</p>}
                  </div>
                  
                  {/* Description input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full text-gray-700 p-2 border-2 border-blue-500 rounded focus:outline-none"
                      rows={3}
                    />
                  </div>
                  
                  {/* Save/Cancel buttons */}
                  <div className="flex mt-2">
                    <button 
                      onClick={handleSaveChanges}
                      className="flex items-center bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors mr-2"
                    >
                      <Check className="h-4 w-4 mr-1" /> Save Changes
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="flex items-center bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Display mode with single edit button */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-black mb-2">{classroom.name}</h1>
                      <p className="text-gray-700">{classroom.description}</p>
                    </div>
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Edit classroom details"
                    >
                      <Pencil className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
              <DeleteClassroom classroomId={classroom.crid} classroomName={classroom.name} />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex -mb-px">
                <button
                  onClick={() => handleTabChange(TabType.STUDENTS)}
                  className={`mr-1 py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === TabType.STUDENTS
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="inline-block mr-1 h-4 w-4" />
                  Students
                </button>
                <button
                  onClick={() => handleTabChange(TabType.DISCUSSIONS)}
                  className={`mr-1 py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === TabType.DISCUSSIONS
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageCircle className="inline-block mr-1 h-4 w-4" />
                  Discussions
                </button>
                <button
                  onClick={() => handleTabChange(TabType.ANNOUNCEMENTS)}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === TabType.ANNOUNCEMENTS
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Bell className="inline-block mr-1 h-4 w-4" />
                  Announcements
                </button>
              </nav>
            </div>

            {/* Content based on active tab */}
            <div className="tab-content">
              {activeTab === TabType.STUDENTS && (
                <StudentsSection classroomId={classroom.crid} educatorId={educatorId} />
              )}
              
              {activeTab === TabType.DISCUSSIONS && (
                <DiscussionBoardSection classroomId={classroom.crid} />
              )}
              
              {activeTab === TabType.ANNOUNCEMENTS && (
                <AnnouncementBoardSection classroomId={classroom.crid} />
              )}
            </div>
          </div>
        ) : (
          <p>Classroom not found.</p>
        )}
      </main>
    </div>
  );
}