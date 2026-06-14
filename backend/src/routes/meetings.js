const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/** GET /api/meetings */
router.get('/', verifyToken, async (req, res) => {
  try {
    let snap;
    if (req.user.role === 'student') {
      snap = await db.collection('meetings').where('studentId', '==', req.user.uid).get();
    } else {
      snap = await db.collection('meetings').orderBy('start', 'asc').get();
    }
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (req.user.role === 'student') docs.sort((a, b) => (a.start < b.start ? -1 : 1));
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/meetings — tutor / owner only */
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  const { title, studentId, studentName, start, end, meetLink, notes } = req.body;
  if (!title || !studentId || !start || !end) {
    return res.status(400).json({ error: 'title, studentId, start, end are required' });
  }
  try {
    const tutorDoc = await db.collection('users').doc(req.user.uid).get();
    const tutorName = tutorDoc.exists ? (tutorDoc.data().name || '') : '';
    const ref = db.collection('meetings').doc();
    const data = {
      title,
      studentId,
      studentName: studentName || '',
      tutorId: req.user.uid,
      tutorName,
      start,
      end,
      meetLink: meetLink || '',
      notes: notes || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await ref.set(data);
    return res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/meetings/:id — tutor / owner only (edit details) */
router.patch('/:id', verifyToken, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
    const allowed = ['title', 'studentId', 'studentName', 'start', 'end', 'meetLink', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await ref.update(updates);
    return res.json({ message: 'Updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/meetings/:id — tutor / owner only */
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
    await ref.delete();
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/meetings/:id/accept — student accepts the meeting */
router.post('/:id/accept', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    if (doc.data().studentId !== req.user.uid) return res.status(403).json({ error: 'Forbidden' });
    await ref.update({ status: 'confirmed' });
    return res.json({ message: 'Accepted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/meetings/:id/propose — student proposes a new time */
router.post('/:id/propose', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });
  const { proposedStart, proposedEnd, proposalNotes } = req.body;
  if (!proposedStart || !proposedEnd) {
    return res.status(400).json({ error: 'proposedStart and proposedEnd required' });
  }
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    if (doc.data().studentId !== req.user.uid) return res.status(403).json({ error: 'Forbidden' });
    await ref.update({
      status: 'student_proposed',
      proposedStart,
      proposedEnd,
      proposalNotes: proposalNotes || '',
    });
    return res.json({ message: 'Proposal submitted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/meetings/:id/accept-proposal — tutor accepts student's counter-proposal */
router.post('/:id/accept-proposal', verifyToken, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    const data = doc.data();
    if (!data.proposedStart || !data.proposedEnd) {
      return res.status(400).json({ error: 'No proposal to accept' });
    }
    await ref.update({
      status: 'confirmed',
      start: data.proposedStart,
      end: data.proposedEnd,
      proposedStart: null,
      proposedEnd: null,
      proposalNotes: null,
    });
    return res.json({ message: 'Proposal accepted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/meetings/:id/decline-proposal — tutor declines student's counter-proposal */
router.post('/:id/decline-proposal', verifyToken, async (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ error: 'Forbidden' });
  try {
    const ref = db.collection('meetings').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
    await ref.update({ status: 'declined', proposedStart: null, proposedEnd: null, proposalNotes: null });
    return res.json({ message: 'Proposal declined' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
