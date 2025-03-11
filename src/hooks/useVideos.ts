'use client';

import { useState } from 'react';

interface Video {
  title: string;
  thumbnail: string;
  views: string;
  timeAgo: string;
}

export const useVideos = () => {
  const [videos] = useState<Video[]>([
    {
      title: 'Why Read Fantasy Books?',
      thumbnail: '/video1.jpg',
      views: '4.2K',
      timeAgo: '2 days ago'
    },
    {
      title: 'Book Review: The Name of the Wind',
      thumbnail: '/video2.jpg',
      views: '8.5K',
      timeAgo: '5 days ago'
    },
    {
      title: 'Top 10 Must-Read Books of 2024',
      thumbnail: '/video3.jpg',
      views: '12K',
      timeAgo: '1 week ago'
    },
    {
      title: 'Reading Vlog: A Day in the Life',
      thumbnail: '/video4.jpg',
      views: '6.8K',
      timeAgo: '3 days ago'
    }
  ]);

  return {
    videos
  };
}; 