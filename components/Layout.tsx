import React from 'react';
import { Home, Receipt, Settings, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: Home },
    { id: 'parcelas', label: 'Parcelas', icon: Receipt },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center h-16 px-6 border-b border-slate-100">
          <div className="bg-indigo-600 p-1.5 rounded-lg mr-3">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">Gestão Apto</span>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-colors
                  ${isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-100">
           <div className="flex items-center px-4 py-3 text-sm text-slate-500">
              <Settings className="w-5 h-5 mr-3" />
              <span>Configurações</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center h-16 px-6 bg-white border-b border-slate-200 lg:hidden">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 font-semibold text-slate-800">
            {navItems.find(n => n.id === activeTab)?.label}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
