import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email || "";
    const name = decodedToken.name || "Hacker";
    const picture = decodedToken.picture || null;

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    // Check if this is the developer logging in
    const isBootstrapAdmin = email === process.env.ADMIN_BOOTSTRAP_EMAIL;

    // Grant Admin Custom Claim securely
    if (isBootstrapAdmin && decodedToken.admin !== true) {
      await adminAuth.setCustomUserClaims(uid, {
        admin: true,
        role: "admin",
      });
    }

    if (!userSnap.exists) {
      // Create new user
      await userRef.set({
        uid,
        email,
        displayName: name,
        photoURL: picture,
        role: isBootstrapAdmin ? "admin" : "player",
        score: 0,
        solvedCount: 0,
        isBanned: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Update last login
      await userRef.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      ok: true,
      role: isBootstrapAdmin || decodedToken.admin ? "admin" : "player",
      admin: isBootstrapAdmin || decodedToken.admin === true,
    });
  } catch (error) {
    console.error("sync-user error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}