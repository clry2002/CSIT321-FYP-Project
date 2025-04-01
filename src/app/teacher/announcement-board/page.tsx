'use client';

import React, { useState } from 'react';
import EduNavbar from '../../components/eduNavbar'; // Import the EduNavbar component

type Announcement = {
  id: number;
  title: string;
  content: string;
};

// Hardcoded Announcement
export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 1, title: 'Read this books', content: 'There will be consequences for not reading >:)' },
  ]);

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

  // To edit the Hardcoded Announcement
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewAnnouncement((prevState) => ({ ...prevState, [name]: value }));
  };

  // Add new announcement
  const addAnnouncement = () => {
    if (newAnnouncement.title && newAnnouncement.content) {
      const newId = announcements.length ? announcements[announcements.length - 1].id + 1 : 1;
      const newAnnouncementObject = { id: newId, ...newAnnouncement };
      setAnnouncements((prevState) => [...prevState, newAnnouncementObject]);
      setNewAnnouncement({ title: '', content: '' }); // Clear input fields
    }
  };

  // Update announcement
  const updateAnnouncement = (id: number, updatedContent: string) => {
    setAnnouncements((prevState) =>
      prevState.map((announcement) =>
        announcement.id === id ? { ...announcement, content: updatedContent } : announcement
      )
    );
  };

  // Delete an announcement
  const deleteAnnouncement = (id: number) => {
    setAnnouncements((prevState) => prevState.filter((announcement) => announcement.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Navbar */}
      <EduNavbar /> {/* Render the EduNavbar component */}

      {/* Main Content */}
      <div className="px-6 py-25">
        {/* Header Section */}
        <h1 className="text-2xl font-serif text-black mb-5">View & Create Announcements</h1>

        {/* Existing Announcements Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-serif mb-3 text-black">Existing Announcements</h2>
          {announcements.length ? (
            announcements.map((announcement) => (
              <div key={announcement.id} className="border-b border-gray-200 py-2">
                <h3 className="font-medium text-black text-sm">{announcement.title}</h3>
                <p className="text-gray-500 text-sm">{announcement.content}</p>
                <button
                  className="text-blue-500 text-xs underline mr-3"
                  onClick={() =>
                    updateAnnouncement(
                      announcement.id,
                      prompt(`Edit content for "${announcement.title}"`, announcement.content) || announcement.content
                    )
                  }
                >
                  Edit
                </button>
                <button
                  className="text-red-500 text-xs underline"
                  onClick={() => deleteAnnouncement(announcement.id)}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No announcements available.</p>
          )}
        </div>

        {/* Create New Announcement Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Create New Announcement</h2>
          <input
            type="text"
            name="title"
            value={newAnnouncement.title}
            onChange={handleInputChange}
            placeholder="Title"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3"
          />
          <textarea
            name="content"
            value={newAnnouncement.content}
            onChange={handleInputChange}
            placeholder="Content"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-3"
          />
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={addAnnouncement}
          >
            Add Announcement
          </button>
        </div>
      </div>
    </div>
  );
}
