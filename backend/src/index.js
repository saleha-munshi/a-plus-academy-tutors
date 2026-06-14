require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const resourceRoutes = require('./routes/resources');
const testRoutes = require('./routes/tests');
const assignmentRoutes = require('./routes/assignments');
const testResultRoutes = require('./routes/testResults');
const applicationRoutes = require('./routes/applications');
const testimonialRoutes = require('./routes/testimonials');
const meetingRoutes = require('./routes/meetings');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes); // /api/students, /api/tutors
app.use('/api/resources', resourceRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/meetings', meetingRoutes);

// Generic error handler (e.g. multer file errors)
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
