"use client";

import { FormEvent, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewChallengePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [categoryTitle, setCategoryTitle] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [basePoints, setBasePoints] = useState(100);
  const [flag, setFlag] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in.");

      const token = await user.getIdToken();

      const res = await fetch("/api/admin/challenges/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title, categoryTitle, descriptionMarkdown, difficulty, basePoints, flag, status, caseSensitive: true
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create challenge");

      toast.success("Challenge created securely!");
      router.push("/admin/challenges");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader>
            <CardTitle className="text-2xl text-green-500">Deploy New Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Challenge Title</Label>
                  <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SQLi 101" className="bg-zinc-950 border-zinc-700" />
                </div>
                <div className="space-y-2">
                  <Label>Category (Auto-creates)</Label>
                  <Input required value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)} placeholder="e.g. Web Exploitation" className="bg-zinc-950 border-zinc-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Markdown)</Label>
                <textarea required value={descriptionMarkdown} onChange={(e) => setDescriptionMarkdown(e.target.value)} placeholder="Explain the vulnerability..." className="min-h-32 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select aria-label="Status" title="Status" id="status" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="insane">Insane</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input required type="number" value={basePoints} onChange={(e) => setBasePoints(Number(e.target.value))} className="bg-zinc-950 border-zinc-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <select title="Status" id="status" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm">
                  <option value="published">Publish Now</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>

              <div className="space-y-2 p-4 border border-red-900/50 bg-red-950/10 rounded-md">
                <Label className="text-red-400 font-bold">The Flag (Will be encrypted instantly)</Label>
                <Input required value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="flag{h4ck3r_m4n}" className="bg-zinc-950 border-red-900/50 font-mono text-green-400" />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold">
                {loading ? "Encrypting & Deploying..." : "Deploy Challenge"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}