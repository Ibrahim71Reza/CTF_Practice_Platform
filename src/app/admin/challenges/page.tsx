import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminChallengesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-green-500">Developer Dashboard</h1>
            <p className="text-zinc-400 mt-1">Manage CTF challenges and writeups.</p>
          </div>
          
          <div className="flex gap-3">
            <Button asChild variant="outline" className="border-zinc-700 hover:text-blue-400 bg-zinc-950">
              <Link href="/admin/writeups">Review Writeups</Link>
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-500 text-white font-bold">
              <Link href="/admin/challenges/new">Create Challenge</Link>
            </Button>
          </div>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader><CardTitle>Challenge Manager</CardTitle></CardHeader>
          <CardContent><p className="text-zinc-400">Once you create challenges, they will be manageable from here.</p></CardContent>
        </Card>
      </div>
    </main>
  );
}