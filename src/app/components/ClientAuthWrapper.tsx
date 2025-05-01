'use client';

import React, { ReactNode } from 'react';
import AuthRouteGuard from './AuthGuard';

// This is a simple client wrapper around the AuthRouteGuard
// It allows us to keep the root layout as a server component
export default function ClientAuthWrapper({ children }: { children: ReactNode }) {
  return <AuthRouteGuard>{children}</AuthRouteGuard>;
}