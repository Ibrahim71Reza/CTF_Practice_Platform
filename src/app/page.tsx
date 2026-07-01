import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Terminal, Flag } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="max-w-3xl text-center space-y-8">
        
        <div className="flex justify-center gap-4 text-green-500 mb-8">
          <Terminal className="w-16 h-16" />
          <Flag className="w-16 h-16" />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
          PACTF Platform
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-xl mx-auto">
          Welcome to the ultimate Capture The Flag experience. Prove your skills, solve cryptography, exploit the web, and climb the global leaderboard.
        </p>

        <div className="pt-8">
          <Button asChild size="lg" className="bg-green-600 hover:bg-green-500 text-white font-bold text-lg px-8 py-6">
            <Link href="/login">
              Enter the System
            </Link>
          </Button>
        </div>

      </div>
    </main>
  );
}