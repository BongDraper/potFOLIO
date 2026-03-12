# potFOLIO (Windows XP Desktop Edition)

A static GitHub Pages portfolio that behaves like a Windows XP desktop and includes an in-browser Task Manager CMS for managing `data/projects.json`.

## Project files

- `index.html` - desktop shell, taskbar, and reusable window template.
- `styles.css` - XP look-and-feel and responsive fallback styles.
- `app.js` - desktop interactions, project windows, schema guards, and CMS + GitHub API sync.
- `data/projects.json` - source of truth project data.

## Run locally

### Option 1: open directly
Open `index.html` in your browser.

### Option 2: static server (recommended)
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173`.

## Deploy to GitHub Pages

1. Commit changes to the `main` branch.
2. In GitHub repo settings, go to **Pages**.
3. Set source to **Deploy from a branch**.
4. Select branch `main`, folder `/ (root)`.
5. Save and wait for deployment.

## Task Manager usage

1. Double-click **Task Manager** desktop icon.
2. Password prompt: `Bong`.
3. Use CMS controls:
   - **Add Project**
   - **Save Edit**
   - **Delete**
   - **Save Local** (localStorage persistence)
   - **Pull From Repo** (reads `data/projects.json` from GitHub Contents API)
   - **Push To Repo** (writes `data/projects.json` via GitHub Contents API)

## GitHub token requirements for Push

Use a Personal Access Token with repository write access:

- Fine-grained token:
  - Repository access: your target repo
  - Permissions: **Contents: Read and Write**
- Classic token (legacy):
  - `repo` scope

## Notes

- Project schema is enforced as:
  - `name`, `brand`, `role`, `year`, `description`
- Missing/corrupt input is normalized with defaults so the desktop can still render.
- Local overrides are stored in browser `localStorage` under `potfolio.projects.override.v2`.
