import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import React from 'react'; 

type Props = {
  children: React.ReactNode; 
  admin?: boolean;
};

export default function ProtectedRoute({ children, admin }: Props) {
  const { user } = useStore();

  if (!user) return <Navigate to="/auth/login" replace />;
  if (admin && user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/Dashboard" replace />;

  return <>{children}</>;
}
