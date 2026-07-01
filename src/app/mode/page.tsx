"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Gamepad2 } from "lucide-react";

export default function ModeSelectorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-500">Welcome Admin</CardTitle>
          <p className="text-zinc-400 text-sm mt-2">Select your operating mode</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          <Button 
            variant="outline" 
            className="h-32 flex flex-col items-center justify-center gap-3 border-zinc-700 hover:border-green-500 hover:text-green-500 hover:bg-zinc-800/50 transition-all bg-zinc-950"
            onClick={() => router.push("/admin/challenges")}
          >
            <Code className="w-8 h-8" />
            <span className="text-lg">Developer Mode</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-32 flex flex-col items-center justify-center gap-3 border-zinc-700 hover:border-blue-500 hover:text-blue-500 hover:bg-zinc-800/50 transition-all bg-zinc-950"
            onClick={() => router.push("/challenges")}
          >
            <Gamepad2 className="w-8 h-8" />
            <span className="text-lg">Play as User</span>
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}