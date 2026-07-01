"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Check, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Writeup = {
  id: string;
  challengeId: string;
  userId: string;
  title: string;
  url: string;
  status: "pending" | "approved" | "rejected";
};

export default function AdminWriteupsPage() {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    // Declaring the function INSIDE the useEffect makes React very happy!
    async function fetchPendingWriteups() {
      try {
        setLoading(true);
        const q = query(
          collection(db, "writeups"),
          where("status", "==", "pending"),
          orderBy("submittedAt", "desc")
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map((doc) => ({
          ...(doc.data() as Omit<Writeup, "id">),
          id: doc.id,
        }));
        setWriteups(rows);
      } catch (err) {
        console.error("Failed to fetch writeups:", err);
        toast.error("Failed to load pending writeups.");
      } finally {
        setLoading(false);
      }
    }

    fetchPendingWriteups();
  }, []);

  async function handleReview(writeupId: string, action: "approved" | "rejected") {
    if (!auth.currentUser) return toast.error("You must be logged in as admin.");

    try {
      setReviewingId(writeupId);
      const token = await auth.currentUser.getIdToken(true);

      const res = await fetch("/api/admin/writeups/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ writeupId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to review writeup.");

      toast.success(data.message || `Writeup ${action}.`);
      setWriteups((prev) => prev.filter((w) => w.id !== writeupId));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error updating writeup.");
    } finally {
      setReviewingId(null);
    }
  }

  if (loading) return <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">Loading pending writeups...</main>;

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Link href="/admin/challenges" className="flex items-center text-zinc-400 hover:text-green-400 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-green-500">Review Pending Writeups</h1>
          <p className="text-zinc-400 mt-2">Approve or reject submitted writeup links.</p>
        </div>

        {writeups.length === 0 ? (
          <p className="text-zinc-400">No pending writeups to review right now.</p>
        ) : (
          <div className="space-y-4">
            {writeups.map((writeup) => (
              <Card key={writeup.id} className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardHeader>
                  <CardTitle className="text-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <span>{writeup.title}</span>
                    <a href={writeup.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 text-sm font-normal">
                      View Submission <ExternalLink className="w-4 h-4" />
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>Challenge ID: <span className="font-mono text-zinc-300">{writeup.challengeId}</span></p>
                    <p>User ID: <span className="font-mono text-zinc-300">{writeup.userId}</span></p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" disabled={reviewingId === writeup.id} className="border-red-900 text-red-500 hover:bg-red-950 hover:text-red-400" onClick={() => handleReview(writeup.id, "rejected")}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button disabled={reviewingId === writeup.id} className="bg-green-600 hover:bg-green-500 text-white" onClick={() => handleReview(writeup.id, "approved")}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}