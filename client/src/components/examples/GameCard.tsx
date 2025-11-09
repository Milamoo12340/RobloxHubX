import { GameCard } from "../GameCard";

export default function GameCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <GameCard
        id="1"
        title="Pet Simulator 99"
        thumbnail="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop"
        plays={1250000}
        rating={4.8}
        launchUrl="roblox://experiences/start?placeId=8737899170"
        webUrl="https://www.roblox.com/games/8737899170"
      />
      <GameCard
        id="2"
        title="Blox Fruits"
        thumbnail="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop"
        plays={890000}
        rating={4.6}
        launchUrl="roblox://experiences/start?placeId=2753915549"
        webUrl="https://www.roblox.com/games/2753915549"
      />
    </div>
  );
}
