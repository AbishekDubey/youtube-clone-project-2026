
export type Video = {
  id: number;
  title: string;
  channel: string;
  views: string;
  time: string;
  duration: string;
  thumbnail: string;
  avatar: string;
  videoUrl: string;
  category: string;
  description?: string;
  backendId?: string;
  channelId?: string;
};


const videoUrl =
  "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4";

export const videos: Video[] = [
  {
    id: 1,
    title: "Build a Full Stack YouTube Clone with Next.js",
    channel: "Code Academy",
    views: "1.2M views",
    time: "2 days ago",
    duration: "18:42",
    category: "Programming",
    thumbnail:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=12",
    videoUrl,
  },
  {
    id: 2,
    title: "React & TypeScript Complete Course",
    channel: "Programming Hub",
    views: "856K views",
    time: "5 days ago",
    duration: "24:15",
    category: "React",
    thumbnail:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=5",
    videoUrl,
  },
  {
    id: 3,
    title: "Learn Next.js From Scratch",
    channel: "Dev World",
    views: "542K views",
    time: "1 week ago",
    duration: "31:20",
    category: "Next.js",
    thumbnail:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=8",
    videoUrl,
  },
  {
    id: 4,
    title: "Modern Web Development Roadmap 2026",
    channel: "Tech Guide",
    views: "2.4M views",
    time: "2 weeks ago",
    duration: "12:08",
    category: "Web Development",
    thumbnail:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=15",
    videoUrl,
  },
  {
    id: 5,
    title: "Tailwind CSS Masterclass",
    channel: "Frontend School",
    views: "319K views",
    time: "3 days ago",
    duration: "22:47",
    category: "Programming",
    thumbnail:
      "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=20",
    videoUrl,
  },
  {
    id: 6,
    title: "How to Become a Professional Developer",
    channel: "Code With Me",
    views: "741K views",
    time: "4 days ago",
    duration: "16:34",
    category: "Education",
    thumbnail:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=32",
    videoUrl,
  },
  {
    id: 7,
    title: "JavaScript Projects You Must Build",
    channel: "Web Dev Pro",
    views: "963K views",
    time: "1 month ago",
    duration: "20:51",
    category: "JavaScript",
    thumbnail:
      "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=45",
    videoUrl,
  },
  {
    id: 8,
    title: "Create a Responsive Website From Scratch",
    channel: "Frontend Masters",
    views: "428K views",
    time: "6 days ago",
    duration: "14:29",
    category: "Web Development",
    thumbnail:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=48",
    videoUrl,
  },

  {
    id: 9,
    title: "Top Hits Playlist 2026",
    channel: "Music World",
    views: "8.7M views",
    time: "1 day ago",
    duration: "42:18",
    category: "Music",
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=10",
    videoUrl,
  },
  {
    id: 10,
    title: "Live Music Concert Experience",
    channel: "Live Sounds",
    views: "1.8M views",
    time: "3 days ago",
    duration: "58:32",
    category: "Live",
    thumbnail:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=18",
    videoUrl,
  },
  {
    id: 11,
    title: "Ultimate Gaming Setup Tour",
    channel: "Gaming Zone",
    views: "2.1M views",
    time: "2 days ago",
    duration: "15:44",
    category: "Gaming",
    thumbnail:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=22",
    videoUrl,
  },
  {
    id: 12,
    title: "Best Open World Games to Play",
    channel: "Game Central",
    views: "4.2M views",
    time: "1 week ago",
    duration: "19:26",
    category: "Gaming",
    thumbnail:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=27",
    videoUrl,
  },
  {
    id: 13,
    title: "Latest Technology News",
    channel: "Tech News Daily",
    views: "675K views",
    time: "8 hours ago",
    duration: "11:36",
    category: "News",
    thumbnail:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=30",
    videoUrl,
  },
  {
    id: 14,
    title: "AI Tools You Should Know in 2026",
    channel: "Future Tech",
    views: "3.3M views",
    time: "4 days ago",
    duration: "17:25",
    category: "AI",
    thumbnail:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=35",
    videoUrl,
  },
  {
    id: 15,
    title: "Premier League Match Highlights",
    channel: "Sports Arena",
    views: "5.6M views",
    time: "1 day ago",
    duration: "10:52",
    category: "Sports",
    thumbnail:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=40",
    videoUrl,
  },
  {
    id: 16,
    title: "World Cup Greatest Moments",
    channel: "Sports Central",
    views: "9.1M views",
    time: "2 weeks ago",
    duration: "13:47",
    category: "Sports",
    thumbnail:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=44",
    videoUrl,
  },
  {
    id: 17,
    title: "Easy Recipes Anyone Can Make",
    channel: "Kitchen Stories",
    views: "1.1M views",
    time: "5 days ago",
    duration: "09:42",
    category: "Cooking",
    thumbnail:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=50",
    videoUrl,
  },
  {
    id: 18,
    title: "Beautiful Places You Must Visit",
    channel: "Travel Diaries",
    views: "2.8M views",
    time: "3 weeks ago",
    duration: "16:10",
    category: "Travel",
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=52",
    videoUrl,
  },
  {
    id: 19,
    title: "Top Fashion Trends This Year",
    channel: "Style Studio",
    views: "845K views",
    time: "6 days ago",
    duration: "12:18",
    category: "Fashion",
    thumbnail:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=55",
    videoUrl,
  },
  {
    id: 20,
    title: "How to Start a Successful Business",
    channel: "Business Talks",
    views: "1.7M views",
    time: "1 week ago",
    duration: "27:45",
    category: "Business",
    thumbnail:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=58",
    videoUrl,
  },
  {
    id: 21,
    title: "Funny Moments That Will Make You Laugh",
    channel: "Comedy Central",
    views: "6.4M views",
    time: "2 days ago",
    duration: "08:36",
    category: "Comedy",
    thumbnail:
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=60",
    videoUrl,
  },
  {
    id: 22,
    title: "Science Facts That Sound Impossible",
    channel: "Science Lab",
    views: "1.4M views",
    time: "4 days ago",
    duration: "14:12",
    category: "Science",
    thumbnail:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=62",
    videoUrl,
  },
  {
    id: 23,
    title: "Best Movies to Watch This Weekend",
    channel: "Movie Guide",
    views: "932K views",
    time: "3 days ago",
    duration: "10:08",
    category: "Movies",
    thumbnail:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=64",
    videoUrl,
  },
  {
    id: 24,
    title: "How I Built My First AI Project",
    channel: "AI Developers",
    views: "2.2M views",
    time: "1 week ago",
    duration: "21:14",
    category: "Technology",
    thumbnail:
      "https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1200&q=80",
    avatar: "https://i.pravatar.cc/100?img=66",
    videoUrl,
  },
];