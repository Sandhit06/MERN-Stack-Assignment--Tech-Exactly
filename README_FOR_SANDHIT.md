# Margin: your personal project guide

This guide is for you, Sandhit. It explains how to use the project, what the code is doing, and how to talk about it confidently. The main `README.md` is the formal technical introduction; this file is the slower walkthrough.

## 1. What have we built?

Margin is a small publishing community. A person can read a story, make an account, publish their own story, and leave comments. An admin keeps the community organized by managing users and moderating content.

The name refers to the margin around a page. A margin gives your thoughts room to breathe. The tagline is **A little room for thought.**

This is a real full-stack app: its records are saved in MongoDB. The six starting essays are sample data inserted into the database, not fake cards hard-coded into the homepage. Registering, publishing, commenting, and deleting make actual API requests and database changes.

## 2. The three parts you need to understand

Imagine a restaurant:

| Project part         | Restaurant analogy                       | Actual job                                       |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| React frontend       | The menu and dining area                 | What you see and interact with                   |
| Express/Node backend | The staff checking and handling requests | Validates requests, checks access, applies rules |
| MongoDB database     | The organized storage                    | Remembers accounts, stories and comments         |

The browser does not connect directly to MongoDB. It asks the backend. That matters because the backend can reject an unauthorized action even if someone bypasses the interface.

MERN means **MongoDB, Express, React, Node**. Mongoose helps JavaScript work with MongoDB through defined models. Vite runs/builds the frontend; it is not another database or backend framework.

## 3. Start it on your computer

Open a PowerShell terminal in `C:\Users\Sandhit\Downloads\Proj`. All commands below assume you are in this project folder.

For a fresh checkout, run these once:

```powershell
npm.cmd ci
npm.cmd run setup
```

`npm ci` installs the exact packages listed in `package-lock.json`. `setup` creates `.env` if missing. Your current local workspace has already had setup run; repeating it preserves your existing settings.

You normally need **two terminals**:

**Terminal A:**

```powershell
npm.cmd run db
```

Leave it open. This is the database. If MongoDB is already running as a Windows service, skip this command. The first convenience-runner download is large; later starts reuse it.

**Terminal B:**

```powershell
npm.cmd run seed
npm.cmd run dev
```

`seed` creates the starting content and local accounts. It preserves existing records, so you do not need to seed on every start. `dev` starts the API and frontend together.

Open **http://localhost:5173** in Chrome or Edge. Keep both terminals open while using the app. Ctrl+C stops the process in a terminal. Closing your browser does not stop the servers.

For everyday use after the first setup: start the database, then `npm.cmd run dev`.

## 4. How to log in

Open `.env` in your editor. You will see:

- `ADMIN_EMAIL`: the admin email, initially `admin@margin.local`.
- `ADMIN_PASSWORD`: a random password created for this local setup.
- `DEMO_PASSWORD`: the password for both sample regular users.

These are deliberately not written in this guide or in Git. Copy the appropriate password from your local `.env` into the login form.

