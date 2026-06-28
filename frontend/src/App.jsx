import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import MobileShell from './components/MobileShell';
import DesktopLayout from './components/DesktopLayout';
import WorkerLayout from './worker/WorkerLayout';
import RoleRedirect, { WorkerGuard, AuthorityGuard } from './components/RoleRedirect';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import IssueDetailPage from './pages/IssueDetailPage';
import FeedPage from './pages/FeedPage';
import DashboardPage from './pages/DashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import PortalLoginPage from './pages/PortalLoginPage';
import WorkerJobsPage from './worker/WorkerJobsPage';
import WorkerJobDetailPage from './worker/WorkerJobDetailPage';
import WorkerActiveJobPage from './worker/WorkerActiveJobPage';
import WorkerMaterialsPage from './worker/WorkerMaterialsPage';
import WorkerProfilePage from './worker/WorkerProfilePage';
import WorkerVoicePage from './worker/WorkerVoicePage';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PortalLoginPage />} />
          <Route path="/worker/login" element={<Navigate to="/login?portal=worker" replace />} />

          <Route path="/dashboard" element={
            <AuthorityGuard>
              <DesktopLayout>
                <DashboardPage />
              </DesktopLayout>
            </AuthorityGuard>
          } />

          <Route path="/worker/*" element={
            <WorkerGuard>
              <MobileShell>
                <WorkerLayout>
                  <Routes>
                    <Route path="jobs" element={<WorkerJobsPage />} />
                    <Route path="jobs/:id" element={<WorkerJobDetailPage />} />
                    <Route path="jobs/:id/active" element={<WorkerActiveJobPage />} />
                    <Route path="jobs/:id/materials" element={<WorkerMaterialsPage />} />
                    <Route path="profile" element={<WorkerProfilePage />} />
                    <Route path="voice" element={<WorkerVoicePage />} />
                  </Routes>
                </WorkerLayout>
              </MobileShell>
            </WorkerGuard>
          } />

          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<RoleRedirect />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/report/anonymous" element={<ReportPage anonymous />} />
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
