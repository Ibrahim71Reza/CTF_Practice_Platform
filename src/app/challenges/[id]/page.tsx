"use client";

import { FormEvent, useEffect, useState, use } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

type Challenge = {
  id: string;
  title: string;
  categoryTitle: string;
  difficulty: string;
  currentPoints: number;
  descriptionMarkdown: string;
  flagFormat: string;
};

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [flag, setFlag] = useState("");
  const [writeupUrl, setWriteupUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingWriteup, setSubmittingWriteup] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const ref = doc(db, "challenges", id);
        const snap = await getDoc(ref);

        if (!snap.exists() || snap.data().status !== "published") {
          setChallenge(null);
          return;
        }
        setChallenge({ id: snap.id, ...(snap.data() as Omit<Challenge, "id">) });

        // Check if the user already solved this
        if (auth.currentUser) {
          const solveRef = doc(db, "solves", `${auth.currentUser.uid}_${id}`);
          const solveSnap = await getDoc(solveRef);
          if (solveSnap.exists()) setIsSolved(true);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleSubmitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return toast.error("Please log in.");
      const token = await user.getIdToken();
      const res = await fetch("/api/submit-flag", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challengeId: id, flag }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      if (data.correct) {
        toast.success(data.message || `Correct! +${data.pointsAwarded} points`);
        setFlag("");
        setIsSolved(true); // Unlock writeups instantly
      } else {
        toast.error(data.message || "Incorrect flag.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitWriteup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingWriteup(true);
    try {
      if (!auth.currentUser) return toast.error("Please log in.");
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/submit-writeup", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challengeId: id, title: `${challenge?.title} Writeup`, url: writeupUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      toast.success(data.message);
      setWriteupUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmittingWriteup(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">Loading...</main>;
  if (!challenge) return <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">Challenge not found.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/challenges" className="flex items-center text-zinc-400 hover:text-green-400 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenges
        </Link>

        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="border-green-500 text-green-500">{challenge.categoryTitle}</Badge>
              <Badge variant="secondary" className="bg-zinc-800">{challenge.difficulty}</Badge>
              <Badge className="bg-green-600 text-white">{challenge.currentPoints} pts</Badge>
              {isSolved && <Badge className="bg-green-600 text-white">Solved</Badge>}
            </div>
            <CardTitle className="text-3xl">{challenge.title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="prose prose-invert max-w-none text-zinc-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.descriptionMarkdown}</ReactMarkdown>
            </div>

            {/* The Flag Box */}
            <div className={`p-6 border rounded-lg ${isSolved ? 'bg-green-950/10 border-green-900/50' : 'bg-zinc-950 border-zinc-800'}`}>
              <form onSubmit={handleSubmitFlag} className="space-y-4">
                <p className="text-sm text-zinc-400">{isSolved ? "You have already solved this challenge." : `Flag format: ${challenge.flagFormat || "flag{...}"}`}</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <Input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="flag{...}" disabled={isSolved} className="bg-zinc-900 border-zinc-700 font-mono text-green-400" />
                  <Button type="submit" disabled={submitting || isSolved} className="bg-green-600 hover:bg-green-500 text-white font-bold w-full md:w-auto">
                    {submitting ? "Checking..." : isSolved ? "Solved" : "Submit Flag"}
                  </Button>
                </div>
              </form>
            </div>

            {/* The Writeup Box (ONLY VISIBLE IF SOLVED) */}
            {isSolved && (
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-lg">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4"><BookOpen className="w-5 h-5 text-blue-400" /> Submit a Writeup</h3>
                <form onSubmit={handleSubmitWriteup} className="space-y-4">
                  <p className="text-sm text-zinc-400">Did you write a blog post or GitHub gist on how you solved this? Share it!</p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Input required type="url" value={writeupUrl} onChange={(e) => setWriteupUrl(e.target.value)} placeholder="https://github.com/..." className="bg-zinc-900 border-zinc-700" />
                    <Button type="submit" disabled={submittingWriteup} variant="secondary" className="w-full md:w-auto">
                      {submittingWriteup ? "Submitting..." : "Submit Link"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </main>
  );
}