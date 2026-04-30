import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store';
import { AuthProvider, useAuth } from './lib/auth';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import NewCourse from './pages/NewCourse';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Quiz, { GeneralQuiz } from './pages/Quiz';
import Leaderboard from './pages/Leaderboard';
import Certificate from './pages/Certificate';
import CreateCourse from './pages/CreateCourse';
import Browse from './pages/Browse';
import Anything from './pages/Anything';
import Logos from './pages/Logos';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Slides from './pages/Slides';
import Import from './pages/Import';
import { HC } from './theme';
import { ThemeProvider } from './lib/theme';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: HC.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: HC.mute }}>
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <StoreProvider userId={user?.id} userEmail={user?.email}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/certificate/:id" element={<Certificate />} />
          <Route path="/logos" element={<Logos />} />
          <Route path="/slides" element={<Slides />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />

          {/* Protected */}
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><NewCourse /></RequireAuth>} />
          <Route path="/learn/:id" element={<RequireAuth><Learn /></RequireAuth>} />
          <Route path="/quiz/:courseId/:modIdx/:lessonIdx" element={<RequireAuth><Quiz /></RequireAuth>} />
          <Route path="/quiz-any" element={<RequireAuth><GeneralQuiz /></RequireAuth>} />
          <Route path="/create" element={<RequireAuth><CreateCourse /></RequireAuth>} />
          <Route path="/anything" element={<RequireAuth><Anything /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/import" element={<Import />} />
          <Route path="/udemy-test" element={<Navigate to="/import" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
