# Student Management System (www4_V5)

A vanilla JS / HTML / CSS Progressive Web App for managing Students,
Categories, Sections, and Results, backed by Google Apps Script + Google
Sheets. Originally converted from a Cordova mobile app.

## Project structure

```
www4_V5/
├── addedFiles/              # PWA shell: login, dashboard, profile, settings
│   ├── common/               # navigation.js, session.js, theme.js, etc.
│   ├── html/                 # index.html (login), dashboard.html, profile.html, settings.html, signup.html
│   ├── images/
│   ├── js/                   # Config.js, StorageService.js, DataService.js, page controllers
│   ├── manifest.json          # PWA manifest
│   ├── *.css                  # dashboard.css, login.css, profile.css, settings.css
├── html/                     # Entity list pages
│   ├── studentList.html
│   ├── categoryList.html
│   ├── sectionList.html
│   └── resultList.html
├── js/application/           # Entity controllers (Student/Category/Section/Result .script.js)
│   └── min/                  # Minified builds
├── CHANGELOG_UI_MODERNIZATION.md
└── README.md
```

## Running locally

This is a static site with no build step. Serve the folder with any static
file server and open `addedFiles/html/index.html`:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:<port>/addedFiles/html/index.html`.

The backend (Google Apps Script Web App URL) is configured on the Settings
page (Server URL field) or via `Config.js` defaults - never commit a real
deployment URL or credentials to this repo (see `.gitignore`).

## Pushing this project to GitHub

This folder is already a git repository (`git init` has been run and an
initial commit made). To publish it:

1. Create a new, empty repository on GitHub (do **not** initialize it with
   a README/.gitignore/license, since this folder already has them):
   - Via the web UI: https://github.com/new
   - Or via the GitHub CLI: `gh repo create <your-username>/www4_V5 --public --source=. --remote=origin`

2. If you created the repo via the web UI instead, connect it manually:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```

3. For subsequent changes:
   ```bash
   git add -A
   git commit -m "Describe what changed"
   git push
   ```

## Notes

- Hungarian notation is the canonical naming convention used throughout
  this codebase - keep new code consistent with it.
- See `CHANGELOG_UI_MODERNIZATION.md` for the UI modernization history and
  bug-fix log from earlier passes.
