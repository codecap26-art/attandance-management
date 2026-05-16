import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/auth/AuthGuard'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AttendancePage from './pages/AttendancePage'
import BulkAttendancePage from './pages/BulkAttendancePage'
import AIAnalyzerPage from './pages/AIAnalyzerPage'
import AdminPage from './pages/AdminPage'
import CategoryPage from './pages/CategoryPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: '13px',
              maxWidth: '380px',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all staff roles */}
          <Route path="/" element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } />
          <Route path="/attendance" element={
            <AuthGuard>
              <AttendancePage />
            </AuthGuard>
          } />
          <Route path="/bulk" element={
            <AuthGuard>
              <BulkAttendancePage />
            </AuthGuard>
          } />
          <Route path="/ai-analyzer" element={
            <AuthGuard>
              <AIAnalyzerPage />
            </AuthGuard>
          } />

          {/* Admin-only */}
          <Route path="/admin" element={
            <AuthGuard roles={['admin']}>
              <AdminPage />
            </AuthGuard>
          } />
          <Route path="/categories" element={
            <AuthGuard roles={['admin']}>
              <CategoryPage />
            </AuthGuard>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
