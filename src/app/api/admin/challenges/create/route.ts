import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { slugify } from "@/lib/utils";
import { generateFlagSalt, hashFlag } from "@/lib/security/flag";

type Difficulty = "easy" | "medium" | "hard" | "insane";
type ChallengeStatus = "draft" | "published";

export async function POST(req: NextRequest) {
  try {
    // 1. Defensively ensure only true admins can run this
    const admin = await requireAdmin(req);
    const body = await req.json();

    const title = String(body.title || "").trim();
    const categoryTitle = String(body.categoryTitle || "").trim();
    const descriptionMarkdown = String(body.descriptionMarkdown || "").trim();
    const difficulty = String(body.difficulty || "easy") as Difficulty;
    const basePoints = Number(body.basePoints || 100);
    const flag = String(body.flag || "").trim();
    const flagFormat = String(body.flagFormat || "flag{...}").trim();
    const status = String(body.status || "draft") as ChallengeStatus;
    const caseSensitive = body.caseSensitive !== false;

    if (!title || !categoryTitle || !descriptionMarkdown || !flag) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const categorySlug = slugify(categoryTitle);
    const challengeSlug = slugify(title);

    const categoryRef = adminDb.collection("categories").doc(categorySlug);
    const challengeRef = adminDb.collection("challenges").doc();
    const secretRef = adminDb.collection("privateChallengeSecrets").doc(challengeRef.id);
    const auditRef = adminDb.collection("auditLogs").doc();

    // 2. Mathematically hash the flag (never stored in plain text!)
    const salt = generateFlagSalt();
    const flagHash = hashFlag({ flag, salt, caseSensitive });

    // 3. Atomic Database Transaction
    await adminDb.runTransaction(async (tx) => {
      const categorySnap = await tx.get(categoryRef);

      // Create category if it doesn't exist
      if (!categorySnap.exists) {
        tx.set(categoryRef, {
          id: categorySlug,
          title: categoryTitle,
          slug: categorySlug,
          challengeCount: 0,
          publishedChallengeCount: 0,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Save public challenge data (NO FLAG HERE)
      tx.set(challengeRef, {
        id: challengeRef.id,
        title,
        slug: challengeSlug,
        categoryId: categorySlug,
        categoryTitle,
        descriptionMarkdown,
        difficulty,
        basePoints,
        currentPoints: basePoints,
        flagFormat,
        status,
        solveCount: 0,
        attemptCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: admin.uid,
      });

      // Save private secret (Frontend can NEVER read this)
      tx.set(secretRef, {
        challengeId: challengeRef.id,
        flagHash,
        flagSalt: salt,
        caseSensitive,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update category counters
      tx.update(categoryRef, {
        challengeCount: FieldValue.increment(1),
        publishedChallengeCount: status === "published" ? FieldValue.increment(1) : FieldValue.increment(0),
      });

      // Audit Log
      tx.set(auditRef, {
        id: auditRef.id,
        actorId: admin.uid,
        action: "challenge.created",
        targetType: "challenge",
        targetId: challengeRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, challengeId: challengeRef.id });
  } catch (error) {
    console.error("create challenge error:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}