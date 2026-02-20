import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import NotFound from "./pages/NotFound";
import UsersPage from "./pages/admin/UsersPage";
import TicketsPage from "./pages/admin/TicketsPage";
import TopicsPage from "./pages/admin/TopicsPage";
import StudentTopicsPage from "./pages/student/StudentTopicsPage";
import StudentTestsPage from "./pages/student/StudentTestsPage";
import StudentResultsPage from "./pages/student/StudentResultsPage";
import StudentErrorsPage from "./pages/student/StudentErrorsPage";
import StudentCategorizedTestsPage from "./pages/student/StudentCategorizedTestsPage";
import StudentRandomTestsPage from "./pages/student/StudentRandomTestsPage";
import StudentNotificationsPage from "./pages/student/StudentNotificationsPage";
import TeacherStudentsPage from "./pages/teacher/TeacherStudentsPage";
import TeacherResultsPage from "./pages/teacher/TeacherResultsPage";
import TeacherAssignPage from "./pages/teacher/TeacherAssignPage";
import TeacherNotificationsPage from "./pages/teacher/TeacherNotificationsPage";
import TeacherCategorizedTestsPage from "./pages/teacher/TeacherCategorizedTestsPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, user, role, loading } = useAuth();
  const spinner = <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  // Boshlang'ich yuklash yoki: user kirgani ma'lum, lekin role hali kelmagan
  if (loading) return spinner;
  if (user && !role) return spinner;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(role!)) return <Navigate to={`/${role}`} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={`/${role}`} replace /> : <LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={["admin"]}><TicketsPage /></ProtectedRoute>} />
      <Route path="/admin/topics" element={<ProtectedRoute allowedRoles={["admin"]}><TopicsPage /></ProtectedRoute>} />
      <Route path="/admin/categorized" element={<ProtectedRoute allowedRoles={["admin"]}><TeacherCategorizedTestsPage /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherStudentsPage /></ProtectedRoute>} />
      <Route path="/teacher/tickets" element={<ProtectedRoute allowedRoles={["teacher"]}><TicketsPage /></ProtectedRoute>} />
      <Route path="/teacher/topics" element={<ProtectedRoute allowedRoles={["teacher"]}><TopicsPage /></ProtectedRoute>} />
      <Route path="/teacher/assign" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssignPage /></ProtectedRoute>} />
      <Route path="/teacher/categorized" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherCategorizedTestsPage /></ProtectedRoute>} />
      <Route path="/teacher/results" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherResultsPage /></ProtectedRoute>} />
      <Route path="/teacher/notifications" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherNotificationsPage /></ProtectedRoute>} />
      <Route path="/teacher/*" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/topics" element={<ProtectedRoute allowedRoles={["student"]}><StudentTopicsPage /></ProtectedRoute>} />
      <Route path="/student/tests" element={<ProtectedRoute allowedRoles={["student"]}><StudentTestsPage /></ProtectedRoute>} />
      <Route path="/student/random" element={<ProtectedRoute allowedRoles={["student"]}><StudentRandomTestsPage /></ProtectedRoute>} />
      <Route path="/student/categorized" element={<ProtectedRoute allowedRoles={["student"]}><StudentCategorizedTestsPage /></ProtectedRoute>} />
      <Route path="/student/errors" element={<ProtectedRoute allowedRoles={["student"]}><StudentErrorsPage /></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRoles={["student"]}><StudentResultsPage /></ProtectedRoute>} />
      <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={["student"]}><StudentNotificationsPage /></ProtectedRoute>} />
      <Route path="/student/*" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
