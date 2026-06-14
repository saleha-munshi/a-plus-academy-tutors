const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/applications
 * Public - submit a student application from the homepage
 * body: { name, email, message? }
 */
router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const docRef = db.collection('applications').doc();
    const data = {
      name,
      email,
      phone: phone || '',
      message: message || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    await docRef.set(data);
    return res.status(201).json({ id: docRef.id, ...data });
  } catch (err) {
    console.error('submitApplication error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/applications
 * Owner only - list all applications
 */
router.get('/', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const snap = await db.collection('applications').orderBy('submittedAt', 'desc').get();
    const applications = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(applications);
  } catch (err) {
    console.error('getApplications error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/applications/:id
 * Owner only - approve/reject an application
 * body: { status: 'approved' | 'rejected' }
 */
router.patch('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'onboarded', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'pending', 'onboarded' or 'rejected'" });
  }

  try {
    const docRef = db.collection('applications').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Application not found' });

    await docRef.update({ status });
    return res.status(200).json({ message: `Application ${status}` });
  } catch (err) {
    console.error('updateApplication error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
