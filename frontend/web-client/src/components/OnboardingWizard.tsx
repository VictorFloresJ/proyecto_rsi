import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

const GENRES = ["Action", "RPG", "Adventure", "Strategy", "Shooter", "Sports", "Puzzle", "Simulation", "Indie", "Racing", "Casual", "Massively Multiplayer"];

interface Props {
  onComplete: (preferences: any) => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-[#1b2838] border border-black shadow-lg animate-fade-in-up">
        <div className="bg-gradient-to-r from-[#2a475e] to-[#1b2838] p-6 border-b border-black">
          <h2 className="text-2xl font-bold text-white tracking-wide uppercase mb-2">Welcome to NexusPlay</h2>
          <p className="text-[#8f98a0] text-sm">Select your favorite genres to help us recommend games you'll love.</p>
        </div>

        <div className="p-8">
          <h3 className="text-steam-blue uppercase text-xs font-bold mb-4">POPULAR TAGS</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 text-sm rounded-sm transition-colors border ${
                    isSelected 
                      ? 'bg-[#67c1f5] text-white border-[#67c1f5] shadow-[0_0_5px_rgba(103,193,245,0.4)]' 
                      : 'bg-[#22394c] text-[#67c1f5] border-transparent hover:bg-[#345169] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isSelected && <Check size={14} />}
                    {genre}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-[#2a475e]">
            <button 
              onClick={() => onComplete({ skipped: true, genres: [] })}
              className="text-[#8f98a0] hover:text-white transition-colors text-sm underline decoration-[#8f98a0] hover:decoration-white"
            >
              Skip for now
            </button>
            
            <button 
              onClick={() => onComplete({ genres: selectedGenres })}
              disabled={selectedGenres.length === 0}
              className="glass-button-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
