'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DiscussionBoardSection from '../../components/educator/ClassroomDetails/DiscussionBoardSection';

// Client Component that uses useSearchParams
function DiscussionBoardContent() {
  const searchParams = useSearchParams();
  const classroomId = parseInt(searchParams.get('classroomId') || '0', 10);

  if (!classroomId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-lg">Missing classroom ID. Please provide a valid classroom ID.</p>
      </div>
    );
  }

  return <DiscussionBoardSection classroomId={classroomId} />;
}

// Page component with Suspense boundary
export default function DiscussionBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading discussion board...</div>}>
      <DiscussionBoardContent />
    </Suspense>
  );
}