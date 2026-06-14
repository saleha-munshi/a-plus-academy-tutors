const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/assignments
 * Tutor/owner - assign resources/tests to one or more students
 * body: { studentIds: string[], itemId: string, itemType: 'resource' | 'test' }
 */
router.post('/', verifyToken, requireRole('tutor', 'owner'), async (req, res) => {
  const { studentIds, itemId, itemType } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0 || !itemId || !['resource', 'test'].includes(itemType)) {
    return res.status(400).json({ error: 'studentIds (array), itemId and itemType are required' });
  }

  try {
    // Tutors can only assign to their own students
    if (req.user.role === 'tutor') {
      const usersSnap = await db.collection('users')
        .where('__name__', 'in', studentIds.slice(0, 30))
        .get();
      const invalid = usersSnap.docs.some(
        (doc) => doc.data().assignedTutorId !== req.user.uid
      );
      if (invalid || usersSnap.size !== studentIds.length) {
        return res.status(403).json({ error: 'You can only assign work to your own students' });
      }
    }

    const batch = db.batch();
    const created = [];

    for (const studentId of studentIds) {
      // Avoid duplicate assignments
      const existing = await db.collection('assignments')
        .where('studentId', '==', studentId)
        .where('itemId', '==', itemId)
        .where('itemType', '==', itemType)
        .limit(1)
        .get();

      if (!existing.empty) continue;

      const ref = db.collection('assignments').doc();
      const data = {
        studentId,
        itemId,
        itemType,
        assignedBy: req.user.uid,
        assignedAt: new Date().toISOString(),
        status: 'assigned',
      };
      batch.set(ref, data);
      created.push({ id: ref.id, ...data });
    }

    await batch.commit();
    return res.status(201).json(created);
  } catch (err) {
    console.error('createAssignment error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/assignments/:id
 * Tutor/owner - remove an assignment (unassign)
 */
router.delete('/:id', verifyToken, requireRole('tutor', 'owner'), async (req, res) => {
  try {
    const docRef = db.collection('assignments').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Assignment not found' });

    if (req.user.role === 'tutor') {
      const studentDoc = await db.collection('users').doc(doc.data().studentId).get();
      if (studentDoc.data()?.assignedTutorId !== req.user.uid) {
        return res.status(403).json({ error: 'You can only manage your own students\' assignments' });
      }
    }

    await docRef.delete();
    return res.status(200).json({ message: 'Assignment removed' });
  } catch (err) {
    console.error('deleteAssignment error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/assignments/student/:studentId
 * Self / tutor (of that student) / owner - get all assignments for a student
 */
router.get('/student/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;

  try {
    if (req.user.role === 'student' && req.user.uid !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'tutor') {
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (studentDoc.data()?.assignedTutorId !== req.user.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const snap = await db.collection('assignments').where('studentId', '==', studentId).get();
    const assignments = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(assignments);
  } catch (err) {
    console.error('getAssignments error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/assignments/markRead
 * Student - mark a resource as read
 * body: { resourceId }
 */
router.post('/markRead', verifyToken, requireRole('student'), async (req, res) => {
  const { resourceId } = req.body;
  if (!resourceId) return res.status(400).json({ error: 'resourceId is required' });

  try {
    const progressId = `${req.user.uid}_${resourceId}`;
    await db.collection('progress').doc(progressId).set({
      studentId: req.user.uid,
      resourceId,
      status: 'read',
      readAt: new Date().toISOString(),
    });

    // Update assignment status if it exists
    const assignmentSnap = await db.collection('assignments')
      .where('studentId', '==', req.user.uid)
      .where('itemId', '==', resourceId)
      .where('itemType', '==', 'resource')
      .limit(1)
      .get();

    if (!assignmentSnap.empty) {
      await assignmentSnap.docs[0].ref.update({ status: 'completed' });
    }

    return res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markRead error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/assignments/progress/:studentId
 * Self / tutor / owner - get reading progress for a student
 */
router.get('/progress/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;

  try {
    if (req.user.role === 'student' && req.user.uid !== studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'tutor') {
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (studentDoc.data()?.assignedTutorId !== req.user.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const snap = await db.collection('progress').where('studentId', '==', studentId).get();
    const progress = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(progress);
  } catch (err) {
    console.error('getProgress error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
