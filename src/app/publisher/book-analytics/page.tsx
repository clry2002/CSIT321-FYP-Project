'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface BookAnalyticData {
    cid: number;
    title: string;
    viewCount: number | null;
}

const BookAnalytics: React.FC = () => {
    const router = useRouter();
    const [bookMetrics, setBookMetrics] = useState<BookAnalyticData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userError || !userData?.user) {
                console.error('Error fetching user or user is not logged in:', userError);
                return;
            }

            const user = userData.user;

            const { data: userAccountData, error: userAccountError } = await supabase
                .from('user_account')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (userAccountError) {
                console.error('Error fetching user account data:', userAccountError);
                return;
            }

            setUaidPublisher(userAccountData?.id || null);
            setLoading(false);
        };

        fetchUser();
    }, []);

    useEffect(() => {
        const fetchBookAnalytics = async () => {
            if (!uaidPublisher) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('temp_content')
                    .select('cid, title, viewCount')
                    .eq('uaid_publisher', uaidPublisher)
                    .eq('cfid', 2); // Filter for books

                if (error) {
                    console.error('Error fetching book analytics:', error);
                    return;
                }

                setBookMetrics(data as BookAnalyticData[]);
            } catch (error) {
                console.error('An error occurred while fetching book analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!loading) {
            fetchBookAnalytics();
        }
    }, [uaidPublisher, loading]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 py-6 flex flex-col transition-all duration-300">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 flex justify-between items-center">
                        <h1 className="text-2xl font-semibold text-gray-900">Book Analytics</h1>
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                            onClick={() => router.push('/publisherpage')}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                    <div className="flex justify-center items-center h-48">
                        <p className="text-lg text-gray-700 animate-pulse">Loading book analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col transition-all duration-300">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-gray-900">Book Analytics</h1>
                    <button
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        onClick={() => router.push('/publisherpage')}
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Analytics Table */}
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Reads
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                            {bookMetrics.length > 0 ? (
                                bookMetrics.map((book, index) => (
                                    <tr key={index} className="hover:bg-gray-100">
                                        <td className="px-5 py-4 border-b border-gray-200">
                                            <p className="text-gray-900 whitespace-no-wrap">{book.title}</p>
                                        </td>
                                        <td className="px-5 py-4 border-b border-gray-200">
                                            <p className="text-gray-900 whitespace-no-wrap">
                                                {book.viewCount !== null ? book.viewCount : 'N/A'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-5 py-4 border-b border-gray-200 text-center">
                                        No book analytics available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BookAnalytics;