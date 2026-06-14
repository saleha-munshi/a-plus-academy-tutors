import { FormEvent, useState } from 'react';
import { GradeLevel, Resource, ResourceType } from '../types';
import { api } from '../services/api';

const GCSE_SUBJECTS = [
  'english language', 'english literature', 'maths', 'biology', 'chemistry',
  'physics', 'geography', 'history', 'religious studies', 'citizenship',
  'french', 'computer science', 'business',
];

const A_LEVEL_SUBJECTS = [
  'biology', 'chemistry', 'physics', 'maths', 'psychology', 'sociology',
  'english', 'english language', 'english literature', 'economics',
];

const capitalize = (s: string) =>
  s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

interface ResourceUploadFormProps {
  resources: Resource[];
  onUploaded: () => void;
  editingResource?: Resource | null;
  onCancelEdit?: () => void;
}

export default function ResourceUploadForm({
  resources,
  onUploaded,
  editingResource,
  onCancelEdit,
}: ResourceUploadFormProps) {
  const isEditing = !!editingResource;

  const [title, setTitle] = useState(editingResource?.title ?? '');
  const [resourceType, setResourceType] = useState<ResourceType>(editingResource?.resourceType ?? 'subject-notes');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(editingResource?.gradeLevel ?? 'gcse');
  const [subject, setSubject] = useState(editingResource?.subject ?? GCSE_SUBJECTS[0]);
  const [topic, setTopic] = useState(editingResource?.topic ?? '');
  const [addingNewTopic, setAddingNewTopic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = gradeLevel === 'gcse' ? GCSE_SUBJECTS : A_LEVEL_SUBJECTS;

  const existingTopics = [
    ...new Set(
      resources
        .filter((r) => r.gradeLevel === gradeLevel && r.subject === subject && r.topic)
        .map((r) => r.topic)
    ),
  ].sort();

  const handleGradeLevelChange = (newLevel: GradeLevel) => {
    const newSubjects = newLevel === 'gcse' ? GCSE_SUBJECTS : A_LEVEL_SUBJECTS;
    setGradeLevel(newLevel);
    setSubject(newSubjects[0]);
    setTopic('');
    setAddingNewTopic(false);
  };

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    setTopic('');
    setAddingNewTopic(false);
  };

  const handleTopicDropdownChange = (value: string) => {
    if (value === '__new__') {
      setAddingNewTopic(true);
      setTopic('');
    } else {
      setTopic(value);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEditing && !file) { setError('Please select a PDF file'); return; }
    if (!topic.trim()) { setError('Please select or enter a topic'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('resourceType', resourceType);
      formData.append('gradeLevel', gradeLevel);
      formData.append('subject', subject);
      formData.append('topic', topic.trim());
      if (file) formData.append('file', file);

      if (isEditing) {
        await api.patch(`/resources/${editingResource!.id}`, formData);
        onCancelEdit?.();
      } else {
        await api.post('/resources', formData);
        setTitle('');
        setTopic('');
        setAddingNewTopic(false);
        setFile(null);
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditing ? 'Edit failed' : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const showNewTopicInput = addingNewTopic || existingTopics.length === 0;

  return (
    <form onSubmit={handleSubmit} className="resource-upload-form">
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Type
        <select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceType)}>
          <option value="subject-notes">Subject Notes</option>
          <option value="homework">Homework</option>
        </select>
      </label>

      <label>
        Grade Level
        <select value={gradeLevel} onChange={(e) => handleGradeLevelChange(e.target.value as GradeLevel)}>
          <option value="gcse">GCSE</option>
          <option value="a-level">A Level</option>
        </select>
      </label>

      <label>
        Subject
        <select value={subject} onChange={(e) => handleSubjectChange(e.target.value)}>
          {subjects.map((s) => (
            <option key={s} value={s}>{capitalize(s)}</option>
          ))}
        </select>
      </label>

      <label>
        Topic
        {showNewTopicInput ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic name"
              style={{ flex: 1 }}
            />
            {existingTopics.length > 0 && (
              <button type="button" onClick={() => { setAddingNewTopic(false); setTopic(existingTopics[0]); }}>
                Choose existing
              </button>
            )}
          </div>
        ) : (
          <select value={topic} onChange={(e) => handleTopicDropdownChange(e.target.value)}>
            {existingTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__new__">+ Add new topic...</option>
          </select>
        )}
      </label>

      <label>
        {isEditing ? 'Replace PDF (optional)' : 'PDF File'}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required={!isEditing}
        />
        {isEditing && (
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
            Leave blank to keep the existing file.
          </span>
        )}
      </label>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={submitting}>
          {submitting ? (isEditing ? 'Saving…' : 'Uploading…') : (isEditing ? 'Save changes' : 'Upload')}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancelEdit} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
