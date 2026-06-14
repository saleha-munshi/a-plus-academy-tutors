const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/tests
 * Owner only - create a multiple choice test
 * body: { title, linkedResourceId?, questions: [{ questionText, options: [4 strings], correctAnswerIndex }] }
 */
router.post('/', verifyToken, requireRole('owner'), async (req, res) => {
  const { title, gradeLevel, subject, topic, questions } = req.body;

  if (!title || !['gcse', 'a-level'].includes(gradeLevel) || !subject || !topic) {
    return res.status(400).json({ error: 'title, gradeLevel, subject, and topic are required' });
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'A non-empty questions array is required' });
  }

  for (const q of questions) {
    if (
      !q.questionText ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      typeof q.correctAnswerIndex !== 'number' ||
      q.correctAnswerIndex < 0 ||
      q.correctAnswerIndex > 3
    ) {
      return res.status(400).json({
        error: 'Each question needs questionText, exactly 4 options, and a correctAnswerIndex (0-3)',
      });
    }
  }

  try {
    const docRef = db.collection('tests').doc();
    const testData = {
      title,
      gradeLevel,
      subject,
      topic,
      questions: questions.map((q, i) => ({
        id: q.id || `q${i + 1}`,
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
      })),
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(testData);
    return res.status(201).json({ id: docRef.id, ...testData });
  } catch (err) {
    console.error('createTest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tests
 * Tutor/owner: full test data including correct answers (for review/editing)
 * Student: stripped questions (no correctAnswerIndex), only assigned tests
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    let snap;

    if (req.user.role === 'student') {
      const assignmentsSnap = await db
        .collection('assignments')
        .where('studentId', '==', req.user.uid)
        .where('itemType', '==', 'test')
        .get();

      const testIds = assignmentsSnap.docs.map((d) => d.data().itemId);
      if (testIds.length === 0) return res.status(200).json([]);

      // Firestore 'in' queries support max 30 values
      const chunks = [];
      for (let i = 0; i < testIds.length; i += 30) {
        chunks.push(testIds.slice(i, i + 30));
      }

      const tests = [];
      for (const chunk of chunks) {
        const testsSnap = await db
          .collection('tests')
          .where('__name__', 'in', chunk)
          .get();
        testsSnap.forEach((doc) => {
          const data = doc.data();
          tests.push({
            id: doc.id,
            title: data.title,
            gradeLevel: data.gradeLevel,
            subject: data.subject,
            topic: data.topic,
            questions: data.questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              options: q.options,
              // correctAnswerIndex deliberately omitted
            })),
          });
        });
      }
      return res.status(200).json(tests);
    }

    // Tutor / owner - full data
    snap = await db.collection('tests').orderBy('createdAt', 'desc').get();
    const tests = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(tests);
  } catch (err) {
    console.error('getTests error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tests/:id
 * Tutor/owner only - full test with answers (for editing)
 */
router.get('/:id', verifyToken, requireRole('tutor', 'owner'), async (req, res) => {
  try {
    const doc = await db.collection('tests').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Test not found' });
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('getTest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/tests/:id
 * Owner only - edit a test
 */
router.patch('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  const { title, gradeLevel, subject, topic, questions } = req.body;
  const update = {};

  if (title) update.title = title;
  if (gradeLevel) update.gradeLevel = gradeLevel;
  if (subject) update.subject = subject;
  if (topic) update.topic = topic;
  if (questions) update.questions = questions;

  try {
    const docRef = db.collection('tests').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Test not found' });

    await docRef.update(update);
    return res.status(200).json({ message: 'Test updated' });
  } catch (err) {
    console.error('updateTest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/tests/:id
 * Owner only
 */
router.delete('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const docRef = db.collection('tests').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Test not found' });

    await docRef.delete();

    const [assignmentsSnap, resultsSnap] = await Promise.all([
      db.collection('assignments').where('itemId', '==', req.params.id).where('itemType', '==', 'test').get(),
      db.collection('testResults').where('testId', '==', req.params.id).get(),
    ]);
    const batch = db.batch();
    assignmentsSnap.forEach((d) => batch.delete(d.ref));
    resultsSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return res.status(200).json({ message: 'Test deleted' });
  } catch (err) {
    console.error('deleteTest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
