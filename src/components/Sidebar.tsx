type SidebarLink = {
  label: string;
  onClick: () => void;
  active?: boolean;
};

type SidebarProps = {
  email?: string;
  links: SidebarLink[];
  onLogout: () => void;
};

function Sidebar({ email, links, onLogout }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-violet-100 flex flex-col">
      <div className="px-4 py-5 border-b border-violet-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-gray-800 font-semibold text-sm tracking-tight">Mini ATS</span>
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
                ? "bg-violet-100 text-violet-700 font-medium"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-violet-100">
        {email && <p className="text-xs text-gray-400 truncate mb-2">{email}</p>}
        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-violet-600 transition-colors cursor-pointer"
        >
          Logga ut
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
