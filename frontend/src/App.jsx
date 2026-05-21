import { useContext, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import { AuthContext } from './context/AuthContext'
import AuthProvider from './context/AuthContext'
import CartProvider from './context/CartContext'
import ProtectedRoute from './routes/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import LoaderScreen from './components/LoaderScreen'

import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ChangePassword from './pages/ChangePassword'
import AdminMenu from './pages/AdminMenu'
import AdminDashboard from './pages/admin/AdminDashboard'
import MyOrders from './pages/MyOrders'
import Reservations from './pages/Reservations'
import MyReservations from './pages/MyReservations'
import AdminOrders from './pages/AdminOrders'
import AdminUsers from './pages/AdminUsers'
import SingleOrder from './pages/SingleOrder'
import Profile from './pages/Profile'
import AdminReservations from './pages/AdminReservations'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/menu" element={<Menu />} />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Reservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-reservations"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <MyReservations />
          </ProtectedRoute>
        }
      />
      <Route path="/cart" element={<Cart />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reservations"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminReservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/reservations"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminReservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-orders"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-orders/:orderId"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <SingleOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/orders"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/menu"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <AdminMenu />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/menu"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AdminMenu />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function AppShell() {
  const { isHydrating, loggedOut } = useContext(AuthContext)
  const [showLoader, setShowLoader] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    if (loggedOut || !isHydrating) {
      setIsFadingOut(false)
      setShowLoader(false)
      return undefined
    }

    setShowLoader(true)
    setIsFadingOut(false)

    const exitTimer = window.setTimeout(() => {
      setIsFadingOut(true)

      window.setTimeout(() => {
        setShowLoader(false)
      }, 650)
    }, 2400)

    return () => {
      window.clearTimeout(exitTimer)
    }
  }, [isHydrating, loggedOut])

  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="relative min-h-screen bg-black text-white">
          <AppRoutes />

          {showLoader && !loggedOut ? (
            <div
              className={[
                'pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-700 ease-out',
                isFadingOut ? 'opacity-0' : 'opacity-100',
              ].join(' ')}
            >
              <LoaderScreen />
            </div>
          ) : null}
        </div>
      </BrowserRouter>
    </CartProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
