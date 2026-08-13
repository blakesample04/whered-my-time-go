import { NavLink } from "react-router-dom";
import "./NavBar.css";

const TABS = [
  { to: "/", label: "Home", icon: "⏳", end: true },
  { to: "/focus", label: "Focus", icon: "◎" },
  { to: "/report", label: "Report", icon: "◱" },
  { to: "/progress", label: "Progress", icon: "✦" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function NavBar() {
  return (
    <div className="nav-bar-wrap">
      {/* replace, not push: tab switches shouldn't stack browser history —
          otherwise iOS's edge-swipe-back gesture cycles through past tabs
          in a way that looks like broken swipe-to-switch behavior. */}
      <nav className="nav-bar" aria-label="Primary">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            replace
            className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}
          >
            <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