Use `maya@margin.local` or `arjun@margin.local` with `DEMO_PASSWORD` for regular-user testing. Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` to see the Admin navigation item. Or register a new account through the site.

**Important:** seed variables are used only when creating an account. If you edit `ADMIN_PASSWORD` after the admin already exists and seed again, the existing password is not reset. This prevents seeding from silently overwriting an account. There is no password-reset feature in this assignment.

Never share or commit `.env`. `.env.example` is the public template and contains no working secrets.

## 5. A first walkthrough

1. Open the homepage. Read a sample essay and its comment.
2. Register your own account. Notice that “Write a story” becomes available.
3. Publish a title and at least 20 characters of content. Content is plain text; blank lines separate paragraphs.
4. Edit the story. Its URL remains the same even if you change the title.
5. Leave a comment. Edit it and delete it using the controls beside it.
6. Refresh the page. You should stay signed in because the app restores the session.
7. Sign out. Open `/write` directly. You should be taken to login.
8. Log in as the admin and visit `/admin`. Check the totals and the Stories, People, and Comments tabs.

The interface asks for confirmation before deleting something or changing a user's access.

## 6. What happens when you publish a story?

Follow this path to understand the code:

1. `client/src/pages/Editor.jsx` collects the title and content.
2. `client/src/api/client.js` sends `POST /api/v1/posts` with your access token.
3. `server/src/routes/index.js` selects the matching route.
4. Authentication middleware verifies who you are. Validation rejects invalid content or extra fields.
5. The controller calls `createPost` in `server/src/services/content.js`.
6. The service creates a URL slug and assigns your account as the author. It never trusts an author ID from the browser.
7. The Mongoose `Post` model saves the document in MongoDB.
8. The API returns a safe response, and React opens your new story page.

To debug a feature, follow the same path: screen → request → route → middleware → controller → service → model.

## 7. Login and tokens, without the jargon

Your password is not stored as readable text. The backend uses bcrypt to create a hash. At login, it checks whether the password you entered matches that hash.

After login, the app uses two tokens:

- **Access token:** a short-lived pass that accompanies protected API requests. It lasts 15 minutes and stays in browser memory.
- **Refresh token:** a longer-lived pass kept in an HttpOnly cookie. JavaScript cannot read that cookie directly. It allows the API to issue a new access token when necessary.

Each successful refresh replaces the refresh token. The database stores its hash. Reusing an old refresh token revokes that session. Logout revokes the session too, so an already-issued access token no longer grants access.

When you reload the page, the in-memory access token disappears. The cookie remains, so the frontend asks the API to restore the session. This is why staying logged in does not require storing the access token in localStorage.

Google/Facebook login is a different way to prove identity initially. Once a provider verifies a person, Margin creates its own app session. Provider tokens are not used as Margin access tokens.

## 8. Roles and ownership

**Authentication** answers “Who are you?” **Authorization** answers “Are you allowed to do this?”

| Action                             | Visitor | Regular user | Admin |
| ---------------------------------- | ------- | ------------ | ----- |
| Read active stories/comments       | Yes     | Yes          | Yes   |
| Publish a story or comment         | No      | Yes          | Yes   |
| Edit/delete own content            | No      | Yes          | Yes   |
| Edit/delete someone else's content | No      | No           | Yes   |
| Manage accounts                    | No      | No           | Yes   |
| See admin totals/panel             | No      | No           | Yes   |

Owning a story does **not** let a regular user edit another person's comment on it. Only that comment's author or an admin can do that.

Hiding an Edit button is helpful for usability, but it is not security. The backend repeats the permission check. If someone manually changes a request's ID, they still cannot edit another user's content.

The last active admin cannot be disabled, deleted, or demoted. Otherwise, nobody would be able to manage the application.

## 9. What deletion actually means

A story uses **soft deletion**. The document stays in MongoDB, but its `deletedAt` field is filled in. Normal API queries exclude it. Its comments are hidden alongside it. An admin can inspect deleted stories through “Show deleted”; this version does not provide a restore button.

Deleting a comment removes that comment permanently. Deleting an account retains it as a disabled/deleted record and revokes its sessions. Old published content remains, with a neutral “Deleted account” author label. The deleted email stays reserved.

Disabling a user is reversible: use Reactivate. Soft-deleting a user has no restore UI. Changing roles/status revokes that user's sessions so they sign in again with current permissions.

## 10. Where should you look in the source?

| You want to understand/change…        | Start here                                     |
| ------------------------------------- | ---------------------------------------------- |
| Homepage and story cards              | `client/src/pages/Home.jsx`                    |
| Colors, spacing, fonts, mobile layout | `client/src/styles.css`                        |
| Sign-in/register forms                | `client/src/pages/Auth.jsx`                    |
| Writing/editing                       | `client/src/pages/Editor.jsx`                  |
| Story content and comments            | `client/src/pages/Story.jsx`                   |
| Admin interface                       | `client/src/pages/Admin.jsx`                   |
| Logged-in state                       | `client/src/context/AuthContext.jsx`           |
| API calls and automatic token refresh | `client/src/api/client.js`                     |
| What URLs the API supports            | `server/src/routes/index.js` and `docs/API.md` |
| Passwords and sessions                | `server/src/services/auth.js`                  |
| Post/comment rules                    | `server/src/services/content.js`               |
| Admin rules and totals                | `server/src/services/admin.js`                 |
| Database fields/indexes               | `server/src/models/index.js`                   |
| Required input lengths and shapes     | `server/src/validators/index.js`               |
| Sample stories                        | `server/scripts/seed.js`                       |

A **controller** translates HTTP into a service call and returns the response. A **service** contains the meaningful business rule. A **model** describes how data is stored. Keeping these separate makes the application easier to test and explain.

## 11. How to test it yourself

Before a demo or after changes, run:

```powershell
npm.cmd run lint
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run test:e2e
```

- **Lint** catches certain mistakes in source code.
- **Unit tests** check small rules, such as creating a slug or rejecting an invalid password.
- **Integration tests** send real API requests against a disposable database.
- **Frontend tests** check forms, route guards, error handling and session state.
- **Browser tests** drive an actual browser through complete workflows.
- **Build** checks that the frontend can be compiled for serving.

The browser tests use Edge by default. If Edge is unavailable, follow the Chromium instructions in the main README. Build before browser tests: those tests serve the compiled frontend, not Vite.

Tests use their own databases. Your six sample essays and your own stories in `margin_dev` are not erased by running tests. Test accounts such as `editor@example.test` exist only in the disposable browser-test database; they are not your everyday login accounts.

Coverage shows how much selected code the tests execute. It is useful evidence, but 100% coverage would not prove an app has no bugs. The tests also check meaningful outcomes, especially forbidden actions.

For an easy manual ownership check, open a regular browser and an incognito window. Log in as Maya in one and Arjun in the other. Create a post as Maya. Arjun should be able to read and comment, but not edit Maya's story.

## 12. Social login setup

Google and Facebook need developer applications that belong to you. The code is wired, but credentials cannot be invented. Follow `docs/OAUTH_SETUP.md`, put credentials in `.env`, and restart the backend.

Until setup is complete, the social buttons are visibly unavailable. Email/password login works independently. Passing mocked provider tests does not mean a real Google/Facebook login has been verified. You must complete one real browser login for each provider before presenting it as working in a demo.

## 13. What to say when explaining the assignment

Use your own words, but these are the key ideas:

- “The backend enforces roles and ownership, so the rules still apply if someone bypasses the frontend.”
- “Access tokens are short-lived. Refresh tokens rotate and are stored as hashes server-side.”
- “Posts use soft deletion, and public queries consistently exclude them.”
- “Controllers handle HTTP; services handle business rules; Mongoose models handle the data.”
- “MongoDB references connect authors, posts and comments. I populate only the author fields a reader needs.”
- “List routes have bounded pagination and indexes for their actual filter/sort patterns.”
- “Tests cover both successful use and forbidden behavior. Browser tests use an isolated database.”

Be honest about scope: plain-text stories, no password-reset email, no image uploads, no real-time bonus, and provider setup needed for social login. These are not hidden features.

## 14. Your final demo

Use `docs/DEMO.md` as a speaking outline. Show the public app, a writer workflow, ownership differences, comments, and admin actions. Then briefly show the folder organization and test results. Keep the video between 5 and 10 minutes.

Do not show the contents of `.env`, real provider secrets, or private browser information while recording. Use the demo accounts.

## 15. Git and what has been changed

Everything is currently local. The repository remote is already configured to your GitHub URL. No push was performed. Generated credentials, database files, installed packages, and reports are ignored by Git.

You can inspect the work with:

```powershell
git status
git diff
```

New untracked files do not appear in a normal `git diff` until staged; you can open them directly in your editor. Review the main README and the app before committing or publishing.

## 16. If something breaks

Start with the terminal messages. A page error often tells you what the frontend encountered; the API terminal shows the request and status. The health endpoint `http://localhost:5000/api/v1/health` should return an `ok` status when the database is connected.

If the app cannot connect, ask: is MongoDB running, is the API running, is Vite running, and am I using `http://localhost:5173`? Most local startup problems come down to one of those four things.

Do not solve a startup issue by deleting the database or overwriting `.env`. Check the error first. The main README contains a symptom-by-symptom troubleshooting table.
