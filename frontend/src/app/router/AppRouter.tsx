import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RouteErrorFallback } from '../../components/feedback/RouteErrorFallback'
import { AdminDashboard } from '../../features/sqps/pages/AdminDashboard'
import { LandingPage } from '../../features/sqps/pages/LandingPage'
import { LoginPage } from '../../features/sqps/pages/LoginPage'
import { ManagerDashboard } from '../../features/sqps/pages/ManagerDashboard'
import { UserDashboard } from '../../features/sqps/pages/UserDashboard'
import { DashboardLayout } from '../../layouts/DashboardLayout'
import { PublicLayout } from '../../layouts/PublicLayout'
import { ProtectedRoute } from './ProtectedRoute'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <LoginPage /> },
      { path: '/forgot-password', element: <LoginPage /> },
      { path: '/reset-password', element: <LoginPage /> },
    ],
  },
  {
    element: <ProtectedRoute roles={['User']} />,
    errorElement: <RouteErrorFallback />,
    children: [{ element: <DashboardLayout />, children: [
      { path: '/app/dashboard', element: <UserDashboard /> },
      { path: '/app/services', element: <UserDashboard /> },
      { path: '/app/token', element: <UserDashboard /> },
      { path: '/app/queue', element: <UserDashboard /> },
      { path: '/app/notifications', element: <UserDashboard /> },
    ] }],
  },
  {
    element: <ProtectedRoute roles={['Manager']} />,
    errorElement: <RouteErrorFallback />,
    children: [{ element: <DashboardLayout />, children: [
      { path: '/app/manager/counters', element: <ManagerDashboard /> },
      { path: '/app/manager/queue', element: <ManagerDashboard /> },
      { path: '/app/manager/settings', element: <ManagerDashboard /> },
      { path: '/app/manager/analytics', element: <ManagerDashboard /> },
      { path: '/app/manager/alerts', element: <ManagerDashboard /> },
      { path: '/app/locations', element: <Navigate to="/app/manager/counters" replace /> },
    ] }],
  },
  {
    element: <ProtectedRoute roles={['SystemAdmin']} />,
    errorElement: <RouteErrorFallback />,
    children: [{ element: <DashboardLayout />, children: [
      { path: '/app/admin/dashboard', element: <AdminDashboard /> },
      { path: '/app/admin/locations', element: <AdminDashboard /> },
      { path: '/app/admin/users', element: <AdminDashboard /> },
      { path: '/app/admin/model', element: <AdminDashboard /> },
      { path: '/app/admin/analytics', element: <AdminDashboard /> },
      { path: '/app/admin', element: <Navigate to="/app/admin/dashboard" replace /> },
    ] }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() { return <RouterProvider router={router} /> }
