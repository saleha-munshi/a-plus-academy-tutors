# Tutoring Hub

Full-stack tutoring platform: React + TypeScript frontend, Express backend, Firebase (Auth, Firestore, Storage).

## Structure

```
backend/    Express API (Firebase Admin SDK)
frontend/   React + TS (Vite), Firebase client SDK
firestore.rules
storage.rules
```

## Roles

- **owner** — manage accounts, upload PDFs, build tests, assign work, review applications
- **tutor** — view assigned students, assign existing resources/tests
- **student** — view assigned resources, mark as read, take unlocked tests

There is no public sign-up. The homepage has an application form; the owner creates accounts manually via the admin panel.

## Setup

### 1. Firebase project

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password provider).
3. Enable **Firestore** (production mode).
4. Enable **Storage**.
6. Generate a service account key: Project Settings → Service Accounts → Generate new private key. Use this for the backend `.env`.
7. Get the web app config: Project Settings → General → Your apps → Web app. Use this for the frontend `.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in Firebase Admin credentials
npm install
npm run dev
```

Runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in Firebase web config + VITE_API_BASE_URL
npm install
npm run dev
```

Runs on `http://localhost:5173`.

### 4. Create the first owner account

The owner account can't be created via the API (chicken-and-egg: creating users requires an owner-authenticated request). Create it manually:

1. In Firebase Console → Authentication, manually add a user (email/password).
2. Use the Firebase Admin SDK (e.g. a one-off script, or the Firebase console's Cloud Shell) to set the custom claim:
   ```js
   admin.auth().setCustomUserClaims(uid, { role: 'owner' });
   ```
3. Add a corresponding `users/{uid}` document in Firestore with `{ name, email, role: 'owner', createdAt }`.

After that, the owner can create all other accounts through the app.

## Notes

- PDFs are stored privately in Firebase Storage; served via short-lived signed URLs through the backend (`GET /api/resources/:id/view`), which checks the student has been assigned the resource.
- Tests are graded server-side. Students never receive `correctAnswerIndex` in API responses.
- "Mark as read" unlocks any test linked to that resource (`linkedResourceId`) once assigned.
