import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function isValidDisplayName(name: string) {
  return name.length >= 2 && name.length <= 40;
}

function isValidHttpUrl(input: string | null) {
  if (!input) return true; // Empty is fine, we will use auto-avatar
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const body = await req.json();
    const displayName = String(body.displayName || "").trim();
    // Use user-provided URL, or fallback to a cool auto-generated robot avatar
    const photoURL = body.photoURL ? String(body.photoURL).trim() : `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`;

    if (!isValidDisplayName(displayName)) return NextResponse.json({ error: "Display name must be 2-40 characters." }, { status: 400 });
    if (!isValidHttpUrl(photoURL)) return NextResponse.json({ error: "Invalid avatar URL. Must be http/https." }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const leaderboardRef = adminDb.collection("leaderboardEntries").doc(uid);

    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");
      
      const user = userSnap.data();
      if (user?.isBanned) throw new Error("Banned users cannot update profiles");

      tx.update(userRef, { displayName, photoURL, updatedAt: FieldValue.serverTimestamp() });

      tx.set(leaderboardRef, {
        uid, displayName, photoURL,
        score: user?.score || 0,
        solvedCount: user?.solvedCount || 0,
        lastSolveAt: user?.lastSolveAt || null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({ ok: true, message: "Profile updated successfully." });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}