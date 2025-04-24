'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

// Import image icons, icons are in assets/icons folder
import homeIcon from '/assets/icons/house.png';
import exploreIcon from '/assets/icons/search.png';
import booksIcon from '/assets/icons/book.png';
import classroomIcon from '/assets/icons/teaching.png';
import settingsIcon from '/assets/icons/gear.png';
import logoutIcon from '/assets/icons/logout.png';

export default function Navbar() {
  const [activeLink, setActiveLink] = useState('');

  useEffect(() => {
    setActiveLink(window.location.pathname);
  }, []);

  const handleLinkClick = (href: string) => {
    setActiveLink(href);
  };

  // Array of universe-inspired colors for the gradient
  const universeColors = ['#0B3C5D', '#328CC1', '#D9B310', '#F2AF29'];

  return (
    <nav
      className={`fixed top-0 w-full bg-gradient-to-b from-${universeColors[0]} to-${universeColors[1]} border-b border-gray-100 flex justify-around py-3 z-50 shadow-md`}
      style={{
        background: `linear-gradient(to bottom, ${universeColors[0]}, ${universeColors[1]})`,
      }}
    >
      <Link
        href="/childpage"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/childpage' ? 'bg-blue-200 text-blue-700' : 'hover:bg-blue-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/childpage')}
      >
        <Image
          src={homeIcon}
          alt="Home Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/childpage' ? 'animate-bounce' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/childpage' ? 'text-blue-700' : 'text-gray-800 hover:text-blue-600'}`}>Home</b>
      </Link>

      <Link
        href="/search"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/search' ? 'bg-green-200 text-green-700' : 'hover:bg-green-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/search')}
      >
        <Image
          src={exploreIcon}
          alt="Explore Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/search' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/search' ? 'text-green-700 animate-pulse' : 'text-gray-800 hover:text-green-600'}`}>Search</b>
      </Link>

      <Link
        href="/bookmark"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/bookmark' ? 'bg-yellow-200 text-yellow-700' : 'hover:bg-yellow-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/bookmark')}
      >
        <Image
          src={booksIcon}
          alt="My Books Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/bookmark' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/bookmark' ? 'text-yellow-700 animate-pulse' : 'text-gray-800 hover:text-yellow-600'}`}>Bookmarks</b>
      </Link>

      <Link
        href="/classroom"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/classroom' ? 'bg-purple-200 text-purple-700' : 'hover:bg-purple-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/classroom')}
      >
        <Image
          src={classroomIcon}
          alt="Learning Hub Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/classroom' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/classroom' ? 'text-purple-700 animate-pulse' : 'text-gray-800 hover:text-purple-600'}`}>Classroom</b>
      </Link>

      <Link
        href="/childsettings"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/childsettings' ? 'bg-orange-200 text-orange-700' : 'hover:bg-orange-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/childsettings')}
      >
        <Image
          src={settingsIcon}
          alt="My Space Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/childsettings' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/childsettings' ? 'text-orange-700 animate-pulse' : 'text-gray-800 hover:text-orange-600'}`}>Settings</b>
      </Link>

      {/* Logout link */}
      <Link
        href="/logout"
        className={`flex flex-col items-center p-2 rounded-lg transition-transform duration-300 transform-gpu hover:scale-105 ${
          activeLink === '/logout' ? 'bg-red-200 text-red-700' : 'hover:bg-red-100 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/logout')}
      >
        <Image
          src={logoutIcon}
          alt="Log Out Icon"
          width={20}
          height={20}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/logout' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
        />
        <b className={`text-xs transition-colors duration-300 ${activeLink === '/logout' ? 'text-red-700 animate-pulse' : 'text-gray-800 hover:text-red-600'}`}>Log Out</b>
      </Link>
    </nav>
  );
}