"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [stats, setStats] = useState({ score: 0, solves: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || "");
          setPhotoURL(data.photoURL || "");
          setStats({ score: data.score || 0, solves: data.solvedCount || 0 });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, photoURL }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      
      toast.success("Profile updated successfully!");
      
      // If they left photoURL blank, update the UI to show the auto-generated robot
      if (!photoURL) setPhotoURL(`https://api.dicebear.com/7.x/bottts/svg?seed=${auth.currentUser.uid}`);
      
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/challenges" className="flex items-center text-zinc-400 hover:text-green-400 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenges
        </Link>
        <h1 className="text-3xl font-bold text-green-500">Hacker Profile</h1>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Your Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full border-2 border-zinc-700 bg-zinc-950 overflow-hidden flex items-center justify-center">
                {photoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-zinc-600" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-zinc-300">Avatar Image URL (Optional)</Label>
                <Input 
                  type="url" 
                  placeholder="https://imgur.com/my-avatar.png"
                  value={photoURL} 
                  onChange={(e) => setPhotoURL(e.target.value)} 
                  className="bg-zinc-950 border-zinc-700 text-zinc-400" 
                />
                <p className="text-xs text-zinc-500">Leave blank to use an auto-generated hacker bot.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-zinc-950 border-zinc-700 font-bold text-zinc-100" />
            </div>

            <div className="flex gap-4 pt-4">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex-1 text-center">
                <p className="text-zinc-500 text-sm">Total Score</p>
                <p className="text-2xl font-mono text-green-500 font-bold">{stats.score}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg flex-1 text-center">
                <p className="text-zinc-500 text-sm">Challenges Solved</p>
                <p className="text-2xl font-mono text-zinc-100 font-bold">{stats.solves}</p>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold">
              {saving ? "Saving Data..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}