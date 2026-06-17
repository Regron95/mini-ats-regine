import { useTheme } from "../context/ThemeContext";

type SidebarLink = {
  label: string;
  onClick: () => void;
  active?: boolean;
};

type SidebarProps = {
  email?: string;
  company?: string;
  role?: "admin" | "customer";
  links: SidebarLink[];
  onLogout: () => void;
};

function Sidebar({ email, company, role, links, onLogout }: SidebarProps) {
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-56 shrink-0 bg-white dark:bg-gray-900 border-r border-violet-100 dark:border-gray-800 flex flex-col">
      <div className="px-4 py-5 border-b border-violet-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-gray-800 dark:text-white font-semibold text-sm tracking-tight">Mini ATS</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => (
          <button
            key={link.label}
            type="button"
            onClick={link.onClick}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              link.active
                ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-violet-100 dark:border-gray-800">
        {role && (
          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-2 ${
            role === "admin"
              ? "bg-amber-100 text-amber-700"
              : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
          }`}>
            {role === "admin" ? "Admin" : "Kund"}
          </span>
        )}
        {company && (
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mb-1">{company}</p>
        )}
        {email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-3">{email}</p>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
          >
            Logga ut
          </button>
          <button
            type="button"
            onClick={toggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title={theme === "dark" ? "Ljust läge" : "Mörkt läge"}
          >
            <span className="text-sm">{theme === "dark" ? "☀" : "🌙"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
