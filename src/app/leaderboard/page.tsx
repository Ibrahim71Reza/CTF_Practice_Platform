"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type LeaderboardEntry = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  score: number;
  solvedCount: number;
};

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexErrorUrl, setIndexErrorUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const q = query(
          collection(db, "leaderboardEntries"),
          orderBy("score", "desc"),
          orderBy("solvedCount", "desc"),
          orderBy("lastSolveAt", "asc"),
          limit(50)
        );

        const snap = await getDocs(q);
        const rows = snap.docs.map((doc) => ({
          uid: doc.id,
          ...(doc.data() as Omit<LeaderboardEntry, "uid">),
        }));

        setPlayers(rows);
      } catch (error: unknown) {
        console.error("Leaderboard error:", error);
        if (error instanceof Error && error.message.includes("requires an index")) {
          const urlMatch = error.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
          if (urlMatch) setIndexErrorUrl(urlMatch[0]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Link href="/challenges" className="flex items-center text-zinc-400 hover:text-green-400 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenges
        </Link>

        <div className="flex items-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold text-green-500">Global Leaderboard</h1>
            <p className="text-zinc-400 mt-1">Ranked by score, solves, then solve time.</p>
          </div>
        </div>

        {indexErrorUrl && (
          <div className="p-4 bg-blue-950/50 border border-blue-900 rounded-lg text-blue-200">
            <p className="font-bold mb-2">Almost there! We need one more database index.</p>
            <a href={indexErrorUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline break-all">
              Click here to build the Leaderboard Index
            </a>
          </div>
        )}

        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader>
            <CardTitle>Top Hackers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-400">Loading ranks...</p>
            ) : players.length === 0 && !indexErrorUrl ? (
              <p className="text-zinc-400">No players have scored yet.</p>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={player.uid} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 font-bold text-zinc-500 flex justify-center">
                        {index === 0 ? <Medal className="text-yellow-500" /> : 
                         index === 1 ? <Medal className="text-zinc-400" /> : 
                         index === 2 ? <Medal className="text-amber-700" /> : 
                         `#${index + 1}`}
                      </div>

                      {player.photoURL ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={player.photoURL} alt={player.displayName} className="w-9 h-9 rounded-full border border-zinc-700 object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-500">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <span className="font-semibold text-lg">{player.displayName}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                        {player.solvedCount || 0} solves
                      </Badge>
                      <span className="font-mono text-green-400 font-bold text-lg w-16 text-right">
                        {player.score || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}