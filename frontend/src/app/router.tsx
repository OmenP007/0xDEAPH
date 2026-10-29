import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LandingPage } from '@/features/landing/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { EscrowListPage } from '@/features/escrow/EscrowListPage';
import { NewEscrowPage } from '@/features/escrow/NewEscrowPage';
import { EscrowDetailPage } from '@/features/escrow/EscrowDetailPage';
import { OffersPage } from '@/features/offers/OffersPage';
import { PaylinkCheckoutPage } from '@/features/offers/PaylinkCheckoutPage';
import { WalletPage } from '@/features/wallet/WalletPage';
import { ApiKeysPage } from '@/features/api_keys/ApiKeysPage';
import { SecurityPage } from '@/features/security/SecurityPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { AdminPage } from '@/features/admin/AdminPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import { useAuth } from '@/context/AuthContext';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F14]">
        <div className="w-8 h-8 border-2 border-[#7B3DFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Wrapper — requires role 'deaph'
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F14]">
        <div className="w-8 h-8 border-2 border-[#7B3DFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'deaph') {
    return <Navigate to="/dashboard" replace state={{ error: 'Accès réservé aux administrateurs.' }} />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/pay/:code',
    element: <PaylinkCheckoutPage />,
  },

  // Authenticated App Routes (SaaS Layout)
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/transactions',
        element: <TransactionsPage />,
      },
      {
        path: '/escrow',
        element: <EscrowListPage />,
      },
      {
        path: '/escrow/new',
        element: <NewEscrowPage />,
      },
      {
        path: '/escrow/:id',
        element: <EscrowDetailPage />,
      },
      {
        path: '/offers',
        element: <OffersPage />,
      },
      {
        path: '/wallet',
        element: <WalletPage />,
      },
      {
        path: '/api-keys',
        element: <ApiKeysPage />,
      },
      {
        path: '/security',
        element: <SecurityPage />,
      },
      {
        path: '/notifications',
        element: <NotificationsPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/admin',
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
    ],
  },

  // Catch-all → 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
