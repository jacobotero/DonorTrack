import { NavLink, Link } from "react-router-dom";
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
  Lock,
  Heart,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useState } from "react";

const navItems = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/donors", icon: Users, label: "Donors" },
  { to: "/app/donations", icon: DollarSign, label: "Donations" },
  { to: "/app/reports", icon: BarChart3, label: "Reports" },
  { to: "/app/tax-letters", icon: FileText, label: "Tax Letters" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
  { to: "/app/support", icon: LifeBuoy, label: "Support" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
          <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          DonorTrack
        </Link>
        {user?.organization && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {user.organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isRestricted =
            item.label === "Tax Letters" &&
            user?.organization?.subscriptionTier === "STARTER";

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isRestricted && (
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={closeMobileMenu}
          className="absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
