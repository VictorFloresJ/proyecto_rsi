import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import GameDetails from './GameDetails';
import { Loader2, Search, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  userId: number;
  apiGateway: string;
  activeTab: 'store' | 'library';
}

export default function GameFeed({ userId, apiGateway, activeTab }: Props) {
  const [view, setView] = useState<'home' | 'recommended'>('home');
  const [recommendedGames, setRecommendedGames] = useState<any[]>([]);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [sortBy, setSortBy] = useState('score');
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [purchasedGameIds, setPurchasedGameIds] = useState<Set<string>>(new Set());
  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  
  const workerRef = useRef<Worker>();
  const observer = useRef<IntersectionObserver | null>(null);

  const lastGameElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingAll) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setSkip(prevSkip => prevSkip + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingAll, hasMore]);

  // Load Recommended
  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const recsResponse = await axios.post(`${apiGateway}/recommend`, {
        user_id: userId,
        limit: 20
      });
      
      const recommendations = recsResponse.data;
      const gamePromises = recommendations.map(async (r: any) => {
        try {
          const gameRes = await axios.get(`${apiGateway}/games/${r.game_id}`);
          return { ...gameRes.data, score: r.score, explanation: r.explanation };
        } catch (e) {
          return null;
        }
      });
      
      const fullGames = (await Promise.all(gamePromises)).filter(g => g !== null);
      
      // Sort in worker
      if (workerRef.current) {
        workerRef.current.postMessage({ games: fullGames, sortBy });
      } else {
        setRecommendedGames(fullGames);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Load All Games
  const fetchAllGames = async (currentSkip: number) => {
    setLoadingAll(true);
    try {
      const res = await axios.get(`${apiGateway}/games?skip=${currentSkip}&limit=20`);
      if (res.data.length < 20) {
        setHasMore(false);
      }
      setAllGames(prev => currentSkip === 0 ? res.data : [...prev, ...res.data]);
    } catch (error) {
      console.error("Failed to fetch all games", error);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`${apiGateway}/users/${userId}/purchases`);
      setPurchasedGameIds(new Set(res.data));
    } catch (err) {
      console.error("Failed to fetch purchases:", err);
    }
  };

  const fetchLibraryDetails = async (ids: Set<string>) => {
    if (ids.size === 0) {
      setLibraryGames([]);
      return;
    }
    setLoadingLibrary(true);
    try {
      const gamePromises = Array.from(ids).map(async (id) => {
        try {
          const res = await axios.get(`${apiGateway}/games/${id}`);
          return res.data;
        } catch (e) {
          return null;
        }
      });
      const fullGames = (await Promise.all(gamePromises)).filter(g => g !== null);
      setLibraryGames(fullGames);
    } catch (error) {
      console.error("Failed to fetch library games", error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/sortWorker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      setRecommendedGames(e.data.sortedGames);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    fetchRecommendations();
    fetchPurchases();
  }, [userId, apiGateway]);

  useEffect(() => {
    if (view === 'home') {
      fetchAllGames(skip);
    }
  }, [skip, view]);

  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibraryDetails(purchasedGameIds);
    }
  }, [activeTab, purchasedGameIds]);

  const handleRatingSubmitted = () => {
    fetchRecommendations();
    fetchPurchases();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSortBy(newSort);
    workerRef.current?.postMessage({ games: recommendedGames, sortBy: newSort });
  };

  const nextCarousel = () => {
    if (carouselIndex < Math.min(recommendedGames.length, 8) - 1) {
      setCarouselIndex(prev => prev + 1);
    }
  };

  const prevCarousel = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(prev => prev - 1);
    }
  };

  const filteredAllGames = allGames.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !purchasedGameIds.has(game._id || game.id)
  );
  
  const filteredRecommendedGames = recommendedGames.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !purchasedGameIds.has(game._id || game.id)
  );

  const filteredLibraryGames = libraryGames.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingRecs && recommendedGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-steam-blue animate-spin mb-4" />
        <p className="text-steam-text text-sm">Cargando tus recomendaciones...</p>
      </div>
    );
  }

  const renderGameCard = (game: any, isLast: boolean = false) => (
    <div 
      ref={isLast ? lastGameElementRef : null}
      key={game._id || game.id} 
      className="flex h-24 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-steam-blue/50 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 mb-3 overflow-hidden animate-fade-in-up"
      onClick={() => setSelectedGame(game)}
    >
      <div className="w-48 h-full bg-[#111822] relative flex-shrink-0">
         {game.image_url ? (
           <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" />
         ) : (
           <div className="absolute inset-0 bg-gradient-to-tr from-[#1b2838] to-[#2a475e] opacity-50"></div>
         )}
      </div>
      
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-[15px] text-[#c6d4df] truncate mb-1">{game.title}</h3>
          <div className="flex gap-2 mb-1 items-center">
            {game.score !== undefined && (
              <span className="text-xs font-bold text-steam-blue bg-steam-blue/10 border border-steam-blue/20 px-1.5 py-0.5 rounded-md shadow-sm">
                {game.score.toFixed(2)} Score
              </span>
            )}
            <span className="text-xs font-semibold text-steam-green bg-steam-green/10 border border-steam-green/20 px-1.5 py-0.5 rounded-md">Muy Positivas</span>
          </div>
          <div className="flex gap-1 truncate max-w-md">
            {game.genres?.map((g: string, i: number) => (
              <span key={g} className="text-xs text-[#8f98a0]">{g}{i < game.genres.length - 1 ? ',' : ''}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center pr-4 min-w-[120px] justify-end">
        {activeTab === 'library' ? (
          <span className="text-xs font-bold text-steam-green bg-steam-green/10 border border-steam-green/20 px-3 py-1.5 rounded-lg shadow-sm">
            Adquirido
          </span>
        ) : game.discount_percentage > 0 ? (
          <div className="flex bg-black rounded-lg overflow-hidden border border-white/5 shadow-md">
            <div className="bg-[#4c6b22] text-[#a4d007] font-bold text-sm px-2 py-1 flex items-center">
              -{game.discount_percentage}%
            </div>
            <div className="bg-[#344654] px-2.5 py-1 flex flex-col items-end justify-center">
              <span className="text-[10px] text-[#738895] line-through leading-none mb-0.5">${game.price.toFixed(2)}</span>
              <span className="text-sm font-semibold text-[#acdbf5] leading-none">${(game.price * (1 - game.discount_percentage/100)).toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm font-semibold text-[#c6d4df] bg-[#344654] px-3.5 py-1.5 rounded-lg border border-white/5 shadow-sm">
            ${game.price.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex space-x-1 text-sm text-[#8f98a0]">
          {activeTab === 'store' ? (
            <>
              <button onClick={() => setView('home')} className="hover:text-white">Catálogo</button>
              {view === 'recommended' && (
                <>
                  <span> &gt; </span>
                  <span className="text-white">Recomendados para ti</span>
                </>
              )}
            </>
          ) : (
            <span className="text-white font-semibold uppercase tracking-wider">Tu Biblioteca</span>
          )}
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="buscar en la tienda" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 backdrop-blur-md text-white placeholder-steam-text/50 text-sm pl-4 pr-8 py-1.5 rounded-full border border-white/10 focus:outline-none focus:border-steam-blue focus:ring-1 focus:ring-steam-blue transition-all"
          />
          <Search size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-steam-text/50" />
        </div>
      </div>

      {activeTab === 'store' && view === 'home' && (
        <>
          {/* Carousel Section */}
          <div className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl text-white font-normal uppercase tracking-wide">Destacados y Recomendados</h2>
              <button onClick={() => setView('recommended')} className="text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-steam-blue px-4 py-1.5 rounded-full transition-all backdrop-blur-sm shadow-sm">
                Ver todos ({recommendedGames.length})
              </button>
            </div>
            
            {recommendedGames.length > 0 && (
              <div className="relative group rounded-2xl shadow-2xl bg-black/50 border border-white/5">
                <div 
                  className="w-full aspect-[21/9] bg-[#111822] relative cursor-pointer overflow-hidden rounded-2xl group-hover:shadow-glow transition-all duration-500"
                  onClick={() => setSelectedGame(recommendedGames[carouselIndex])}
                >
                  <img src={recommendedGames[carouselIndex].image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] via-transparent to-transparent opacity-90"></div>
                  
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <h3 className="text-3xl font-bold text-white mb-2 shadow-black drop-shadow-md">{recommendedGames[carouselIndex].title}</h3>
                    <div className="flex items-center gap-4">
                      {recommendedGames[carouselIndex].score !== undefined && (
                        <span className="bg-steam-blue/20 backdrop-blur-md border border-steam-blue/30 text-steam-blue px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
                          {recommendedGames[carouselIndex].score.toFixed(2)} Score
                        </span>
                      )}
                      <div className="text-white font-bold bg-black/50 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-lg shadow-lg">
                        ${recommendedGames[carouselIndex].price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); prevCarousel(); }} 
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-black/80 to-transparent p-4 h-full flex items-center justify-center hover:from-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={32} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextCarousel(); }} 
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-black/80 to-transparent p-4 h-full flex items-center justify-center hover:from-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={32} />
                </button>
                
                <div className="absolute bottom-4 right-6 flex gap-1">
                  {recommendedGames.slice(0, 8).map((_, idx) => (
                    <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === carouselIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Infinite Scroll All Games Section */}
          <div>
            <div className="flex justify-between items-center mb-4 bg-white/5 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-sm mt-8">
              <h2 className="text-lg text-white font-semibold tracking-wider pl-2">EXPLORAR TODO EL CATÁLOGO</h2>
            </div>
            <div className="flex flex-col gap-0 mb-10">
              {filteredAllGames.length > 0 ? (
                filteredAllGames.map((game, index) => renderGameCard(game, index === filteredAllGames.length - 1))
              ) : (
                <div className="text-steam-text text-sm py-8 text-center bg-black/20 rounded-lg">
                  No se encontraron juegos para "{searchQuery}"
                </div>
              )}
            </div>
            {loadingAll && (
               <div className="flex justify-center py-8">
                 <Loader2 className="w-8 h-8 text-steam-blue animate-spin" />
               </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'store' && view === 'recommended' && (
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-6 bg-white/5 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-sm mt-4">
            <h2 className="text-lg text-white font-semibold tracking-wider pl-2 uppercase">Recomendados para ti</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-steam-text uppercase font-semibold">Ordenar por:</span>
              <select 
                value={sortBy} 
                onChange={handleSortChange}
                className="bg-black/50 border border-white/10 text-xs text-white px-3 py-1.5 rounded-md hover:bg-white/5 focus:outline-none focus:border-steam-blue focus:ring-1 focus:ring-steam-blue transition-all backdrop-blur-sm"
              >
                <option value="score" className="bg-[#171a21] text-white">Relevancia</option>
                <option value="discount" className="bg-[#171a21] text-white">Mayor Descuento</option>
                <option value="price_asc" className="bg-[#171a21] text-white">Menor Precio</option>
                <option value="price_desc" className="bg-[#171a21] text-white">Mayor Precio</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-0 mb-10">
            {filteredRecommendedGames.length > 0 ? (
              filteredRecommendedGames.map((game) => renderGameCard(game))
            ) : (
              <div className="text-steam-text text-sm py-8 text-center bg-black/20 rounded-lg">
                No se encontraron recomendaciones para "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-6 bg-white/5 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-sm mt-4">
            <h2 className="text-lg text-white font-semibold tracking-wider pl-2 uppercase">Juegos Adquiridos</h2>
          </div>

          {loadingLibrary ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-steam-blue animate-spin mb-4" />
              <p className="text-steam-text text-sm">Cargando biblioteca...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0 mb-10">
              {filteredLibraryGames.length > 0 ? (
                filteredLibraryGames.map((game) => renderGameCard(game))
              ) : (
                <div className="text-steam-text text-sm py-12 text-center bg-black/20 rounded-lg border border-white/5">
                  {searchQuery ? (
                    `No se encontraron juegos para "${searchQuery}" en tu biblioteca.`
                  ) : (
                    "Aún no tienes juegos en tu biblioteca. ¡Explora la tienda para adquirir algunos!"
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedGame && (
        <GameDetails 
          game={selectedGame} 
          userId={userId} 
          apiGateway={apiGateway} 
          onClose={() => setSelectedGame(null)} 
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
}
