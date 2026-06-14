import { FormEvent, useState } from 'react';
import { GradeLevel, Resource } from '../types';
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

interface QuestionDraft {
  questionText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
}

interface TestBuilderProps {
  resources: Resource[];
  onCreated: () => void;
}

const emptyQuestion = (): QuestionDraft => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
});

export default function TestBuilder({ resources, onCreated }: TestBuilderProps) {
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('gcse');
  const [subject, setSubject] = useState(GCSE_SUBJECTS[0]);
  const [topic, setTopic] = useState('');
  const [addingNewTopic, setAddingNewTopic] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
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

  const updateQuestion = (index: number, updates: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = [...q.options] as [string, string, string, string];
        options[oIndex] = value;
        return { ...q, options };
      })
    );
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) { setError('Please select or enter a topic'); return; }

    if (questions.some((q) => !q.questionText || q.options.some((o) => !o))) {
      setError('Please fill in all question and option fields');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/tests', {
        title,
        gradeLevel,
        subject,
        topic: topic.trim(),
        questions,
      });

      setTitle('');
      setTopic('');
      setAddingNewTopic(false);
      setQuestions([emptyQuestion()]);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    } finally {
      setSubmitting(false);
    }
  };

  const showNewTopicInput = addingNewTopic || existingTopics.length === 0;

  return (
    <form onSubmit={handleSubmit} className="test-builder">
      <label>
        Test title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Grade Level
        <select
          value={gradeLevel}
          onChange={(e) => handleGradeLevelChange(e.target.value as GradeLevel)}
        >
          <option value="gcse">GCSE</option>
          <option value="a-level">A Level</option>
        </select>
      </label>

      <label>
        Subject
        <select value={subject} onChange={(e) => handleSubjectChange(e.target.value)}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
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
              <button
                type="button"
                onClick={() => { setAddingNewTopic(false); setTopic(existingTopics[0]); }}
              >
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

      {questions.map((question, qIndex) => (
        <div key={qIndex} className="question-draft">
          <label>
            Question {qIndex + 1}
            <input
              value={question.questionText}
              onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
              required
            />
          </label>

          {question.options.map((option, oIndex) => (
            <div key={oIndex} className="option-draft">
              <input
                type="radio"
                name={`correct-${qIndex}`}
                checked={question.correctAnswerIndex === oIndex}
                onChange={() => updateQuestion(qIndex, { correctAnswerIndex: oIndex })}
                title="Mark as correct answer"
              />
              <input
                value={option}
                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                placeholder={`Option ${oIndex + 1}`}
                required
              />
            </div>
          ))}

          {questions.length > 1 && (
            <button type="button" onClick={() => removeQuestion(qIndex)}>
              Remove question
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addQuestion}>
        Add question
      </button>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save test'}
      </button>
    </form>
  );
}
