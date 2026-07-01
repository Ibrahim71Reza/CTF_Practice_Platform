"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  async function handleGoogleLogin() {
    try {
      // 1. Trigger Google Popup
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken(true);

      // 2. Sync with our secure backend
      const res = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to sync user");
      }

      const data = await res.json();

      // 3. Route based on role
      if (data.admin) {
        // Force refresh the token so the browser knows you are an admin instantly
        await result.user.getIdToken(true); 
        router.push("/mode");
      } else {
        router.push("/challenges");
      }
    } catch (error) {
      console.error(error);
      toast.error("Login failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Terminal className="w-12 h-12 text-green-500" />
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight">
            PACTF System
          </CardTitle>

          <CardDescription className="text-zinc-400">
            Authenticate to access the platform
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-300 font-semibold"
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}