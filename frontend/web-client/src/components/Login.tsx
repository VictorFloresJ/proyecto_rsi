import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  preferences?: Record<string, any>;
}

interface LoginProps {
  apiGateway: string;
  onLogin: (userId: number, hasPreferences: boolean) => void;
}

export default function Login({ apiGateway, onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${apiGateway}/users`);
        setUsers(response.data);
        if (response.data.length > 0) {
          setSelectedUserId(response.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setError('Failed to connect to the Steam Network (User Service).');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [apiGateway]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    try {
      const response = await axios.get(`${apiGateway}/users/${selectedUserId}`);
      const user = response.data;
      const hasPreferences = user.preferences && Object.keys(user.preferences).length > 0;
      onLogin(Number(selectedUserId), hasPreferences);
    } catch (err) {
      console.error("Failed to fetch full user profile", err);
      onLogin(Number(selectedUserId), false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-steam-muted animate-spin mb-4" />
        <p className="text-steam-text text-sm">Connecting to NexusPlay network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="bg-[#1b2838] p-8 border border-black shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-[#c6d4df]">Connection Error</h2>
          <p className="text-[#8f98a0] mb-6 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="glass-button-secondary w-full"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[500px] glass-panel overflow-hidden animate-fade-in-up">
        {/* Steam-like Window Header */}
        <div className="bg-black/30 backdrop-blur-sm px-4 py-3 border-b border-white/5 flex justify-between items-center">
          <div className="text-[#8f98a0] text-xs font-bold tracking-widest uppercase">NexusPlay Login</div>
        </div>
        
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-1 text-white uppercase tracking-wider">SIGN IN</h1>
          <p className="text-[#8f98a0] text-sm mb-8">to an existing NexusPlay account</p>

          <form onSubmit={handleSignIn}>
            <div className="mb-6">
              <label className="block text-[#66c0f4] text-xs font-bold uppercase mb-2">
                Account Name (Select Profile)
              </label>
              {users.length > 0 ? (
                <select 
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full bg-black/40 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-steam-blue focus:ring-1 focus:ring-steam-blue transition-all backdrop-blur-sm"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-[#32353c] p-3 text-[#8f98a0] text-sm italic">
                  No accounts found. Please run seeder.
                </div>
              )}
            </div>

            <div className="mb-8">
              <label className="block text-[#8f98a0] text-xs font-bold uppercase mb-2">
                Password
              </label>
              <input 
                type="password" 
                value="••••••••••••"
                disabled
                className="w-full bg-black/40 text-steam-text border border-white/10 rounded-lg px-4 py-3 cursor-not-allowed opacity-70 backdrop-blur-sm"
              />
              <p className="text-xs text-[#8f98a0] mt-2 italic">Password is disabled for dev environment.</p>
            </div>

            <div className="flex flex-col items-center">
              <button 
                type="submit"
                disabled={!selectedUserId}
                className="glass-button-primary w-full py-3 text-lg font-medium tracking-wide uppercase mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In
              </button>
              
              <a href="#" className="text-sm text-[#8f98a0] hover:text-white underline decoration-[#8f98a0] hover:decoration-white transition-colors">
                Help, I can't sign in
              </a>
            </div>
          </form>
        </div>
        
        {/* Footer info */}
        <div className="bg-black/30 backdrop-blur-sm px-8 py-5 border-t border-white/5 flex justify-center">
          <p className="text-[#8f98a0] text-xs">Don't have a NexusPlay account? <a href="#" className="text-white hover:text-[#66c0f4] hover:underline transition-colors">Create a free account</a></p>
        </div>
      </div>
    </div>
  );
}
