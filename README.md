# Portfolio Site (XP Desktop)

Windows XP-inspired portfolio for GitHub Pages.

## Features
- Desktop UI with clickable project icons
- Each project is backed by `data/projects.json`
- Built-in **Task Manager** CMS icon (password: `Bong`)
- CMS fields:
  - Project Name
  - Brand (Client)
  - Role
  - Year
  - Description
- Push updates directly to repo via GitHub API from Task Manager (so changes survive refresh)

## Files
- `index.html` — desktop shell
- `styles.css` — XP-inspired styling + icon behavior
- `app.js` — windows, project rendering, CMS, GitHub push/pull
- `data/projects.json` — content DB
- `assets/bliss.jpg` — wallpaper

## GitHub Pages setup
1. Create/Use repo (example: `portfolio-site`)
2. Upload this folder contents to repo root
3. Enable GitHub Pages (Deploy from branch: `main` / root)

## CMS Repo Push Setup (inside Task Manager)
Open **Task Manager** icon and enter:
- Owner (GitHub username/org)
- Repo name
- Branch (usually `main`)
- GitHub token (fine-grained PAT with `Contents: Read and write`)

Then:
- **Pull From Repo** to sync
- **Push To Repo** to commit `data/projects.json`

## Notes
- Password gate (`Bong`) is UI-level access control only.
- True write security comes from GitHub token permissions.
- For production, rotate token regularly and avoid sharing it.
