import { useState } from 'react';
import axios from 'axios';
import OnboardingWizard from './components/OnboardingWizard';
import GameFeed from './components/GameFeed';
import Login from './components/Login';
import { LogOut, RefreshCw, Menu } from 'lucide-react';

const API_GATEWAY = 'http://localhost:8000';

function App() {
  const [userId, setUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('nexusplay_user_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [isOnboarding, setIsOnboarding] = useState<boolean>(() => {
    const saved = localStorage.getItem('nexusplay_is_onboarding');
    return saved === 'true';
  });
  const [activeTab, setActiveTab] = useState<'store' | 'library'>('store');

  const handleLogin = (id: number, hasPreferences: boolean) => {
    setUserId(id);
    localStorage.setItem('nexusplay_user_id', id.toString());
    
    const needsOnboard = !hasPreferences;
    setIsOnboarding(needsOnboard);
    localStorage.setItem('nexusplay_is_onboarding', needsOnboard.toString());
  };

  const handleLogout = () => {
    setUserId(null);
    setIsOnboarding(false);
    localStorage.removeItem('nexusplay_user_id');
    localStorage.removeItem('nexusplay_is_onboarding');
  };

  const handleReset = async () => {
    if (!userId) return;
    try {
      // Clear preferences in the backend (which clears ratings/purchases)
      await axios.put(`${API_GATEWAY}/users/${userId}/preferences`, {});
      // Force reload model data cache
      await axios.post(`${API_GATEWAY}/recommend/refresh`);
      setIsOnboarding(true);
      localStorage.setItem('nexusplay_is_onboarding', 'true');
    } catch (err) {
      console.error('Failed to reset preferences:', err);
    }
  };

  const handleOnboardComplete = async (preferences: any) => {
    try {
      if (userId) {
        await axios.put(`${API_GATEWAY}/users/${userId}/preferences`, preferences);
        // Force reload model data cache
        await axios.post(`${API_GATEWAY}/recommend/refresh`);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
    setIsOnboarding(false);
    localStorage.setItem('nexusplay_is_onboarding', 'false');
  };

  return (
    <div className="min-h-screen bg-steam-dark text-steam-text flex flex-col font-sans">
      {/* Steam Top Navigation Bar */}
      <header className="bg-[#0f1724]/80 backdrop-blur-md border-b border-[#2a475e]/50 shadow-glass sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-[72px]">
          <div className="flex items-center mr-10 gap-2">
            <div className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">
              NEXUS<span className="text-steam-blue">PLAY</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center h-full gap-2">
            <button 
              onClick={() => setActiveTab('store')} 
              className={`h-full flex items-center px-4 uppercase font-bold text-sm border-b-[3px] transition-all ${activeTab === 'store' ? 'border-steam-blue text-white' : 'border-transparent text-steam-text hover:text-white hover:border-white/20'}`}
            >
              STORE
            </button>
            <button 
              onClick={() => setActiveTab('library')} 
              className={`h-full flex items-center px-4 uppercase font-bold text-sm border-b-[3px] transition-all ${activeTab === 'library' ? 'border-steam-blue text-white' : 'border-transparent text-steam-text hover:text-white hover:border-white/20'}`}
            >
              LIBRARY
            </button>
          </nav>
          
          <div className="flex-1"></div>

          {userId && (
            <div className="flex items-center gap-4 text-xs font-medium bg-black/40 backdrop-blur-sm p-1.5 pr-3 rounded-full border border-white/10 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-steam-blue to-[#252830] border border-white/20 flex items-center justify-center text-white font-bold shadow-glow">
                  U{userId}
                </div>
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-[#8f98a0] text-[10px] uppercase font-bold tracking-wider">WALLET</span>
                  <span className="text-steam-blue-light font-semibold">$0.00</span>
                </div>
              </div>
              <div className="h-6 w-px bg-white/10 mx-1"></div>
              <button 
                onClick={handleReset}
                className="text-[#8f98a0] hover:text-white transition-colors flex items-center gap-1"
                title="Reset Profile (Clear Preferences)"
              >
                <RefreshCw size={14} /> <span className="hidden sm:inline">Reset</span>
              </button>
              <button 
                onClick={handleLogout}
                className="text-[#8f98a0] hover:text-white transition-colors flex items-center gap-1 ml-1"
                title="Logout"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 bg-steam-gradient overflow-x-hidden pt-8 pb-16">
        <div className="max-w-5xl mx-auto px-4">
          {!userId ? (
            <Login apiGateway={API_GATEWAY} onLogin={handleLogin} />
          ) : isOnboarding ? (
            <OnboardingWizard onComplete={handleOnboardComplete} />
          ) : (
            <GameFeed userId={userId} apiGateway={API_GATEWAY} activeTab={activeTab} />
          )}
        </div>
      </main>
      
      {/* Simple Footer */}
      <footer className="bg-[#171a21] py-8 border-t border-black text-center text-steam-muted text-xs">
        <p>© 2026 NexusPlay Corporation. All rights reserved. All trademarks are property of their respective owners.</p>
      </footer>
    </div>
  );
}

export default App;
