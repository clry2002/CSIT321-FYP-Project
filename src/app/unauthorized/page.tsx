'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo2.png"
              alt="Logo"
              width={80}
              height={80}
              className="rounded-full"
              unoptimized
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-8">
            You don&apos;t have permission to access this page. Please return to your dashboard.
          </p>
          <button
            onClick={() => router.back()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
} 