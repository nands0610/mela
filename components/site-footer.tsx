export function SiteFooter() {
    return (
        <footer className="bg-neutral-900 text-white py-8 border-t border-neutral-800">
            <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">

                <div className="col-span-1 md:col-span-2">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600 mb-2">
                        MELA 2026
                    </h2>
                    <p className="text-neutral-400 max-w-sm leading-relaxed">
                        Experience the joy of our annual college fest.
                        Food, fun, games, and memories that last a lifetime.
                        Join us in celebrating creativity and spirit!
                    </p>
                </div>

                <div>
                    <h3 className="font-semibold text-lg mb-2 text-white">Explore</h3>
                    <ul className="space-y-2 text-neutral-400">
                        <li><a href="/food" className="hover:text-orange-400 transition-colors">Food Stalls</a></li>
                        <li><a href="/accessories" className="hover:text-orange-400 transition-colors">Accessories</a></li>
                        <li><a href="/games" className="hover:text-orange-400 transition-colors">Games Zone</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-lg mb-2 text-white">Contact</h3>
                    <ul className="space-y-2 text-neutral-400">
                        <li>Lakshya Team</li>
                        <li>support@mela.com</li>
                        <li className="flex gap-4 mt-4">
                            {/* Social Icons Placeholder */}
                            <div className="w-8 h-8 bg-neutral-800 rounded-full hover:bg-orange-600 transition-colors cursor-pointer" />
                            <div className="w-8 h-8 bg-neutral-800 rounded-full hover:bg-orange-600 transition-colors cursor-pointer" />
                            <div className="w-8 h-8 bg-neutral-800 rounded-full hover:bg-orange-600 transition-colors cursor-pointer" />
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-8 mt-8 pt-4 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center text-neutral-500 text-sm">
                <p>&copy; 2026 Lakshya Mela. All rights reserved.</p>
                <p>Designed with ❤️ by the Lakshya Tech Team</p>
            </div>
        </footer>
    );
}
