'use client';

import { useState } from 'react';

interface Book {
  title: string;
  author: string;
  coverImage: string;
  volume?: string;
}

export const useBooks = () => {
  const [popularBooks] = useState<Book[]>([
    {
      title: 'The World of Ice and Fire',
      author: 'George R. R. Martin',
      coverImage: '/book1.jpg'
    },
    {
      title: 'Fantastic Beasts',
      author: 'J.K. Rowling',
      coverImage: '/book2.jpg',
      volume: 'II'
    },
    {
      title: 'Game of Thrones',
      author: 'George R. R. Martin',
      coverImage: '/book3.jpg',
      volume: 'III'
    },
    {
      title: "The Wise Man's Fear",
      author: 'Patrick Rothfuss',
      coverImage: '/book4.jpg'
    }
  ]);

  return {
    popularBooks
  };
}; 