import { GameCard } from "../GameCard";

export default function GameCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <GameCard
        id="1"
        title="Blox Fruits Adventure"
        thumbnail="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop"
        plays={1250000}
        rating={4.8}
        lastPlayed="2 hours ago"
        isNew={true}
        isFavorite={true}
      />
      <GameCard
        id="2"
        title="Tower Defense Simulator"
        thumbnail="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop"
        plays={890000}
        rating={4.6}
        isFavorite={false}
      />
      <GameCard
        id="3"
        title="Adopt Me! Pet Paradise"
        thumbnail="https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=225&fit=crop"
        plays={3200000}
        rating={4.9}
        lastPlayed="1 day ago"
      />
    </div>
  );
}
