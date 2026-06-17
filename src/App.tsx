import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { ThemeProvider } from "./context/ThemeContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerOverviewPage from "./pages/CustomerOverviewPage";
import CustomerCandidatesPage from "./pages/CustomerCandidatesPage";
import JobDetailPage from "./pages/JobDetailPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import TeamPage from "./pages/TeamPage";
import AllJobsPage from "./pages/AllJobsPage";
import AllCandidatesPage from "./pages/AllCandidatesPage";
import CompanyDetailPage from "./pages/CompanyDetailPage";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={session ? <Navigate to="/overview" /> : <LoginPage />} />
          <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/overview" element={session ? <CustomerOverviewPage /> : <Navigate to="/" />} />
          <Route path="/dashboard" element={session ? <CustomerDashboard /> : <Navigate to="/" />} />
          <Route path="/my-candidates" element={session ? <CustomerCandidatesPage /> : <Navigate to="/" />} />
          <Route path="/jobs/:id" element={session ? <JobDetailPage /> : <Navigate to="/" />} />
          <Route path="/activity" element={session ? <ActivityLogPage /> : <Navigate to="/" />} />
          <Route path="/team" element={session ? <TeamPage /> : <Navigate to="/" />} />
          <Route path="/all-jobs" element={session ? <AllJobsPage /> : <Navigate to="/" />} />
          <Route path="/candidates" element={session ? <AllCandidatesPage /> : <Navigate to="/" />} />
          <Route path="/companies/:id" element={session ? <CompanyDetailPage /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
