import { RecentlyPlayed } from "../RecentlyPlayed";

export default function RecentlyPlayedExample() {
  const mockGames = [
    {
      id: "1",
      title: "Blox Fruits",
      thumbnail: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop",
      lastPlayed: "2h ago",
      playtime: "24h 15m",
    },
    {
      id: "2",
      title: "Tower Defense",
      thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop",
      lastPlayed: "5h ago",
      playtime: "12h 30m",
    },
    {
      id: "3",
      title: "Adopt Me!",
      thumbnail: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=225&fit=crop",
      lastPlayed: "1d ago",
      playtime: "45h 22m",
    },
    {
      id: "4",
      title: "Jailbreak",
      thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=225&fit=crop",
      lastPlayed: "2d ago",
      playtime: "18h 45m",
    },
  ];

  return (
    <div className="p-4">
      <RecentlyPlayed games={mockGames} />
    </div>
  );
}
