// app/parent/reauth/layout.tsx
export const metadata = {
    title: 'Confirm Parent Account',
    description: 'Confirm your parent account to complete child account creation',
  };
  
  export default function ReauthLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  }