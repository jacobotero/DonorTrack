import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/donors", icon: Users, label: "Donors" },
  { to: "/donations", icon: DollarSign, label: "Donations" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/tax-letters", icon: FileText, label: "Tax Letters" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-emerald-700">DonorTrack</h1>
        {user?.organization && (
          <p className="text-sm text-gray-500 mt-1 truncate">
            {user.organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 truncate mb-2">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={closeMobileMenu}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
