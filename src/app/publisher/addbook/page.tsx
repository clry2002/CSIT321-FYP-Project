'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use Next.js router for navigation

const AddBooks: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const router = useRouter(); // Initialize Next.js router

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (title && genre && description && file) {
      console.log('Book uploaded successfully:', {
        title,
        genre,
        description,
        fileName: file.name,
      });
      alert('Book uploaded successfully!');
      setTitle('');
      setGenre('');
      setDescription('');
      setFile(null);
    } else {
      alert('Please fill in all fields and upload a file.');
    }
  };

  const handleCancel = () => {
    // Reset all form fields
    setTitle('');
    setGenre('');
    setDescription('');
    setFile(null);
    // Navigate to publisher page
    router.push('/publisherpage');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      {/* Header */}
      <h1 className="text-2xl font-serif text-black mb-6">Add a New Book</h1>

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
            placeholder="Enter book title"
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
            placeholder="Enter book genre"
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
            placeholder="Enter book description"
            rows={5}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Upload File:</label>
          <div className="flex items-center space-x-4">
            <div className="relative w-full">
              <input
                type="file"
                id="file"
                onChange={handleFileUpload}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <div className="w-full px-4 py-2 border rounded-lg text-gray-700 bg-white cursor-pointer">
                {file ? file.name : 'Please upload a file'}
              </div>
            </div>
            <button
              onClick={() => document.getElementById('file')?.click()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Browse File
            </button>
          </div>
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

export default AddBooks;
