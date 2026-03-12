# potFOLIO (Windows XP Desktop Edition)

Static GitHub Pages portfolio rebuilt from scratch as a Windows XP-inspired desktop.

## Files

- `index.html` — desktop shell, window template, and taskbar.
- `styles.css` — XP styling for desktop, icons, taskbar, and windows.
- `app.js` — icon rendering, draggable windows, and Task Manager CMS logic.
- `data/projects.json` — seed project data (11 sample projects).
- Desktop icons use an inline SVG data URI (no binary assets required).

## Features

- Desktop background and XP-like taskbar UI.
- Project icons open details windows on double-click.
- Task Manager icon asks for password (`Bong`) and opens CMS.
- CMS supports create/read/update/delete for projects.
- Save local override to browser localStorage.
- Pull `data/projects.json` from GitHub raw URL.
- Push `data/projects.json` back to GitHub Contents API.

## Run locally

Open `index.html` directly or serve with any static file server.
