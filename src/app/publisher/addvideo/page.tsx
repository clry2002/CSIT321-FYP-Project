'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use Next.js router for navigation

const AddVideos: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [embeddedLink, setEmbeddedLink] = useState('');
  
  const router = useRouter(); // Initialize Next.js router

  const handleSubmit = () => {
    if (title && genre && description && embeddedLink) {
      console.log('Video uploaded successfully:', {
        title,
        genre,
        description,
        embeddedLink,
      });
      alert('Video uploaded successfully!');
      setTitle('');
      setGenre('');
      setDescription('');
      setEmbeddedLink('');
    } else {
      alert('Please fill in all fields.');
    }
  };

  const handleCancel = () => {
    // Reset all form fields
    setTitle('');
    setGenre('');
    setDescription('');
    setEmbeddedLink('');
    // Navigate to publisher page
    router.push('/publisherpage');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      {/* Header */}
      <h1 className="text-2xl font-serif text-black mb-6">Add a New Video</h1>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2" htmlFor="title">
            Title:
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2" htmlFor="genre">
            Genre:
          </label>
          <input
            type="text"
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Enter video genre"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2" htmlFor="description">
            Description:
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description"
            rows={5}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2" htmlFor="embeddedLink">
            Embedded Link:
          </label>
          <input
            type="text"
            id="embeddedLink"
            value={embeddedLink}
            onChange={(e) => setEmbeddedLink(e.target.value)}
            placeholder="Enter embedded video link (e.g., YouTube or Vimeo URL)"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        {/* Submit and Cancel Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
          >
            Submit
          </button>
          <button
            onClick={handleCancel}
            className="bg-red-500 text-white px-4 py-2 rounded-lg w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVideos;
