// Notice: We are importing the default 'admin' object, NOT the sub-folders!
import admin from "firebase-admin";

function formatPrivateKey(key: string | undefined) {
  if (!key) return undefined;
  let formattedKey = key;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  return formattedKey.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
  });
}

// Export the instances from the main admin object
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();