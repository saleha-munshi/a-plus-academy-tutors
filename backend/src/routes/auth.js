const express = require('express');
const { auth, db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/createUser
 * Owner only - creates a tutor or student account
 * body: { email, password, name, role: 'tutor' | 'student', assignedTutorId? }
 */
router.post('/createUser', verifyToken, requireRole('owner'), async (req, res) => {
  const { email, password, name, role, assignedTutorId, subjects } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name and role are required' });
  }
  if (!['tutor', 'student'].includes(role)) {
    return res.status(400).json({ error: "role must be 'tutor' or 'student'" });
  }

  try {
    // Create the Firebase Auth user
    const userRecord = await auth.createUser({ email, password, displayName: name });

    // Set custom claim for role-based access + first-login flag
    await auth.setCustomUserClaims(userRecord.uid, { role, requiresPasswordChange: true });

    // Create the Firestore profile doc
    const userDoc = {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
    if (role === 'student' && assignedTutorId) {
      userDoc.assignedTutorId = assignedTutorId;
    }
    if (role === 'student' && Array.isArray(subjects) && subjects.length > 0) {
      userDoc.subjects = subjects;
    }

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    return res.status(201).json({ uid: userRecord.uid, ...userDoc });
  } catch (err) {
    console.error('createUser error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/auth/clearPasswordFlag
 * Authenticated user — removes requiresPasswordChange claim after first-time password change
 */
router.patch('/clearPasswordFlag', verifyToken, async (req, res) => {
  const { uid, role } = req.user;
  try {
    await auth.setCustomUserClaims(uid, { role });
    return res.status(200).json({ message: 'Flag cleared' });
  } catch (err) {
    console.error('clearPasswordFlag error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/auth/deleteUser/:uid
 * Owner only - deletes a tutor or student account
 */
router.delete('/deleteUser/:uid', verifyToken, requireRole('owner'), async (req, res) => {
  const { uid } = req.params;

  try {
    await auth.deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    // Clean up any assignments tied to this user (best-effort)
    const assignmentsSnap = await db
      .collection('assignments')
      .where('studentId', '==', uid)
      .get();
    const batch = db.batch();
    assignmentsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/users/:uid/role
 * Owner only - change a user's role
 * body: { role: 'tutor' | 'student' }
 */
router.patch('/users/:uid/role', verifyToken, requireRole('owner'), async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;

  if (!['tutor', 'student', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    await db.collection('users').doc(uid).update({ role });
    return res.status(200).json({ message: 'Role updated' });
  } catch (err) {
    console.error('updateRole error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
