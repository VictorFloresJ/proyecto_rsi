// Create MongoDB collections and indexes
db = db.getSiblingDB('catalogdb');

// Create the games collection
db.createCollection('games');

// Create indexes to optimize queries
db.games.createIndex({ "title": 1 });
db.games.createIndex({ "genres": 1 });
db.games.createIndex({ "release_date": -1 });
db.games.createIndex({ "price": 1 });

// We could also do text indexes for search features
db.games.createIndex({ "title": "text", "description": "text" });

print("MongoDB catalogdb initialized successfully with 'games' collection and indexes.");
