import { NewsCard } from "../NewsCard";

export default function NewsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <NewsCard
        id="1"
        title="New Winter Event Launches Today"
        excerpt="Get ready for snow-covered adventures with exclusive rewards and limited-time challenges in this year's biggest update."
        image="https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=400&h=225&fit=crop"
        category="Events"
        timestamp="2 hours ago"
      />
      <NewsCard
        id="2"
        title="Performance Update: 60% Faster Loading"
        excerpt="We've optimized game loading times and reduced lag with our latest engine improvements. Read about the technical details."
        image="https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=225&fit=crop"
        category="Updates"
        timestamp="1 day ago"
      />
    </div>
  );
}
