import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function isValidUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const body = await req.json();
    const challengeId = String(body.challengeId || "").trim();
    const title = String(body.title || "").trim();
    const url = String(body.url || "").trim();

    if (!challengeId || !title || !url) return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    if (title.length < 3 || title.length > 120) return NextResponse.json({ error: "Title must be 3-120 characters." }, { status: 400 });
    if (!isValidUrl(url)) return NextResponse.json({ error: "Writeup URL must be a valid http or https link." }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const challengeRef = adminDb.collection("challenges").doc(challengeId);
    const solveRef = adminDb.collection("solves").doc(`${uid}_${challengeId}`);
    const writeupRef = adminDb.collection("writeups").doc(`${uid}_${challengeId}`); // Deterministic ID prevents spam

    await adminDb.runTransaction(async (tx) => {
      const [userSnap, challengeSnap, solveSnap, writeupSnap] = await Promise.all([
        tx.get(userRef), tx.get(challengeRef), tx.get(solveRef), tx.get(writeupRef),
      ]);

      if (!userSnap.exists) throw new Error("User not found");
      if (userSnap.data()?.isBanned) throw new Error("Banned users cannot submit writeups");
      if (!challengeSnap.exists || challengeSnap.data()?.status !== "published") throw new Error("Challenge not found");
      
      // CRITICAL: Did they actually solve it?
      if (!solveSnap.exists) throw new Error("You must solve the challenge before submitting a writeup.");

      if (writeupSnap.exists && writeupSnap.data()?.status === "approved") {
        throw new Error("An approved writeup already exists for this challenge.");
      }

      tx.set(writeupRef, {
        id: `${uid}_${challengeId}`,
        userId: uid,
        challengeId,
        title,
        url,
        status: "pending", // Admins must approve
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ ok: true, message: "Writeup submitted for review." });
  } catch (error) {
    console.error("Writeup error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to submit writeup." }, { status: 500 });
  }
}