// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabase';

// /**
//  * Custom hook to fetch child user data from Supabase
//  * @returns {Object} Object containing user data and loading state
//  */
// const useChildData = () => {
//   const [userFullName, setUserFullName] = useState(null);
//   const [uaidChild, setUaidChild] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchChildData = async () => {
//       setIsLoading(true);

//       try {
//         const {
//           data: { user },
//           error: userError,
//         } = await supabase.auth.getUser();

//         if (userError || !user) {
//           console.error('Error getting auth user:', userError);
//           router.push('/landing');
//           return null;
//         }

//         const { data, error } = await supabase
//           .from('user_account')
//           .select('id, fullname')
//           .eq('user_id', user.id)
//           .single();

//         if (error) {
//           console.error('Error fetching child fullname:', error);
//           return null;
//         }

//         setUserFullName(data?.fullname || null);
//         setUaidChild(data?.id || null);
//       } catch (error) {
//         console.error('Error in fetchChildData:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchChildData();
//   }, [router]);

//   return { userFullName, uaidChild, isLoading };
// };

// export default useChildData;


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Custom hook to fetch child data
const useChildData = () => {
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [uaidChild, setUaidChild] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchChildData = async () => {
      setIsLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Error getting auth user:', userError);
          router.push('/landing');
          return;
        }

        const { data, error } = await supabase
          .from('user_account')
          .select('id, fullname')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching child fullname:', error);
          return;
        }

        setUserFullName(data?.fullname || null);
        setUaidChild(data?.id || null);
      } catch (error) {
        console.error('Error in fetchChildData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildData();
  }, [router]);

  return { userFullName, uaidChild, isLoading };
};

export default useChildData;