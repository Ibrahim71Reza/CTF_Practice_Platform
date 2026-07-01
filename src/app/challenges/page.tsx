"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Challenge = {
  id: string;
  title: string;
  categoryTitle: string;
  difficulty: string;
  currentPoints: number;
  solveCount: number;
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);

        // Fetch Published Challenges
        const qChallenges = query(
          collection(db, "challenges"),
          where("status", "==", "published"),
          orderBy("createdAt", "desc")
        );
        const challengeSnap = await getDocs(qChallenges);
        const challengeRows = challengeSnap.docs.map((doc) => ({
          ...(doc.data() as Omit<Challenge, "id">),
          id: doc.id,
        }));
        setChallenges(challengeRows);

        // Fetch user's solved challenges to display the "Solved" badge
        if (user) {
          const qSolves = query(collection(db, "solves"), where("userId", "==", user.uid));
          const solvesSnap = await getDocs(qSolves);
          const solvedSet = new Set(solvesSnap.docs.map((doc) => String(doc.data().challengeId)));
          setSolvedIds(solvedSet);
        } else {
          setSolvedIds(new Set());
        }
      } catch (error) {
        console.error("Error loading challenges:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-green-500">Challenges</h1>
          <p className="text-zinc-400 mt-2">Solve challenges, submit flags, and climb the leaderboard.</p>
        </div>

        {loading ? (
          <p className="text-zinc-400">Loading challenges...</p>
        ) : challenges.length === 0 ? (
          <p className="text-zinc-400">No published challenges yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => {
              const isSolved = solvedIds.has(challenge.id);

              return (
                <Card key={challenge.id} className={`relative overflow-hidden bg-zinc-900 text-zinc-100 transition-all ${isSolved ? "border-green-600/60 bg-green-950/10" : "border-zinc-800"}`}>
                  {isSolved && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-6 h-6 text-green-500 opacity-90" />
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-2 pr-8">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">{challenge.categoryTitle}</Badge>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">{challenge.difficulty}</Badge>
                      {isSolved && <Badge className="bg-green-600 text-white">Solved</Badge>}
                    </div>
                    <CardTitle className="pt-3 text-xl">{challenge.title}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span className={isSolved ? "text-green-400 font-bold" : ""}>{challenge.currentPoints} pts</span>
                      <span>{challenge.solveCount || 0} solves</span>
                    </div>

                    <Button asChild variant={isSolved ? "secondary" : "default"} className="w-full font-semibold bg-green-600 hover:bg-green-500 text-white">
                      <Link href={`/challenges/${challenge.id}`}>
                        {isSolved ? "Review Challenge" : "Open Challenge"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}