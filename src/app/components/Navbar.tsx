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

  return (
    <nav
      className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-transparent flex flex-row justify-center items-center gap-6 px-8 py-2 rounded-2xl z-50 backdrop-blur-md"
      style={{ minWidth: 'fit-content', boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)' }}
    >
      <Link
        href="/childpage"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/childpage' ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/childpage')}
      >
        <Image
          src={homeIcon}
          alt="Home Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/childpage' ? 'animate-bounce' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/childpage' ? 'text-blue-700' : 'text-white group-hover:text-blue-600'}`}>Home</b>
      </Link>

      <Link
        href="/child/search"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/child/search' ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/child/search')}
      >
        <Image
          src={exploreIcon}
          alt="Explore Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/child/search' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/child/search' ? 'text-green-700 animate-pulse' : 'text-white group-hover:text-green-600'}`}>Search</b>
      </Link>

      <Link
        href="/child/bookmark"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/child/bookmark' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-yellow-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/child/bookmark')}
      >
        <Image
          src={booksIcon}
          alt="My Books Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/child/bookmark' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/child/bookmark' ? 'text-yellow-700 animate-pulse' : 'text-white group-hover:text-yellow-600'}`}>Bookmarks</b>
      </Link>

      <Link
        href="/child/classroom"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/child/classroom' ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/child/classroom')}
      >
        <Image
          src={classroomIcon}
          alt="Learning Hub Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/child/classroom' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/child/classroom' ? 'text-purple-700 animate-pulse' : 'text-white group-hover:text-purple-600'}`}>Classroom</b>
      </Link>

      <Link
        href="/child/childsettings"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/child/childsettings' ? 'bg-orange-100 text-orange-700' : 'hover:bg-orange-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/child/childsettings')}
      >
        <Image
          src={settingsIcon}
          alt="My Space Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/child/childsettings' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/child/childsettings' ? 'text-orange-700 animate-pulse' : 'text-white group-hover:text-orange-600'}`}>Settings</b>
      </Link>

      {/* Logout link */}
      <Link
        href="/logout"
        className={`group flex flex-col items-center px-1 py-1 rounded-md transition-transform duration-200 hover:scale-105 ${
          activeLink === '/logout' ? 'bg-red-100 text-red-700' : 'hover:bg-red-50 text-gray-700'
        }`}
        onClick={() => handleLinkClick('/logout')}
      >
        <Image
          src={logoutIcon}
          alt="Log Out Icon"
          width={28}
          height={28}
          className={`mb-0.5 transition-colors duration-300 ${
            activeLink === '/logout' ? 'hover:filter brightness-110 saturate-120 animate-pulse' : 'hover:filter brightness-110 saturate-120'
          }`}
          unoptimized
        />
        <b className={`text-xs transition-colors duration-200 ${activeLink === '/logout' ? 'text-red-700 animate-pulse' : 'text-white group-hover:text-red-600'}`}>Log Out</b>
      </Link>
    </nav>
  );
}