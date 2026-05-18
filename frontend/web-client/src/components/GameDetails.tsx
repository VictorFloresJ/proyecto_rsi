import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Info, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Props {
  game: any;
  userId: number;
  apiGateway: string;
  onClose: () => void;
  onRatingSubmitted?: () => void;
}

export default function GameDetails({ game, userId, apiGateway, onClose, onRatingSubmitted }: Props) {
  const [isPurchased, setIsPurchased] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user ratings
        const ratingsRes = await axios.get(`${apiGateway}/users/${userId}/ratings`);
        const existingRating = ratingsRes.data.find((r: any) => r.game_id === (game._id || game.id));
        if (existingRating) {
          setRating(existingRating.rating);
        }
        
        // Fetch user purchases
        const purchasesRes = await axios.get(`${apiGateway}/users/${userId}/purchases`);
        const isBought = purchasesRes.data.includes(game._id || game.id);
        setIsPurchased(isBought);
      } catch (err) {
        console.error("Failed to load user game data:", err);
      }
    };
    fetchUserData();
  }, [game, userId, apiGateway]);

  const handleBuy = async () => {
    try {
      await axios.post(`${apiGateway}/users/${userId}/purchases`, {
        game_id: game._id || game.id
      });
      setIsPurchased(true);
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }
    } catch (error) {
      console.error("Failed to purchase game:", error);
    }
  };

  const handleRate = async (value: number) => {
    try {
      await axios.post(`${apiGateway}/ratings`, {
        user_id: userId,
        game_id: game._id || game.id,
        rating: value
      });
      setRating(value);
      
      // Force refresh the ML matrix
      await axios.post(`${apiGateway}/recommend/refresh`);
      
      // Tell parent to reload recommendations
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }
    } catch (error) {
      console.error("Failed to submit rating", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-steam-dark w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col transform transition-all border border-white/10 rounded-2xl shadow-glass">
        
        {/* Steam Style Top Bar */}
        <div className="bg-white/5 backdrop-blur-md flex justify-between items-center p-5 border-b border-white/10 sticky top-0 z-20">
          <h2 className="text-2xl font-bold tracking-wide text-white drop-shadow-sm">{game.title}</h2>
          <button 
            onClick={onClose}
            className="text-steam-blue hover:text-white transition-all duration-300 flex items-center gap-1 text-sm bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 shadow-sm"
          >
            <X size={16} /> Close
          </button>
        </div>

        <div className="p-0">
          <div className="bg-glass-gradient p-6 pb-10">
            {/* White-Box Recommendation Explanation */}
            {game.explanation && (
              <div className="mb-6 p-4 bg-[#111822] border border-[#2a475e] flex gap-3 items-start">
                <Info className="text-[#67c1f5] flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-[#67c1f5] mb-1">RECOMENDADO PARA TI</h4>
                  <p className="text-[#8f98a0] text-sm">{game.explanation}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              {/* Media Area */}
              <div className="w-full md:w-2/3 bg-black aspect-video relative flex items-center justify-center border border-white/10 rounded-xl overflow-hidden shadow-lg group">
                {game.image_url ? (
                  <img src={game.image_url} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1b2838] to-[#2a475e] opacity-30"></div>
                    <span className="text-[#3a4f66] z-10 font-bold tracking-widest text-xl">GAME PREVIEW</span>
                  </>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="w-full md:w-1/3 flex flex-col">
                <div className="mb-4">
                  {game.image_url ? (
                    <img src={game.image_url} alt="Game capsule" className="w-full h-auto mb-4 border border-black" />
                  ) : (
                    <img src="https://placehold.co/400x200/171a21/67c1f5?text=Capsule+Image" alt="Game capsule" className="w-full h-auto mb-4 border border-black" />
                  )}
                  <p className="text-[#c6d4df] text-sm leading-relaxed mb-4 line-clamp-4">
                    {game.description}
                  </p>
                </div>

                <div className="text-xs text-[#556772] space-y-2 flex-1">
                  <div className="flex">
                    <span className="w-24">RESEÑAS:</span>
                    <span className="text-[#66c0f4]">Muy Positivas</span>
                  </div>
                  <div className="flex">
                    <span className="w-24">FECHA:</span>
                    <span className="text-[#8f98a0]">{new Date(game.release_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24">DESARROLLADOR:</span>
                    <span className="text-[#66c0f4] hover:text-white cursor-pointer">{game.developer}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#316282]/30">
                  <div className="text-[#556772] text-[11px] uppercase mb-1">Etiquetas populares para este producto:</div>
                  <div className="flex flex-wrap gap-1">
                    {game.genres?.map((g: string) => (
                      <span key={g} className="text-[#66c0f4] bg-[#22394c] px-2 py-0.5 text-[11px] rounded-[2px] cursor-pointer hover:bg-[#66c0f4] hover:text-white transition-colors">{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Purchase Area */}
          <div className="max-w-4xl mx-auto -mt-6 relative z-10 px-4">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-glass">
              <h1 className="text-xl text-white font-bold tracking-wide">{isPurchased ? "Ya tienes " + game.title : "Comprar " + game.title}</h1>
              
              <div className="flex rounded-lg overflow-hidden shadow-lg">
                {!isPurchased ? (
                  <>
                    {game.discount_percentage > 0 ? (
                      <>
                        <div className="bg-[#4c6b22] text-[#a4d007] text-2xl font-normal px-2 flex items-center">
                          -{game.discount_percentage}%
                        </div>
                        <div className="bg-[#344654] px-2 py-1 flex flex-col justify-center">
                          <div className="text-[11px] text-[#738895] line-through leading-none">${game.price.toFixed(2)}</div>
                          <div className="text-[#acdbf5] text-sm leading-none mt-1">${(game.price * (1 - game.discount_percentage/100)).toFixed(2)}</div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-[#344654] px-4 py-2 flex items-center justify-center text-[#acdbf5]">
                        ${game.price.toFixed(2)}
                      </div>
                    )}
                    
                    <button onClick={handleBuy} className="glass-button-primary text-[15px] px-8 py-2.5 ml-1">
                      Buy
                    </button>
                  </>
                ) : (
                  <div className="bg-[#344654] px-4 py-2 flex gap-4 items-center justify-center text-[#acdbf5]">
                    <span className="text-sm font-medium mr-2">¿Te gustó el juego?</span>
                    <button 
                      onClick={() => handleRate(5.0)}
                      className={`p-2 rounded-sm transition-colors ${rating === 5.0 ? 'bg-[#66c0f4] text-white' : 'bg-[#1b2838] hover:bg-[#2a475e] text-[#66c0f4]'}`}
                      title="Me gustó"
                    >
                      <ThumbsUp size={20} />
                    </button>
                    <button 
                      onClick={() => handleRate(1.0)}
                      className={`p-2 rounded-sm transition-colors ${rating === 1.0 ? 'bg-red-500 text-white' : 'bg-[#1b2838] hover:bg-[#2a475e] text-[#66c0f4]'}`}
                      title="No me gustó"
                    >
                      <ThumbsDown size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-8 mb-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-[#c6d4df] uppercase text-sm font-bold tracking-wider border-b border-[#2a475e] pb-1 mb-4">Acerca de este juego</h2>
              <p className="text-[#acb2b8] text-sm leading-relaxed whitespace-pre-line">
                {game.description}
              </p>
            </div>
            
            <div>
              <h2 className="text-[#c6d4df] uppercase text-sm font-bold tracking-wider border-b border-[#2a475e] pb-1 mb-4">Requisitos del Sistema</h2>
              <div className="text-[#8f98a0] text-xs leading-relaxed space-y-2 bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 break-words shadow-sm">
                <p><strong className="text-[#c6d4df]">SO:</strong> {game.system_requirements?.os || 'Windows 10 64-bit'}</p>
                <p><strong className="text-[#c6d4df]">Procesador:</strong> {game.system_requirements?.processor || 'Intel Core i5'}</p>
                <p><strong className="text-[#c6d4df]">Memoria:</strong> {game.system_requirements?.memory || '8 GB RAM'}</p>
                <p><strong className="text-[#c6d4df]">Gráficos:</strong> {game.system_requirements?.graphics || 'NVIDIA GTX 970'}</p>
                {game.system_requirements?.raw_steam_reqs && (
                   <div className="mt-4 pt-4 border-t border-[#2a475e]">
                     <strong className="text-[#c6d4df]">Detalles adicionales:</strong>
                     <p className="mt-2 text-[#556772] italic line-clamp-5">{game.system_requirements.raw_steam_reqs}</p>
                   </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
