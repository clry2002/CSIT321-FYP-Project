'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'how-it-works',
        'parents',
        'educators',
        'publishers',
        'testimonial',
        'why-coreadability',
      ];
      let current = '';

      sections.forEach((id) => {
        const section = document.getElementById(id);
        if (section) {
          const top = section.getBoundingClientRect().top;
          if (top <= window.innerHeight / 2) {
            current = id;
          }
        }
      });
      if (current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  const handleLearnMoreClick = () => {
    const section = document.getElementById('parents');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };
  

  return (
    <div className="min-h-screen flex flex-col scroll-smooth">
      {/* Space Background Animation */}
      <div id="stars" />

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center p-4 bg-white shadow-md">
        <div className="flex items-center">
          <Image
            src="/logo2.png"
            alt="CoReadability Logo"
            width={40}
            height={40}
            className="mr-2"
            unoptimized
          />
          <h1 className="text-2xl font-bold text-gray-800">CoReadability</h1>
        </div>
        <div className="flex items-center justify-center flex-grow space-x-4"> {/* Centered navigation links */}
          <Link href="/landing" className="text-gray-800 font-medium hover:text-blue-600 transition">Home</Link>
          <Link href="#parents" 
          className={`font-medium transition ${activeSection === 'parents' || activeSection === 'educators' || activeSection === 'publishers' ? 'underline decoration-2 underline-offset-8 text-gray-600' : 'text-gray-800 hover:text-gray-600'}`}
          >Learn More
          </Link>
          <Link href="#testimonial" 
          className={`font-medium transition ${activeSection === 'testimonial'? 'underline decoration-2 underline-offset-8 text-gray-600' : 'text-gray-800 hover:text-gray-600'}`}
          >Testimonials
          </Link>
         
          <Link
            href="#why-coreadability"
            className={`font-medium transition ${activeSection === 'why-coreadability' ? 'underline decoration-2 underline-offset-8 text-gray-600' : 'text-gray-800 hover:text-gray-600'}`}
          >
            Why CoReadability?
          </Link>
          <Link 
          href="https://sites.google.com/view/group-csit321-fyp25-s1-34/home" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-800 font-medium hover:text-blue-600 transition"
        >
          Project Site
        </Link>
          <Link href="/about" className="text-gray-800 font-medium hover:text-blue-600 transition">About Us</Link>
          <Link href="/faq" className="text-gray-800 font-medium hover:text-blue-600 transition">FAQ</Link>
        </div>
        <div className="space-x-4">
          <Link href="/auth/login">
            <button className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg transition hover:bg-orange-600">Sign In</button>
          </Link>
          <Link href="/auth/signup">
            <button className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg transition hover:bg-green-600">Sign Up</button>
          </Link>
        </div>
      </header>


      {/* Hero + How It Works */}
      <main className="relative text-white pt-24 pb-40">
        <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/homepage.jpg')" }} />
        <div className="absolute inset-0 bg-black opacity-60 z-10" />
        <div className="relative z-20 flex flex-col items-center justify-center text-center p-6 min-h-screen">
          <h2 className="text-5xl font-extrabold mb-4 animate-fade-in">Empowering Young Minds through story and screen</h2>
          <p className="text-xl mb-6 animate-fade-in delay-100">An ultimate recommendation chatbot for kids!</p>
          <button onClick={handleLearnMoreClick} className="btn mt-8 font-semibold text-white relative z-20">
            <strong>Learn more 🚀</strong>
            <div id="container-stars">
              <div id="stars"></div>
            </div>
            <div id="glow">
              <div className="circle"></div>
              <div className="circle"></div>
            </div>
          </button>
        </div>


        <section
          id="how-it-works"
          className="relative z-20 px-4 mt-[-5rem] animate-fade-in-up"
        >
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6 text-center border border-white/10 backdrop-blur-sm bg-opacity-90 h-full flex flex-col justify-center items-center">
            <p className="text-lg text-gray-700 mb-6">
              CoReadability is a smart, safe, and fun platform where kids discover books and videos tailored just for them – guided by parents, educators, and publishers who care.
            </p>
            <Link href="/auth/signup">
              <button
                type="button"
                className="btn mt-2 font-semibold text-white relative z-20 flex justify-center items-center transform translate-y-[-23px]"
              >
                <strong>Get started 🧑‍🚀</strong>
                <div id="container-stars">
                  <div id="stars"></div>
                </div>
                <div id="glow">
                  <div className="circle"></div>
                  <div className="circle"></div>
                </div>
              </button>
            </Link>
          </div>
        </section>
      </main>


      {/* Sections: Parents, Educators, Publishers */}
      {[
        {
          id: 'parents',
          title: 'For Parents',
          text: 'Help your child explore stories safely. Monitor reading habits and choose from personalized content.',
          img: '/parentsimage.jpg',
        },
        {
          id: 'educators',
          title: 'For Educators',
          text: 'Empower your students with engaging content. Track progress and support learning with ease.',
          img: '/educatorimage.jpg',
          reverse: true,
        },
        {
          id: 'publishers',
          title: 'For Publishers',
          text: 'Share your stories with the right audience. Reach families and schools who value quality content.',
          img: '/publisherimage.jpg',
        },
      ].map(({ id, title, text, img, reverse }, index) => (
        <section key={id} id={id} className={`relative flex ${reverse ? 'flex-row-reverse' : 'flex-row'} items-center justify-center py-10 px-8 bg-[#fff4e6]`}>
          <div className="absolute inset-0 bg-cover bg-center animate-pan-zoom opacity-50" style={{ backgroundImage: "url('/spaceblue.jpg')", backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />
          <div className="relative z-10 w-1/2 h-[500px] bg-cover bg-center" style={{ backgroundImage: `url('${img}')` }} />
          <div className="w-1/2 text-left p-12 z-10">
            <h3 className="text-4xl font-bold text-white mb-6 drop-shadow-lg">{title}</h3>
            <p className="text-lg text-white">{text}</p>
          </div>
          
          {/* YouTube Video Section - Add after the Parents section */}
          {index === 0 && (
            <div className="w-full">
              {/* This empty div closes the parents section */}
            </div>
          )}
        </section>
      ))}
      
      {/* YouTube Video Section - Placed after Parents section */}
      <section className="relative py-16 px-6 md:px-20 bg-gradient-to-b from-[#fff4e6] to-white">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">See CoReadability in Action</h3>
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-xl">
            <iframe 
              className="w-full h-full"
              src="https://www.youtube.com/embed/o4PRzjENnIY" 
              title="CoReadability Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="mt-8 text-center">
            <p className="text-lg text-gray-700 mb-6">
              Watch how CoReadability helps children discover and engage with age-appropriate content that sparks their imagination and encourages learning.
            </p>
            <Link href="/auth/signup">
              <button className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition">
                Try CoReadability Today
              </button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Testimonials Carousel */}
      <section id = 'testimonial' className="relative py-24 px-6 md:px-20 bg-[#fef9f5]">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-gray-800">What People Are Saying</h3>
          <p className="text-gray-600 mt-2">Real voices. Real impact.</p>
        </div>

        <div className="relative">
          <button
            onClick={() => document.getElementById('carousel')?.scrollBy({ left: -320, behavior: 'smooth' })}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 z-10 hover:bg-gray-200"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => document.getElementById('carousel')?.scrollBy({ left: 320, behavior: 'smooth' })}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-2 z-10 hover:bg-gray-200"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div id="carousel" className="flex space-x-6 overflow-x-auto scroll-smooth no-scrollbar px-4">
            {[
              {
                text: "Finally, a safe space where my kids can explore stories they love without me worrying about the content. CoReadability has made reading a joy in our household, and I've even noticed their vocabulary improving!",
                name: "— Priya N., Parent of 2, Singapore",
                img: "female1.jpg",
                bg: "bg-orange-100",
              },
              {
                text: "CoReadability has become an essential classroom tool for me. My students are far more engaged and excited during reading time. The ability to personalize stories to their interests has made a big difference.",
                name: "— Mr. John S., Elementary Teacher, USA",
                img: "male1.jpg",
                bg: "bg-teal-100",
              },
              {
                text: "We've reached families and schools in ways we never imagined. As a publisher, I've seen how CoReadability bridges the gap between digital and meaningful learning. It's a powerful platform for storytelling.",
                name: "— Liam D., Publisher, UK",
                img: "male2.jpg",
                bg: "bg-purple-100",
              },
              {
                text: "CoReadability makes learning more engaging and effective. The interactive format grabs attention, and the students retain more information. It's like having an assistant in the classroom that kids actually enjoy.",
                name: "— Mr. Tan, Educator, Singapore",
                img: "male4.jpg",
                bg: "bg-blue-100",
              },
              {
                text: "My child developed a love for reading, something we struggled with before. The personalized book recommendations and fun interface make all the difference. It's now a part of our bedtime routine!",
                name: "— John S., Parent, Singapore",
                img: "male3.jpg",
                bg: "bg-green-100",
              },
              {
                text: "It's helping us introduce new books and concepts in a way that feels natural and fun. Teachers and parents are giving positive feedback, and engagement rates are going up week by week.",
                name: "— Jack W., Publisher, Singapore",
                img: "male5.jpg",
                bg: "bg-pink-100",
              },
              {
                text: "This platform has made reading fun for my kids again. They're not only reading more, but also asking thoughtful questions afterward. It's interactive, smart, and beautifully designed.",
                name: "— Sophie L., Parent of 3, Singapore",
                img: "female1.jpg",
                bg: "bg-yellow-100",
              },
            ].map((t, i) => (
              <div
                key={i}
                className={`min-w-[300px] w-[300px] min-h-[300px] ${t.bg} rounded-xl p-4 shadow-md flex-shrink-0 flex flex-col justify-between`}
              >
                <p className="text-gray-800 italic text-sm leading-snug break-words mb-4">
                  {`"${t.text}"`}
                </p>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                  <div className="flex justify-center mt-2">
                    <Image src={`/${t.img}`} alt="Avatar" width={40} height={40} className="rounded-full" unoptimized />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Why CoReadability */}
      <section id="why-coreadability" className="relative py-20 px-6 md:px-20 text-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[url('/space1.jpg')] bg-cover bg-center animate-pan-zoom opacity-50" style={{ backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <h3 className="text-4xl font-bold text-white mb-6 drop-shadow-lg">Why CoReadability?</h3>
          <p className="text-lg text-white mb-12 leading-relaxed drop-shadow-md">
            We personalize learning and reading experiences for every child. Our AI chatbot is safe, friendly, and designed with kids in mind.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Personalized Content", text: "Books and videos matched to your child's interests and reading level.", color: "text-green-600" },
              { title: "Safe & Secure", text: "Built-in safety features and parental guidance at every step.", color: "text-orange-500" },
              { title: "Fun & Engaging", text: "Interactive chatbot makes learning enjoyable and screen-time meaningful.", color: "text-blue-600" },
            ].map((feature, i) => (
              <div key={i} className="bg-white bg-opacity-90 p-8 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition duration-300">
                <h4 className={`text-xl font-semibold ${feature.color} mb-3`}>{feature.title}</h4>
                <p className="text-gray-700 text-base">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 bg-white text-center text-gray-600">
        © 2025 CoReadability. All rights reserved.
      </footer>
    </div>
  );
}