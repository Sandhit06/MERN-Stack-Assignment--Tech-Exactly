# Margin demo outline (approximately 7–9 minutes)

Before recording: start MongoDB and the app, seed sample content, have the regular/admin credentials ready privately, and run the verification commands. Close private tabs. Do not show `.env`. Use the live app, not screenshots of an earlier build.

## 0:00–0:45 — Introduce Margin

“Margin is a MERN blog application: a reading room for stories and the conversations they start. It has regular users and admins, and the permissions are enforced in the API.”

Show the homepage, story cards, and responsive navigation. Mention MongoDB, Express, React and Node.

## 0:45–1:45 — Read and authenticate

Open an essay and show its comments. Register a new demo account or sign in as a sample writer. Reload the page to show session restoration.

If Google/Facebook are configured and manually verified, demonstrate them. Otherwise, state that the provider adapters are implemented but developer credentials/live verification are still needed. Do not present disabled buttons as completed live login.

## 1:45–3:15 — Publish and edit

Create a story with a meaningful title and two paragraphs. Publish and open it. Edit the title and point out that the slug remains stable. Show My Stories.

Explain that author identity comes from the authenticated account, not from a user-supplied field.

## 3:15–4:15 — Comments and ownership

Use a second session/incognito window signed in as the other sample writer. Read the story and add a comment. Show that another author's post does not offer editing controls. Edit/delete the second user's own comment.

Explain that backend tests also send unauthorized requests directly, so this is not just hidden buttons.

## 4:15–5:45 — Admin panel

Sign in as admin. Show dashboard totals and their definitions. Use Stories, People and Comments tabs. Edit/moderate another author's content. Demonstrate disable/reactivate with a regular test account. Show that demoting the last active admin is rejected.

Soft-delete a disposable story and show it under Show deleted. Explain that its public URL/comments are no longer available.

## 5:45–7:00 — Architecture and tests

Show routes → middleware → controllers → services → models. Point to validation, indexed queries, consistent errors and session hashing/rotation.

Show passing test output and browser-test report. Explain isolated test databases and the difference between automated OAuth state/identity tests and a real provider login check.

## 7:00–8:00 — Handoff

Show the setup commands and two READMEs. Summarize implemented required features and outstanding external provider setup if applicable. Mention that real-time notifications are an optional bonus not included.

The assignment requires the finished 5–10 minute recording. This document is its script, not the video itself.
