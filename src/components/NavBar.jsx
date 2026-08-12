import { NavLink } from "react-router-dom";
import "./NavBar.css";

const TABS = [
  { to: "/", label: "Home", icon: "⏱", end: true },
  { to: "/focus", label: "Focus", icon: "🎯" },
  { to: "/report", label: "Report", icon: "📊" },
  { to: "/progress", label: "Progress", icon: "🏆" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function NavBar() {
  return (
    <nav className="nav-bar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}
        >
          <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
