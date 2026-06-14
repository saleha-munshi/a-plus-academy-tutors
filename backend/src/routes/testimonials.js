const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/** GET /api/testimonials — public */
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('testimonials').orderBy('createdAt', 'asc').get();
    return res.status(200).json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/testimonials — owner only */
router.post('/', verifyToken, requireRole('owner'), async (req, res) => {
  const { quote, author } = req.body;
  if (!quote || !author) return res.status(400).json({ error: 'quote and author are required' });
  try {
    const ref = db.collection('testimonials').doc();
    const data = { quote, author, createdAt: new Date().toISOString() };
    await ref.set(data);
    return res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/testimonials/:id — owner only */
router.patch('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  const { quote, author } = req.body;
  try {
    const ref = db.collection('testimonials').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
    const updates = {};
    if (quote !== undefined) updates.quote = quote;
    if (author !== undefined) updates.author = author;
    await ref.update(updates);
    return res.status(200).json({ message: 'Updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/testimonials/:id — owner only */
router.delete('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  try {
    const ref = db.collection('testimonials').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Not found' });
    await ref.delete();
    return res.status(200).json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
