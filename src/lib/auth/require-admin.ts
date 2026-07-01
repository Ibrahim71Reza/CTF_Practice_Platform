// src/lib/auth/require-admin.ts
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  const idToken = authHeader.split("Bearer ")[1];
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  const uid = decodedToken.uid;

  if (decodedToken.admin === true || decodedToken.role === "admin") {
    return {
      uid,
      email: decodedToken.email || "",
      admin: true,
    };
  }

  // Fallback DB check just in case custom claims are delayed
  const userSnap = await adminDb.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    throw new Error("User profile not found");
  }

  const user = userSnap.data();

  if (user?.role !== "admin") {
    throw new Error("Admin access required");
  }

  return {
    uid,
    email: decodedToken.email || "",
    admin: true,
  };
}