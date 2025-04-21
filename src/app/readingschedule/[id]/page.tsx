"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// Define necessary types
type ReadingSchedule = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  books: Book[];
  progress: number;
};

type Book = {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
};

// Define types for route parameters and search parameters
type RouteParams = { id: string };
type SearchParams = Record<string, string | string[] | undefined>;

// Align with Next.js expected types for App Router
type PageProps = {
  params: Promise<RouteParams>;
  searchParams?: Promise<SearchParams>;
};

export default function ReadingSchedulePage({ params }: PageProps) {
  const [id, setId] = useState<string>('');
  const [schedule, setSchedule] = useState<ReadingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setId(resolvedParams.id);
      } catch {
        setError("Failed to resolve route parameters");
      }
    };

    resolveParams();
  }, [params]);

  useEffect(() => {
    // Only fetch schedule when ID is available
    if (!id) return;
    
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/readingschedule/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reading schedule');
        }
        
        const data = await response.json() as ReadingSchedule;
        setSchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <Link href="/readingschedule" className="text-blue-500 hover:underline mt-2 inline-block">
            Return to schedules
          </Link>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Schedule not found</p>
          <Link href="/readingschedule" className="text-blue-500 hover:underline mt-2 inline-block">
            Return to schedules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/readingschedule" className="text-blue-500 hover:underline">
          &larr; Back to schedules
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-2">{schedule.title}</h1>
        <p className="text-gray-600 mb-4">{schedule.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-700"><span className="font-semibold">Start Date:</span> {new Date(schedule.startDate).toLocaleDateString()}</p>
            <p className="text-gray-700"><span className="font-semibold">End Date:</span> {new Date(schedule.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-700"><span className="font-semibold">Overall Progress:</span></p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${schedule.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{schedule.progress}% complete</p>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Books</h2>
        
        {schedule.books.length === 0 ? (
          <p className="text-gray-600">No books added to this schedule yet.</p>
        ) : (
          <div className="space-y-4">
            {schedule.books.map((book) => (
              <div key={book.id} className="border rounded-lg p-4">
                <h3 className="text-xl font-medium">{book.title}</h3>
                <p className="text-gray-600 mb-2">By {book.author}</p>
                
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Reading Progress</span>
                    <span className="text-sm font-medium text-gray-700">
                      {book.currentPage} of {book.totalPages} pages
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${(book.currentPage / book.totalPages) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {Math.round((book.currentPage / book.totalPages) * 100)}% complete
                  </p>
                </div>
                
                <div className="mt-4">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">
                    Update Progress
                  </button>
                  <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t">
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2">
            Add Book
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">
            Edit Schedule
          </button>
          <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Delete Schedule
          </button>
        </div>
      </div>
    </div>
  );
}