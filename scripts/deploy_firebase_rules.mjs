// Deploy firebase-rules.json to the Realtime Database with the Firebase Admin SDK.
// The service-account key is read from the FIREBASE_SERVICE_ACCOUNT env var (a GitHub secret)
// and is never written to disk.
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const DATABASE_URL = 'https://quraniq-30f8c-default-rtdb.asia-southeast1.firebasedatabase.app';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
    console.error('::error::FIREBASE_SERVICE_ACCOUNT secret is not set. Add the service-account key JSON as a repository secret.');
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(raw);
} catch {
    console.error('::error::FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole key file as the secret value.');
    process.exit(1);
}

const rules = JSON.parse(readFileSync(new URL('../firebase-rules.json', import.meta.url), 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: DATABASE_URL,
});
const db = admin.database();

const current = await db.getRulesJSON();
if (JSON.stringify(current) === JSON.stringify(rules)) {
    console.log('Database rules already match firebase-rules.json — nothing to deploy.');
} else {
    await db.setRules(rules);
    console.log('Deployed firebase-rules.json to the Realtime Database.');
}
await admin.app().delete();
