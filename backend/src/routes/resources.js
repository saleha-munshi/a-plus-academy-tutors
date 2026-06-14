const express = require('express');
const multer = require('multer');
const { db, bucket } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

/**
 * GET /api/resources
 * Any authenticated user - list all resources (workbooks/textbooks)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('resources').orderBy('createdAt', 'desc').get();
    const resources = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(resources);
  } catch (err) {
    console.error('getResources error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/resources
 * Owner only - upload a PDF + create resource metadata
 * form-data: file (PDF), title, type ('workbook' | 'textbook')
 */
router.post('/', verifyToken, requireRole('owner'), upload.single('file'), async (req, res) => {
  const { title, resourceType, gradeLevel, subject, topic } = req.body;

  if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
  if (!title || !['gcse', 'a-level'].includes(gradeLevel) || !subject || !topic) {
    return res.status(400).json({ error: 'title, gradeLevel, subject, and topic are required' });
  }
  if (!['subject-notes', 'homework'].includes(resourceType)) {
    return res.status(400).json({ error: 'resourceType must be subject-notes or homework' });
  }

  try {
    const docRef = db.collection('resources').doc();
    const storagePath = `resources/${docRef.id}.pdf`;

    const fileRef = bucket.file(storagePath);
    await fileRef.save(req.file.buffer, {
      metadata: { contentType: 'application/pdf' },
    });

    const resourceData = {
      title,
      resourceType,
      gradeLevel,
      subject,
      topic,
      storagePath,
      uploadedBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(resourceData);

    return res.status(201).json({ id: docRef.id, ...resourceData });
  } catch (err) {
    console.error('uploadResource error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/resources/:id
 * Owner only - edit resource metadata and optionally replace the PDF
 */
router.patch('/:id', verifyToken, requireRole('owner'), upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, resourceType, gradeLevel, subject, topic } = req.body;

  try {
    const docRef = db.collection('resources').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Resource not found' });

    const updates = {};
    if (title) updates.title = title;
    if (resourceType && ['subject-notes', 'homework'].includes(resourceType)) updates.resourceType = resourceType;
    if (gradeLevel && ['gcse', 'a-level'].includes(gradeLevel)) updates.gradeLevel = gradeLevel;
    if (subject) updates.subject = subject;
    if (topic) updates.topic = topic;

    if (req.file) {
      const { storagePath } = doc.data();
      if (storagePath) await bucket.file(storagePath).delete().catch(() => {});
      const newPath = `resources/${id}.pdf`;
      await bucket.file(newPath).save(req.file.buffer, { metadata: { contentType: 'application/pdf' } });
      updates.storagePath = newPath;
    }

    await docRef.update(updates);
    return res.status(200).json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('editResource error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/resources/:id
 * Owner only - delete resource metadata + file
 */
router.delete('/:id', verifyToken, requireRole('owner'), async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection('resources').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Resource not found' });

    const { storagePath } = doc.data();
    if (storagePath) {
      await bucket.file(storagePath).delete().catch(() => {});
    }
    await docRef.delete();

    // Clean up assignments referencing this resource
    const assignmentsSnap = await db
      .collection('assignments')
      .where('itemId', '==', id)
      .where('itemType', '==', 'resource')
      .get();
    const batch = db.batch();
    assignmentsSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return res.status(200).json({ message: 'Resource deleted' });
  } catch (err) {
    console.error('deleteResource error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/resources/:id/view
 * Streams the PDF through the server to avoid CORS issues with GCS signed URLs.
 * Students: must have an active assignment for this resource.
 * Tutors/owner: always allowed.
 */
router.get('/:id/view', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection('resources').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Resource not found' });

    if (req.user.role === 'student') {
      const assignmentSnap = await db
        .collection('assignments')
        .where('studentId', '==', req.user.uid)
        .where('itemId', '==', id)
        .where('itemType', '==', 'resource')
        .limit(1)
        .get();

      if (assignmentSnap.empty) {
        return res.status(403).json({ error: 'This resource has not been assigned to you' });
      }
    }

    const { storagePath } = doc.data();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');

    bucket.file(storagePath).createReadStream()
      .on('error', (err) => {
        console.error('streamResource error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file' });
      })
      .pipe(res);
  } catch (err) {
    console.error('viewResource error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
