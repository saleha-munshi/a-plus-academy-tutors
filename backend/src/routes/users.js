const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/students
 * Tutor: returns only their assigned students
 * Owner: returns all students
 */
router.get('/students', verifyToken, requireRole('tutor', 'owner'), async (req, res) => {
  try {
    let query = db.collection('users').where('role', '==', 'student');

    if (req.user.role === 'tutor') {
      query = query.where('assignedTutorId', '==', req.user.uid);
    }

    const snap = await query.get();
    const students = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    return res.status(200).json(students);
  } catch (err) {
    console.error('getStudents error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tutors
 * Owner only - list all tutors (useful for reassigning students)
 */
router.get('/tutors', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const snap = await db.collection('users').where('role', 'in', ['tutor', 'owner']).get();
    const tutors = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    return res.status(200).json(tutors);
  } catch (err) {
    console.error('getTutors error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/students/:uid/tutor
 * Owner only - reassign a student to a different tutor
 * body: { tutorId }
 */
router.patch('/students/:uid/tutor', verifyToken, requireRole('owner'), async (req, res) => {
  const { uid } = req.params;
  const { tutorId } = req.body;

  if (!tutorId) {
    return res.status(400).json({ error: 'tutorId is required' });
  }

  try {
    await db.collection('users').doc(uid).update({ assignedTutorId: tutorId });
    return res.status(200).json({ message: 'Student reassigned' });
  } catch (err) {
    console.error('reassignStudent error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
