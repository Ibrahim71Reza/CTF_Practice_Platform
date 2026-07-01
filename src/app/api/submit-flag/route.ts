import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { hashFlag } from "@/lib/security/flag";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const body = await req.json();

    const challengeId = String(body.challengeId || "").trim();
    const submittedFlag = String(body.flag || "").trim();

    if (!challengeId || !submittedFlag) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = userSnap.data();

    // 1. EARLY EXIT: Check if they already solved it
    const solveId = `${uid}_${challengeId}`;
    const solveRef = adminDb.collection("solves").doc(solveId);
    const existingSolveSnap = await solveRef.get();

    if (existingSolveSnap.exists) {
      return NextResponse.json({ correct: true, alreadySolved: true, pointsAwarded: 0, message: "You already solved this challenge." });
    }

    // 2. RATE LIMITER: Prevent script brute-forcing
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentWrongSnap = await adminDb
      .collection("submissions")
      .where("userId", "==", uid)
      .where("challengeId", "==", challengeId)
      .where("isCorrect", "==", false)
      .where("createdAt", ">=", oneMinuteAgo)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    if (recentWrongSnap.size >= 10) {
      return NextResponse.json({ error: "Too many attempts. Please wait 60 seconds." }, { status: 429 });
    }

    // 3. GET CHALLENGE SECRETS
    const challengeRef = adminDb.collection("challenges").doc(challengeId);
    const secretRef = adminDb.collection("privateChallengeSecrets").doc(challengeId);
    const [challengeSnap, secretSnap] = await Promise.all([challengeRef.get(), secretRef.get()]);

    if (!challengeSnap.exists || !secretSnap.exists) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

    const challenge = challengeSnap.data()!;
    const secret = secretSnap.data()!;

    if (challenge.status !== "published") return NextResponse.json({ error: "Challenge not published" }, { status: 403 });

    // 4. CHECK THE FLAG
    const submittedHash = hashFlag({ flag: submittedFlag, salt: secret.flagSalt, caseSensitive: secret.caseSensitive });
    const isCorrect = secret.flagHash === submittedHash;

    if (!isCorrect) {
      // Log wrong submission
      await adminDb.collection("submissions").add({
        userId: uid, challengeId, submittedFlagHash: submittedHash, isCorrect: false, pointsAwarded: 0, createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ correct: false, message: "Incorrect flag." });
    }

    // 5. ATOMIC SCORING TRANSACTION
    const leaderboardRef = adminDb.collection("leaderboardEntries").doc(uid);
    const submissionRef = adminDb.collection("submissions").doc();
    
    const result = await adminDb.runTransaction(async (tx) => {
      const solveCheck = await tx.get(solveRef);
      if (solveCheck.exists) return { alreadySolved: true, pointsAwarded: 0 };

      const pointsAwarded = Number(challenge.currentPoints || challenge.basePoints || 0);

      // Record the solve
      tx.set(solveRef, { id: solveId, userId: uid, challengeId, pointsAwarded, solvedAt: FieldValue.serverTimestamp(), categoryId: challenge.categoryId, difficulty: challenge.difficulty });
      tx.set(submissionRef, { userId: uid, challengeId, submittedFlagHash: submittedHash, isCorrect: true, pointsAwarded, createdAt: FieldValue.serverTimestamp() });

      // Update User Score
      tx.update(userRef, { score: FieldValue.increment(pointsAwarded), solvedCount: FieldValue.increment(1), lastSolveAt: FieldValue.serverTimestamp() });

      // Update Leaderboard
      tx.set(leaderboardRef, { uid, displayName: user?.displayName || "Hacker", photoURL: user?.photoURL || null, score: FieldValue.increment(pointsAwarded), solvedCount: FieldValue.increment(1), lastSolveAt: FieldValue.serverTimestamp() }, { merge: true });

      // Update Challenge Stats
      tx.update(challengeRef, { solveCount: FieldValue.increment(1), attemptCount: FieldValue.increment(1) });

      return { alreadySolved: false, pointsAwarded };
    });

    if (result.alreadySolved) return NextResponse.json({ correct: true, alreadySolved: true, pointsAwarded: 0, message: "Already solved." });

    return NextResponse.json({ correct: true, alreadySolved: false, pointsAwarded: result.pointsAwarded, message: `Correct! +${result.pointsAwarded} points.` });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit flag" }, { status: 500 });
  }
}