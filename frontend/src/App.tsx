import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TestimonialsPage from './pages/TestimonialsPage';
import ApplyPage from './pages/ApplyPage';
import LoginPage from './pages/LoginPage';
import DashboardRouter from './pages/DashboardRouter';
import StudentDashboard from './pages/StudentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import ChangePasswordPage from './pages/ChangePasswordPage';
import MeetingsPage from './pages/MeetingsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route
            path="/meetings"
            element={
              <ProtectedRoute allowedRoles={['student', 'tutor', 'owner']}>
                <MeetingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/dashboard" element={<DashboardRouter />} />

          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/tutor"
            element={
              <ProtectedRoute allowedRoles={['tutor', 'owner']}>
                <TutorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/owner"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
