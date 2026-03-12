const DATA_URL = "data/projects.json";
const STORAGE_KEY = "potfolio.projects.override.v1";
const ICON_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%2366a3ff'/%3E%3Cstop offset='1' stop-color='%233077f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' fill='url(%23g)'/%3E%3Cpath d='M0 40h64v24H0z' fill='%2332873a'/%3E%3Cpath d='M8 42c8-8 18-10 26-8 8 2 15 8 22 16v14H8z' fill='%234aa84b'/%3E%3C/svg%3E";

const state = {
  projects: [],
  z: 20,
  cmsSelection: null,
};

const desktopIcons = document.getElementById("desktop-icons");
const windowLayer = document.getElementById("window-layer");
const taskItems = document.getElementById("task-items");
const clock = document.getElementById("clock");

function createIcon({ label, img, onDblClick }) {
  const btn = document.createElement("button");
  btn.className = "desktop-icon";
  btn.innerHTML = `<img src="${img}" alt="" /><span>${label}</span>`;
  btn.addEventListener("dblclick", onDblClick);
  return btn;
}

function bringToFront(win) {
  state.z += 1;
  win.style.zIndex = String(state.z);
}

function makeDraggable(win) {
  const handle = win.querySelector(".drag-handle");
  let drag = null;
  handle.addEventListener("mousedown", (e) => {
    bringToFront(win);
    const rect = win.getBoundingClientRect();
    drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    win.style.left = `${Math.max(0, e.clientX - drag.x)}px`;
    win.style.top = `${Math.max(0, e.clientY - drag.y)}px`;
  });
  window.addEventListener("mouseup", () => (drag = null));
}

function createWindow(title, contentHtml) {
  const template = document.getElementById("project-window-template");
  const win = template.content.firstElementChild.cloneNode(true);
  win.querySelector(".window-title").textContent = title;
  win.querySelector(".window-content").innerHTML = contentHtml;
  win.style.left = `${80 + Math.floor(Math.random() * 140)}px`;
  win.style.top = `${70 + Math.floor(Math.random() * 120)}px`;
  win.querySelector(".close-btn").addEventListener("click", () => {
    win.remove();
    renderTaskbar();
  });
  win.addEventListener("mousedown", () => bringToFront(win));
  makeDraggable(win);
  windowLayer.appendChild(win);
  bringToFront(win);
  renderTaskbar();
  return win;
}

function renderTaskbar() {
  taskItems.innerHTML = "";
  [...windowLayer.querySelectorAll(".xp-window")].forEach((win) => {
    const chip = document.createElement("button");
    chip.className = "task-chip";
    chip.textContent = win.querySelector(".window-title").textContent;
    chip.addEventListener("click", () => bringToFront(win));
    taskItems.appendChild(chip);
  });
}

function projectWindow(project) {
  createWindow(
    `${project.name}.txt`,
    `<div class="project-meta">
      <strong>Brand</strong><span>${project.brand}</span>
      <strong>Role</strong><span>${project.role}</span>
      <strong>Year</strong><span>${project.year}</span>
    </div>
    <p style="white-space: pre-line;">${project.description}</p>`
  );
}

async function loadProjects() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      state.projects = JSON.parse(local);
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const response = await fetch(DATA_URL);
  state.projects = await response.json();
}

function saveOverride() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
}

function renderIcons() {
  desktopIcons.innerHTML = "";
  state.projects.forEach((project) => {
    desktopIcons.appendChild(
      createIcon({
        label: project.name,
        img: ICON_DATA_URI,
        onDblClick: () => projectWindow(project),
      })
    );
  });

  desktopIcons.appendChild(
    createIcon({
      label: "Task Manager",
      img: ICON_DATA_URI,
      onDblClick: openTaskManager,
    })
  );
}

