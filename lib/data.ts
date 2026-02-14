export type Stall = {
    id: string;
    name: string;
    slug: string;
    category: "food" | "accessories" | "games";
    description: string;
    bannerImage: string;
    logoImage?: string;
    images: string[];
    ownerName: string;
    ownerPhone: string;
    instagram?: string;
    items?: { name: string; price: string }[];
    highlights?: string[];
    bestSellers?: string[];
    reviews?: { user: string; rating: number; comment: string }[];
    offers?: string[];
    availableAt?: string[];
    stallNumber?: string;
    paymentMethods?: string[]; // payment modes only
    limitedTimeOffers?: {
        title: string;
        description?: string;
        validTill?: string;
    }[];
};

export const stalls: Stall[] = [
    // FOOD STALLS
    {
        id: "1",
        name: "Spicy Bites",
        slug: "spicy-bites",
        category: "food",
        description: "The best spicy street food in town! Come try our famous pani puri and chaat.",
        bannerImage: "/images/food.png",
        images: ["/images/food.png", "/images/food.png"],
        ownerName: "Rajesh Kumar",
        ownerPhone: "+91 98765 43210",
        instagram: "@spicybites_official",
        items: [
            { name: "Pani Puri", price: "₹50" },
            { name: "Samosa Chaat", price: "₹80" },
            { name: "Masala Dosa", price: "₹120" },
        ],
        highlights: ["Authentic Mumbai Chaat", "Hygienic Preparation", "Spicy Challenge Available"],
        bestSellers: ["Pani Puri", "Dahi Puri", "Samosa"],
        reviews: [
            { user: "Aditi S.", rating: 5, comment: "Best pani puri in college!" },
            { user: "Rahul M.", rating: 4, comment: "Spicy and tasty." }
        ],
        offers: ["Buy 2 Plates Pani Puri, Get 1 Free", "10% Student Discount"],
        availableAt: ["Tech Park Mela", "Main Food Court"],
        stallNumber: "F-04",
        paymentMethods: ["UPI", "Cash"]
    },
    {
        id: "2",
        name: "Sweet Cravings",
        slug: "sweet-cravings",
        category: "food",
        description: "Delicious homemade sweets and desserts to satisfy your cravings.",
        bannerImage: "/images/food.png",
        images: ["/images/food.png", "/images/food.png"],
        ownerName: "Priya Singh",
        ownerPhone: "+91 91234 56789",
        items: [
            { name: "Gulab Jamun", price: "₹40" },
            { name: "Jalebi", price: "₹60" },
        ],
        highlights: ["Homemade Ghee Sweets", "Sugar-free Options"],
        bestSellers: ["Gulab Jamun", "Rasmalai"],
        reviews: [
            { user: "Sneha K.", rating: 5, comment: "Melt in the mouth gulab jamuns!" }
        ],
        offers: ["Free sweet tasting", "Bulk order discount"],
        stallNumber: "F-08",
        paymentMethods: ["UPI", "Cash"]
    },

    // ACCESSORIES STALLS
    {
        id: "3",
        name: "Sparkle & Shine",
        slug: "sparkle-and-shine",
        category: "accessories",
        description: "Handmade jewelry and accessories for every occasion.",
        bannerImage: "/images/accessories.png",
        images: ["/images/accessories.png"],
        ownerName: "Ananya Gupta",
        ownerPhone: "+91 99887 76655",
        instagram: "@sparkle_shine_jewelry",
        items: [
            { name: "Beaded Necklace", price: "₹250" },
            { name: "Silver Earrings", price: "₹150" },
        ],
        highlights: ["100% Handmade", "Custom Name Bracelets", "Student Discount"],
        bestSellers: ["Butterfly Necklace", "Korean Earrings"],
        reviews: [
            { user: "Tanya R.", rating: 5, comment: "Super cute designs!" },
            { user: "Meera P.", rating: 4, comment: "Love the custom bracelets." }
        ],
        offers: ["Buy 2 Get 1 Free (Earrings)", "Free gift above ₹499"],
        availableAt: ["Tech Park Mela", "SSN Culturals", "Weekend Pop-up"],
        stallNumber: "A-17",
        paymentMethods: ["UPI", "Cash", "GPay"]
    },

    // GAMES STALLS
    {
        id: "4",
        name: "Target Practice",
        slug: "target-practice",
        category: "games",
        description: "Test your aim and win exciting prizes!",
        bannerImage: "/images/games.png",
        images: ["/images/games.png"],
        ownerName: "Vikram Malhotra",
        ownerPhone: "+91 88776 65544",
        items: [
            { name: "3 Shots", price: "₹50" },
            { name: "10 Shots", price: "₹150" },
        ],
        highlights: ["Win Teddy Bears", "Sniper Challenge", "Leaderboard"],
        bestSellers: ["10 Shots Pack"],
        reviews: [
            { user: "Arjun D.", rating: 5, comment: "Won a huge teddy bear!" }
        ],
        stallNumber: "G-02",
        paymentMethods: ["UPI", "Cash"]
    },
];

export const getStallsByCategory = (category: string) => {
    return stalls.filter((stall) => stall.category === category.toLowerCase());
};

export const getStallBySlug = (slug: string) => {
    return stalls.find((stall) => stall.slug === slug);
};
