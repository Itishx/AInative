import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store';
import { AuthProvider, useAuth } from './lib/auth';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import NewCourse from './pages/NewCourse';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Quiz from './pages/Quiz';
import Leaderboard from './pages/Leaderboard';
import Certificate from './pages/Certificate';
import CreateCourse from './pages/CreateCourse';
import Browse from './pages/Browse';
import Anything from './pages/Anything';
import Logos from './pages/Logos';
import Settings from './pages/Settings';
import { HC } from './theme';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#171410', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.35)' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <StoreProvider userId={user.id} userEmail={user.email}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/new" element={<NewCourse />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn/:id" element={<Learn />} />
          <Route path="/quiz/:courseId/:modIdx/:lessonIdx" element={<Quiz />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/certificate/:id" element={<Certificate />} />
          <Route path="/create" element={<CreateCourse />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/anything" element={<Anything />} />
          <Route path="/logos" element={<Logos />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
