import { Link, useLocation } from 'react-router-dom';
import { Shield, Search, LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Navbar({ user }: { user: User | null }) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Cyber<span className="text-emerald-500">WHOIS</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 md:gap-4">
          <Link
            to="/lookup"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/lookup') ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Lookup</span>
          </Link>

          {user && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          )}

          <div className="h-4 w-px bg-white/10 mx-2 hidden md:block" />

          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logged in as</span>
                <span className="text-xs font-medium text-emerald-500">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden md:inline">Login</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden md:inline">Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
