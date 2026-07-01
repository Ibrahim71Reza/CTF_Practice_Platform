import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

type ReviewAction = "approved" | "rejected";

function isValidHttpUrl(input: unknown) {
  try {
    const url = new URL(String(input || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    const writeupId = String(body.writeupId || "").trim();
    const action = String(body.action || "").trim() as ReviewAction;
    const adminNote = body.adminNote ? String(body.adminNote).trim() : null;

    if (!writeupId || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
    }

    if (adminNote && adminNote.length > 500) {
      return NextResponse.json({ error: "Admin note must be 500 characters or less." }, { status: 400 });
    }

    const writeupRef = adminDb.collection("writeups").doc(writeupId);
    const auditRef = adminDb.collection("auditLogs").doc();

    const result = await adminDb.runTransaction(async (tx) => {
      const writeupSnap = await tx.get(writeupRef);
      if (!writeupSnap.exists) return { error: "Writeup not found.", status: 404 };

      const writeup = writeupSnap.data();
      if (writeup?.status !== "pending") return { error: "Only pending writeups can be reviewed.", status: 409 };

      // Prevent approving bad URLs, but allow rejecting them!
      if (action === "approved" && !isValidHttpUrl(writeup?.url)) {
        return { error: "Writeup URL is invalid or malformed.", status: 400 };
      }

      tx.update(writeupRef, {
        status: action,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: admin.uid,
        adminNote,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(auditRef, {
        id: auditRef.id,
        actorId: admin.uid,
        action: action === "approved" ? "writeup.approved" : "writeup.rejected",
        targetType: "writeup",
        targetId: writeupId,
        before: { status: writeup?.status },
        after: { status: action, adminNote },
        createdAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    });

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, message: `Writeup ${action} successfully.` });
  } catch (error) {
    console.error("Admin writeup review error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}