function openTaskManager() {
  const password = window.prompt("Task Manager password:");
  if (password !== "Bong") {
    alert("Access denied.");
    return;
  }

  const html = `
    <div class="cms-grid">
      <label>Choose project
        <select id="cms-select"></select>
      </label>
      <label>Name <input id="f-name" /></label>
      <label>Brand <input id="f-brand" /></label>
      <label>Role <input id="f-role" /></label>
      <label>Year <input id="f-year" /></label>
      <label>Description <textarea id="f-desc" rows="4"></textarea></label>
      <div class="cms-actions">
        <button id="new-btn">New</button>
        <button id="save-btn">Save</button>
        <button id="delete-btn">Delete</button>
        <button id="local-btn">Save Local Override</button>
      </div>
      <hr />
      <label>Owner <input id="gh-owner" placeholder="BongDraper" /></label>
      <label>Repo <input id="gh-repo" placeholder="potFOLIO" /></label>
      <label>Branch <input id="gh-branch" value="main" /></label>
      <label>Token <input id="gh-token" type="password" placeholder="ghp_..." /></label>
      <div class="cms-actions">
        <button id="pull-btn">Pull data/projects.json</button>
        <button id="push-btn">Push data/projects.json</button>
      </div>
      <p class="small" id="cms-msg">Ready.</p>
    </div>`;

  const win = createWindow("Task Manager", html);
  wireCms(win);
}

function wireCms(win) {
  const el = (id) => win.querySelector(`#${id}`);
  const select = el("cms-select");
  const msg = el("cms-msg");

  function refreshSelect() {
    select.innerHTML = "";
    state.projects.forEach((p, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `${p.name} (${p.year})`;
      select.appendChild(opt);
    });
    if (state.projects.length) {
      select.value = "0";
      loadIntoForm(0);
    }
  }

  function loadIntoForm(idx) {
    state.cmsSelection = idx;
    const p = state.projects[idx];
    if (!p) return;
    el("f-name").value = p.name;
    el("f-brand").value = p.brand;
    el("f-role").value = p.role;
    el("f-year").value = p.year;
    el("f-desc").value = p.description;
  }

  function readForm() {
    return {
      name: el("f-name").value.trim(),
      brand: el("f-brand").value.trim(),
      role: el("f-role").value.trim(),
      year: el("f-year").value.trim(),
      description: el("f-desc").value.trim(),
    };
  }

  select.addEventListener("change", () => loadIntoForm(Number(select.value)));

  el("new-btn").addEventListener("click", () => {
    state.projects.push({ name: "New Project", brand: "", role: "", year: "", description: "" });
    refreshSelect();
    select.value = String(state.projects.length - 1);
    loadIntoForm(state.projects.length - 1);
    renderIcons();
  });

  el("save-btn").addEventListener("click", () => {
    if (state.cmsSelection == null) return;
    state.projects[state.cmsSelection] = readForm();
    refreshSelect();
    select.value = String(state.cmsSelection);
    msg.textContent = "Project saved.";
    renderIcons();
  });

  el("delete-btn").addEventListener("click", () => {
    if (state.cmsSelection == null) return;
    state.projects.splice(state.cmsSelection, 1);
    refreshSelect();
    msg.textContent = "Project deleted.";
    renderIcons();
  });

  el("local-btn").addEventListener("click", () => {
    saveOverride();
    msg.textContent = "Local override saved in browser storage.";
  });

  el("pull-btn").addEventListener("click", async () => {
    const owner = el("gh-owner").value.trim();
    const repo = el("gh-repo").value.trim();
    const branch = el("gh-branch").value.trim() || "main";
    if (!owner || !repo) {
      msg.textContent = "Owner/repo required.";
      return;
    }
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/projects.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.projects = await res.json();
      saveOverride();
      refreshSelect();
      renderIcons();
      msg.textContent = "Pulled projects.json from GitHub.";
    } catch (err) {
      msg.textContent = `Pull failed: ${err.message}`;
    }
  });

  el("push-btn").addEventListener("click", async () => {
    const owner = el("gh-owner").value.trim();
    const repo = el("gh-repo").value.trim();
    const branch = el("gh-branch").value.trim() || "main";
    const token = el("gh-token").value.trim();
    if (!owner || !repo || !token) {
      msg.textContent = "Owner, repo, and token required.";
      return;
    }

    const api = `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    try {
      let sha;
      const existing = await fetch(`${api}?ref=${branch}`, { headers });
      if (existing.ok) {
        const j = await existing.json();
        sha = j.sha;
      }

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.projects, null, 2))));
      const res = await fetch(api, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "update projects.json from Task Manager CMS",
          content,
          branch,
          sha,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      msg.textContent = "Pushed data/projects.json to GitHub.";
    } catch (err) {
      msg.textContent = `Push failed: ${err.message}`;
    }
  });

  refreshSelect();
}

function startClock() {
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  tick();
  setInterval(tick, 1000 * 30);
}

async function init() {
  await loadProjects();
  renderIcons();
  startClock();
}

init();
