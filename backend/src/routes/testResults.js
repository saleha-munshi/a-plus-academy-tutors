const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/test-results
 * Student only - submit answers, graded server-side
 * body: { testId, answers: number[] }  (answers[i] = selected option index for questions[i])
 */
router.post('/', verifyToken, requireRole('student'), async (req, res) => {
  const { testId, answers } = req.body;

  if (!testId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'testId and answers (array) are required' });
  }

  try {
    // Confirm test is assigned to this student
    const assignmentSnap = await db.collection('assignments')
      .where('studentId', '==', req.user.uid)
      .where('itemId', '==', testId)
      .where('itemType', '==', 'test')
      .limit(1)
      .get();

    if (assignmentSnap.empty) {
      return res.status(403).json({ error: 'This test has not been assigned to you' });
    }

    // Prevent duplicate submissions
    const existingResult = await db.collection('testResults')
      .where('studentId', '==', req.user.uid)
      .where('testId', '==', testId)
      .limit(1)
      .get();

    if (!existingResult.empty) {
      return res.status(409).json({ error: 'You have already completed this test' });
    }

    const testDoc = await db.collection('tests').doc(testId).get();
    if (!testDoc.exists) return res.status(404).json({ error: 'Test not found' });

    const { questions } = testDoc.data();

    if (answers.length !== questions.length) {
      return res.status(400).json({ error: `Expected ${questions.length} answers, got ${answers.length}` });
    }

    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) correctCount += 1;
    });

    const score = Math.round((correctCount / questions.length) * 100);

    const resultRef = db.collection('testResults').doc();
    const resultData = {
      studentId: req.user.uid,
      testId,
      answers,
      correctCount,
      totalQuestions: questions.length,
      score,
      completedAt: new Date().toISOString(),
    };

    await resultRef.set(resultData);

    // Update assignment status
    await assignmentSnap.docs[0].ref.update({ status: 'completed' });

    return res.status(201).json({ id: resultRef.id, ...resultData });
  } catch (err) {
    console.error('submitTestResult error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test-results
 * Owner: all results across all students
 * Tutor: results for their assigned students only
 */
router.get('/', verifyToken, requireRole('tutor', 'owner'), async (req, res) => {
  try {
    if (req.user.role === 'owner') {
      const snap = await db.collection('testResults').orderBy('completedAt', 'desc').get();
      return res.status(200).json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }

    // Tutor: only their assigned students
    const studentsSnap = await db
      .collection('users')
      .where('role', '==', 'student')
      .where('assignedTutorId', '==', req.user.uid)
      .get();

    const studentIds = studentsSnap.docs.map((d) => d.id);
    if (studentIds.length === 0) return res.status(200).json([]);

    const results = [];
    for (let i = 0; i < studentIds.length; i += 30) {
      const chunk = studentIds.slice(i, i + 30);
      const snap = await db.collection('testResults').where('studentId', 'in', chunk).get();
      snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    }
    results.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return res.status(200).json(results);
  } catch (err) {
    console.error('getAllTestResults error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test-results/:studentId
 * Self / tutor (of that student) / owner - view test results
 */
router.get('/:studentId', verifyToken, async (req, res) => {
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

    const snap = await db.collection('testResults').where('studentId', '==', studentId).get();
    const results = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(results);
  } catch (err) {
    console.error('getTestResults error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
