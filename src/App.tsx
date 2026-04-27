import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store';
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

export default function App() {
  return (
    <StoreProvider>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
