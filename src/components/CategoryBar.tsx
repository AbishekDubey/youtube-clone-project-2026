type CategoryBarProps = {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

const categories = [
  "All",
  "Music",
  "Gaming",
  "Live",
  "News",
  "Programming",
  "React",
  "Next.js",
  "JavaScript",
  "Web Development",
  "Education",
  "Podcasts",
  "Science",
  "Technology",
  "Comedy",
  "Movies",
  "Sports",
  "Fitness",
  "Cooking",
  "Travel",
  "Fashion",
  "Business",
  "Finance",
  "AI",
  "Tutorials",
];

export default function CategoryBar({
  selectedCategory,
  onCategoryChange,
}: CategoryBarProps) {
  return (
    <div className="mb-6 flex w-full gap-3 overflow-x-auto pb-2">
      {categories.map((category) => {
        const active = category === selectedCategory;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-black text-white"
                : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}