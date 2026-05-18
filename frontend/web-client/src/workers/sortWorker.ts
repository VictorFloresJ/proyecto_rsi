// Web Worker to offload heavy sorting operations from the main UI thread
self.onmessage = (e) => {
  const { games, sortBy } = e.data;
  
  if (!games || !Array.isArray(games)) {
    self.postMessage({ sortedGames: [] });
    return;
  }
  
  // Simulate heavy processing (if needed for very large arrays)
  const sorted = [...games].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'discount') return b.discount_percentage - a.discount_percentage;
    if (sortBy === 'score') return b.score - a.score;
    // Default: title
    return a.title.localeCompare(b.title);
  });
  
  self.postMessage({ sortedGames: sorted });
};
