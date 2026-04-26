import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  LayoutDashboard, 
  LogOut, 
  Users,
  Settings
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  userName: string;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  userName, 
  onLogout, 
  activeView, 
  setActiveView 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor', 'employee'] },
    { id: 'tasks', label: 'My Tasks', icon: Clock, roles: ['employee', 'manager', 'admin', 'supervisor'] },
    { id: 'manage-users', label: 'Team Management', icon: Users, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'all-tasks', label: 'Task Archive', icon: CheckCircle2, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'reports', label: 'Performance Reports', icon: BarChart3, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-[#E4E3E0] flex flex-col h-screen overflow-hidden">
      <div className="p-8">
        <h1 className="text-2xl font-serif italic text-[#141414] tracking-tight flex items-baseline gap-1">
          TaskMaster <span className="text-[10px] non-italic font-sans font-bold text-[#b4945c] tracking-widest">PRO</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center px-4 py-3 transition-colors text-sm rounded-sm ${
              activeView === item.id 
                ? 'bg-[#F9F9F8] border-l-2 border-[#b4945c] text-[#141414] font-medium' 
                : 'text-[#999] hover:bg-[#F9F9F8] hover:text-[#141414]'
            }`}
          >
            <item.icon size={16} className={`mr-3 ${activeView === item.id ? 'opacity-100' : 'opacity-40'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-[#E4E3E0]">
        <div className="text-[10px] uppercase tracking-widest text-[#999] mb-2 text-center font-bold">Session Identity</div>
        <div className="font-serif italic text-[#141414] text-center truncate mb-6">
          {userName}
          <span className="block text-[8px] non-italic font-sans font-bold text-[#b4945c] tracking-widest uppercase mt-1">{role}</span>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[#999] hover:text-[#141414] text-xs uppercase tracking-widest transition-colors font-bold"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
