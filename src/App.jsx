import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { useAppState } from "./state/AppStateContext";
import NavBar from "./components/NavBar";
import Onboarding from "./screens/Onboarding";
import Home from "./screens/Home";
import Focus from "./screens/Focus";
import Report from "./screens/Report";
import Progress from "./screens/Progress";
import Settings from "./screens/Settings";

// React Router doesn't reset scroll position on navigation by default. Without
// this, switching from a tall, scrolled-down screen (e.g. Home) to a short one
// (e.g. Focus) lands you mid-page with blank space above the content — which
// on iOS can also make the fixed bottom nav appear to jump position.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/report" element={<Report />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NavBar />
    </>
  );
}

function App() {
  const { state } = useAppState();
  const location = useLocation();

  if (!state.onboardingComplete) {
    // Allow /focus so "Start a reclaim session" at the end of onboarding
    // can still land there once onboarding actually completes; otherwise
    // gate everything behind onboarding.
    if (location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}

export default App;
