/**
 * One-off script to create the first owner account.
 *
 * Usage:
 *   node scripts/createOwner.js "Owner Name" "owner@example.com" "SomeStrongPassword123"
 *
 * Run this once after setting up your backend .env (Firebase Admin credentials).
 * Safe to delete this file afterwards, or leave it - it only does anything
 * when explicitly run with arguments.
 */

require('dotenv').config();
const { auth, db } = require('../src/config/firebase');

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: node scripts/createOwner.js "Name" "email@example.com" "password"');
    process.exit(1);
  }

  try {
    const userRecord = await auth.createUser({ email, password, displayName: name });
    await auth.setCustomUserClaims(userRecord.uid, { role: 'owner' });

    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'owner',
      createdAt: new Date().toISOString(),
    });

    console.log('Owner account created successfully:');
    console.log(`  uid:   ${userRecord.uid}`);
    console.log(`  email: ${email}`);
    console.log('You can now log in at /login with these credentials.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create owner account:', err.message);
    process.exit(1);
  }
}

main();
