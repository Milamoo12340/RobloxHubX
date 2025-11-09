import { FriendActivity } from "../FriendActivity";

export default function FriendActivityExample() {
  const mockFriends = [
    {
      id: "1",
      name: "GamerKing_99",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GamerKing",
      status: "in-game" as const,
      currentGame: "Blox Fruits",
    },
    {
      id: "2",
      name: "ProPlayer_TTV",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProPlayer",
      status: "online" as const,
    },
    {
      id: "3",
      name: "NinjaSpeed",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NinjaSpeed",
      status: "in-game" as const,
      currentGame: "Tower Defense",
    },
    {
      id: "4",
      name: "EliteGamer",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=EliteGamer",
      status: "offline" as const,
    },
  ];

  return (
    <div className="p-4 max-w-md">
      <FriendActivity friends={mockFriends} />
    </div>
  );
}
