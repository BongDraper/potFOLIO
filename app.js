const DATA_URL = "data/projects.json";
const STORAGE_KEY = "potfolio.projects.override.v2";
const REQUIRED_FIELDS = ["name", "brand", "role", "year", "description"];
const OPTIONAL_FIELDS = ["videoUrl"];
const ROLE_NORMALIZATION_MAP = {
  creative: "Associate Creative Director",
  "campaign creative": "Campaign Creative",
  "associate creative director": "Associate Creative Director",
  "creative director": "Creative Director",
  "art director": "Art Director",
  copywriter: "Copywriter",
};

const ICONS = {
  project:
    "data:image/svg+xml," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
      <defs>
        <linearGradient id='folder' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stop-color='#ffd979'/>
          <stop offset='100%' stop-color='#e6a84a'/>
        </linearGradient>
      </defs>
      <path d='M5 16h21l5 6h28v28c0 3-2 5-5 5H10c-3 0-5-2-5-5V16z' fill='url(#folder)' stroke='#9a6a24' stroke-width='2'/>
      <rect x='6' y='22' width='52' height='31' rx='4' fill='#f3be5a' stroke='#9a6a24' stroke-width='2'/>
      <rect x='12' y='30' width='24' height='4' rx='2' fill='#fff2bf' opacity='0.75'/>
    </svg>`),
  taskManager:
    "data:image/svg+xml," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
      <rect x='8' y='8' width='48' height='48' rx='5' fill='#f3f3f3' stroke='#9da3ad' stroke-width='2'/>
      <rect x='12' y='14' width='40' height='8' rx='2' fill='#3f8cff'/>
      <rect x='14' y='28' width='6' height='20' fill='#58b957'/>
      <rect x='24' y='34' width='6' height='14' fill='#ffd347'/>
      <rect x='34' y='24' width='6' height='24' fill='#ff7f50'/>
      <rect x='44' y='30' width='6' height='18' fill='#4f95ff'/>
    </svg>`),
};

const state = {
  projects: [],
  z: 20,
  cmsSelection: null,
  selectedIconId: null,
  taskManagerOpening: false,
};

const WINDOW_KEYS = {
  taskManager: "task-manager",
};

const desktop = document.getElementById("desktop");
const desktopIcons = document.getElementById("desktop-icons");
const selectionBox = document.getElementById("selection-box");
const windowLayer = document.getElementById("window-layer");
const taskItems = document.getElementById("task-items");
const clock = document.getElementById("clock");

function sanitizeProject(raw = {}) {
  const safe = {};
  for (const key of REQUIRED_FIELDS) {
    const value = raw?.[key];
    safe[key] = typeof value === "string" ? value.trim() : "";
  }

  for (const key of OPTIONAL_FIELDS) {
    const value = raw?.[key];
    safe[key] = typeof value === "string" ? value.trim() : "";
  }

  const roleKey = safe.role.toLowerCase();
  safe.role = ROLE_NORMALIZATION_MAP[roleKey] || safe.role;

  if (!safe.name) safe.name = "Untitled Project";
  if (!safe.year) safe.year = "Unknown";
  if (!safe.brand) safe.brand = "N/A";
  if (!safe.role) safe.role = "Associate Creative Director";
  if (!safe.description) safe.description = "No project description available.";
  return safe;
}

function sanitizeProjectList(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((entry) => sanitizeProject(entry));
}

function toEmbedUrl(videoUrl) {
  if (!videoUrl) return "";

  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtube.com" || host === "m.youtube.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const id = parsed.searchParams.get("v") || segments[segments.length - 1];
      if (!id) return "";
      return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }

    if (host === "youtu.be") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const id = segments[segments.length - 1];
      if (!id) return "";
      return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((segment) => /^\d+$/.test(segment));
      if (!id) return "";
      return `https://player.vimeo.com/video/${id}`;
    }

    if (host === "player.vimeo.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (!id || !/^\d+$/.test(id)) return "";
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return "";
  }

  return "";
}

function hasValidVideo(project) {
  if (!project.videoUrl) return true;
  return Boolean(toEmbedUrl(project.videoUrl));
}

function encodeBase64Unicode(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeBase64Unicode(text) {
  return decodeURIComponent(escape(atob(text)));
}

function setCmsMessage(node, message, kind = "") {
  node.classList.remove("ok", "error");
  if (kind) node.classList.add(kind);
  node.textContent = message;
}

function createIcon({ id, label, img, onOpen }) {
  const btn = document.createElement("button");
  btn.className = "desktop-icon";
  btn.type = "button";
  btn.dataset.id = id;
  btn.innerHTML = `<img src="${img}" alt="" /><span>${label}</span>`;

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    selectDesktopIcon(id);
  });

  btn.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    onOpen();
  });

  btn.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen();
    }
  });

  return btn;
}

function selectDesktopIcon(id) {
  state.selectedIconId = id;
  for (const icon of desktopIcons.querySelectorAll(".desktop-icon")) {
    icon.classList.toggle("selected", icon.dataset.id === id);
  }
}

function deselectDesktopIcons() {
  state.selectedIconId = null;
  for (const icon of desktopIcons.querySelectorAll(".desktop-icon")) {
    icon.classList.remove("selected");
  }
}

function bringToFront(win) {
  state.z += 1;
  for (const node of windowLayer.querySelectorAll(".xp-window")) {
    node.classList.remove("active");
  }
  win.classList.add("active");
  win.style.zIndex = String(state.z);
}

function clampWindowToViewport(left, top, width, height) {
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - 80 - height);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}

function makeDraggable(win) {
  const handle = win.querySelector(".drag-handle");
  let drag = null;

  const onMove = (event) => {
    if (!drag) return;
    const bounds = clampWindowToViewport(
      event.clientX - drag.offsetX,
      event.clientY - drag.offsetY,
      drag.width,
      drag.height
    );
    win.style.left = `${bounds.left}px`;
    win.style.top = `${bounds.top}px`;
  };

  const onUp = () => {
    drag = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  handle.addEventListener("mousedown", (event) => {
    if (event.target.closest(".window-controls")) return;
    bringToFront(win);
    const rect = win.getBoundingClientRect();
    drag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function renderTaskbar() {
  taskItems.innerHTML = "";
  [...windowLayer.querySelectorAll(".xp-window")].forEach((win) => {
    const chip = document.createElement("button");
    chip.className = "task-chip";
    chip.type = "button";
    chip.textContent = win.querySelector(".window-title").textContent;
    chip.addEventListener("click", () => bringToFront(win));
    taskItems.appendChild(chip);
  });
}

function createWindow(title, contentHtml, options = {}) {
  const template = document.getElementById("project-window-template");
  const { key = null, onClose = null } = options;

  if (key) {
    const existing = windowLayer.querySelector(`.xp-window[data-window-key="${key}"]`);
    if (existing) {
      bringToFront(existing);
      return existing;
    }
  }

  const win = template.content.firstElementChild.cloneNode(true);
  win.querySelector(".window-title").textContent = title;
  if (key) win.dataset.windowKey = key;
  win.querySelector(".window-content").innerHTML = contentHtml;

  const defaultRect = clampWindowToViewport(
    80 + Math.floor(Math.random() * 120),
    54 + Math.floor(Math.random() * 90),
    Math.min(560, window.innerWidth - 10),
    320
  );
  win.style.left = `${defaultRect.left}px`;
  win.style.top = `${defaultRect.top}px`;

  const closeWindow = () => {
    win.remove();
    if (typeof onClose === "function") onClose();
    renderTaskbar();
  };

  win.querySelector(".close-btn").addEventListener("click", closeWindow);
  win.addEventListener("mousedown", () => bringToFront(win));

  makeDraggable(win);
  windowLayer.appendChild(win);
  bringToFront(win);
  renderTaskbar();
  return win;
}

function projectWindow(project, projectId) {
  const safe = sanitizeProject(project);
  const embedUrl = toEmbedUrl(safe.videoUrl);
  const media = embedUrl
    ? `<div class="project-media"><iframe src="${embedUrl}" title="${safe.name} video" loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`
    : "";

  createWindow(
    `${safe.name}.txt`,
    `<div class="project-meta">
      <strong>Brand</strong><span>${safe.brand}</span>
      <strong>Role</strong><span>${safe.role}</span>
      <strong>Year</strong><span>${safe.year}</span>
    </div>
    <p style="white-space: pre-line;">${safe.description}</p>${media}`,
    { key: `project-${projectId}` }
  );
}

async function loadProjects() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      state.projects = sanitizeProjectList(JSON.parse(local));
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.projects = sanitizeProjectList(payload);
  } catch (error) {
    console.error("Failed to load data/projects.json", error);
    state.projects = [];
  }
}

function saveOverride() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
}

function renderIcons() {
  desktopIcons.innerHTML = "";

  state.projects.forEach((project, index) => {
    const safe = sanitizeProject(project);
    desktopIcons.appendChild(
      createIcon({
        id: `project-${index}`,
        label: safe.name,
        img: ICONS.project,
        onOpen: () => projectWindow(safe, index),
      })
    );
  });

  desktopIcons.appendChild(
    createIcon({
      id: "task-manager",
      label: "Task Manager",
      img: ICONS.taskManager,
      onOpen: openTaskManager,
    })
  );
  deselectDesktopIcons();
}

function validProjectForSave(project) {
  return (
    REQUIRED_FIELDS.every((key) => typeof project[key] === "string" && project[key].trim().length > 0) &&
    hasValidVideo(project)
  );
}

function validateProjects(projects) {
  if (!Array.isArray(projects)) {
    return { ok: false, message: "Projects payload is not an array." };
  }

  const normalized = sanitizeProjectList(projects);
  const invalidIndex = normalized.findIndex((project) => !validProjectForSave(project));
  if (invalidIndex !== -1) {
    return {
      ok: false,
      message: `Project ${invalidIndex + 1} has missing required fields or an invalid video URL (YouTube/Vimeo).`,
    };
  }

  const nameSet = new Set();
  for (const project of normalized) {
    const key = project.name.toLowerCase();
    if (nameSet.has(key)) {
      return { ok: false, message: `Duplicate project name found: ${project.name}` };
    }
    nameSet.add(key);
  }

  return { ok: true, message: `Self-check passed (${normalized.length} projects valid).` };
}

async function pullFromRepo(owner, repo, branch) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(api, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail.slice(0, 160)}`);
  }
  const payload = await res.json();
  if (!payload?.content) throw new Error("Response missing file content.");
  const decoded = decodeBase64Unicode(payload.content.replace(/\n/g, ""));
  const parsed = JSON.parse(decoded);
  return sanitizeProjectList(parsed);
}

async function pushToRepo(owner, repo, branch, token, projects) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  let sha;
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
  if (existing.ok) {
    const payload = await existing.json();
    sha = payload.sha;
  } else if (existing.status !== 404) {
    const text = await existing.text();
    throw new Error(`Could not read existing file (${existing.status}): ${text.slice(0, 160)}`);
  }

  const serialized = JSON.stringify(projects, null, 2);
  try {
    JSON.parse(serialized);
  } catch {
    throw new Error("JSON validation failed before push.");
  }

  const res = await fetch(api, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "update projects.json from Task Manager CMS",
      content: encodeBase64Unicode(serialized),
      branch,
      sha,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Push failed (${res.status}): ${detail.slice(0, 180)}`);
  }
}

function requestTaskManagerAccess() {
  return new Promise((resolve) => {
    const html = `
      <div class="cms-grid">
        <p class="small">Enter Task Manager password to continue.</p>
        <label>Password <input id="task-auth-input" type="password" autocomplete="off" /></label>
        <div class="cms-actions">
          <button id="task-auth-submit">Unlock</button>
          <button id="task-auth-cancel">Cancel</button>
        </div>
        <p class="small" id="task-auth-msg">Password required.</p>
      </div>`;
    const done = (allowed) => {
      if (!win.isConnected) {
        resolve(allowed);
        return;
      }
      win.remove();
      renderTaskbar();
      resolve(allowed);
    };

    const win = createWindow("Task Manager Login", html, {
      key: "task-manager-login",
      onClose: () => resolve(false),
    });
    const input = win.querySelector("#task-auth-input");
    const msg = win.querySelector("#task-auth-msg");
    const submit = win.querySelector("#task-auth-submit");
    const cancel = win.querySelector("#task-auth-cancel");

    submit.addEventListener("click", () => {
      if (input.value === "Bong") {
        done(true);
        return;
      }
      setCmsMessage(msg, "Access denied.", "error");
      input.focus();
      input.select();
    });

    cancel.addEventListener("click", () => done(false));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit.click();
    });
    input.focus();
  });
}

async function openTaskManager() {
  if (state.taskManagerOpening) return;
  state.taskManagerOpening = true;

  try {
    const existing = windowLayer.querySelector(`.xp-window[data-window-key="${WINDOW_KEYS.taskManager}"]`);
    if (existing) {
      bringToFront(existing);
      return;
    }

    const allowed = await requestTaskManagerAccess();
    if (!allowed) return;

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
      <label>Video URL (YouTube/Vimeo) <input id="f-video" placeholder="https://..." /></label>
      <div class="cms-actions">
        <button id="new-btn">Add Project</button>
        <button id="save-btn">Save Edit</button>
        <button id="delete-btn">Delete</button>
        <button id="local-btn">Save Local</button>
        <button id="self-check-btn">Self-Check</button>
      </div>
      <hr />
      <label>GitHub Owner <input id="gh-owner" placeholder="bongdraper" /></label>
      <label>GitHub Repo <input id="gh-repo" placeholder="potFOLIO" /></label>
      <label>Branch <input id="gh-branch" value="main" /></label>
      <label>Token <input id="gh-token" type="password" placeholder="ghp_..." /></label>
      <div class="cms-actions">
        <button id="pull-btn">Pull From Repo</button>
        <button id="push-btn">Push To Repo</button>
      </div>
      <p class="small" id="cms-msg">Ready.</p>
    </div>`;

    const win = createWindow("Task Manager", html, {
      key: WINDOW_KEYS.taskManager,
      onClose: () => {
        state.taskManagerOpening = false;
      },
    });
    wireCms(win);
  } finally {
    state.taskManagerOpening = false;
  }
}

function wireCms(win) {
  const el = (id) => win.querySelector(`#${id}`);
  const select = el("cms-select");
  const msg = el("cms-msg");

  function refreshSelect(nextSelection = 0) {
    select.innerHTML = "";
    state.projects.forEach((project, idx) => {
      const safe = sanitizeProject(project);
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `${safe.name} (${safe.year})`;
      select.appendChild(opt);
    });

    if (!state.projects.length) {
      state.cmsSelection = null;
      ["f-name", "f-brand", "f-role", "f-year", "f-desc", "f-video"].forEach((id) => {
        el(id).value = "";
      });
      return;
    }

    const bounded = Math.min(Math.max(0, nextSelection), state.projects.length - 1);
    select.value = String(bounded);
    loadIntoForm(bounded);
  }

  function loadIntoForm(idx) {
    state.cmsSelection = idx;
    const project = sanitizeProject(state.projects[idx]);
    el("f-name").value = project.name;
    el("f-brand").value = project.brand;
    el("f-role").value = project.role;
    el("f-year").value = project.year;
    el("f-desc").value = project.description;
    el("f-video").value = project.videoUrl;
  }

  function readForm() {
    return sanitizeProject({
      name: el("f-name").value,
      brand: el("f-brand").value,
      role: el("f-role").value,
      year: el("f-year").value,
      description: el("f-desc").value,
      videoUrl: el("f-video").value,
    });
  }

  select.addEventListener("change", () => loadIntoForm(Number(select.value)));

  el("new-btn").addEventListener("click", () => {
    state.projects.push(
      sanitizeProject({
        name: "New Project",
        brand: "N/A",
        role: "Associate Creative Director",
        year: String(new Date().getFullYear()),
        description: "Describe this project.",
        videoUrl: "",
      })
    );
    refreshSelect(state.projects.length - 1);
    renderIcons();
    setCmsMessage(msg, "Project added.", "ok");
  });

  el("save-btn").addEventListener("click", () => {
    if (state.cmsSelection == null) {
      setCmsMessage(msg, "No project selected.", "error");
      return;
    }
    const project = readForm();
    if (!validProjectForSave(project)) {
      setCmsMessage(msg, "All schema fields are required and video URL must be YouTube/Vimeo.", "error");
      return;
    }
    state.projects[state.cmsSelection] = project;
    refreshSelect(state.cmsSelection);
    renderIcons();
    setCmsMessage(msg, "Project saved.", "ok");
  });

  el("delete-btn").addEventListener("click", () => {
    if (state.cmsSelection == null) {
      setCmsMessage(msg, "No project selected.", "error");
      return;
    }
    state.projects.splice(state.cmsSelection, 1);
    refreshSelect(state.cmsSelection - 1);
    renderIcons();
    setCmsMessage(msg, "Project deleted.", "ok");
  });

  el("local-btn").addEventListener("click", () => {
    const normalized = sanitizeProjectList(state.projects);
    const validation = validateProjects(normalized);
    if (!validation.ok) {
      setCmsMessage(msg, `Save failed: ${validation.message}`, "error");
      return;
    }
    state.projects = normalized;
    saveOverride();
    setCmsMessage(msg, "Saved to localStorage (validated).", "ok");
  });

  el("self-check-btn").addEventListener("click", () => {
    const validation = validateProjects(state.projects);
    setCmsMessage(msg, validation.message, validation.ok ? "ok" : "error");
  });

  el("pull-btn").addEventListener("click", async () => {
    const owner = el("gh-owner").value.trim();
    const repo = el("gh-repo").value.trim();
    const branch = el("gh-branch").value.trim() || "main";
    if (!owner || !repo) {
      setCmsMessage(msg, "Owner and repo are required.", "error");
      return;
    }
    setCmsMessage(msg, "Pulling from GitHub...", "");
    try {
      const pulled = await pullFromRepo(owner, repo, branch);
      const validation = validateProjects(pulled);
      if (!validation.ok) throw new Error(`Pulled data failed validation: ${validation.message}`);
      state.projects = pulled;
      saveOverride();
      refreshSelect();
      renderIcons();
      setCmsMessage(msg, `Pulled data/projects.json from repo. ${validation.message}`, "ok");
    } catch (error) {
      setCmsMessage(msg, `Pull failed: ${error.message}`, "error");
    }
  });

  el("push-btn").addEventListener("click", async () => {
    const owner = el("gh-owner").value.trim();
    const repo = el("gh-repo").value.trim();
    const branch = el("gh-branch").value.trim() || "main";
    const token = el("gh-token").value.trim();
    if (!owner || !repo || !token) {
      setCmsMessage(msg, "Owner, repo, and token are required.", "error");
      return;
    }
    const normalized = sanitizeProjectList(state.projects);
    const validation = validateProjects(normalized);
    if (!validation.ok) {
      setCmsMessage(msg, `Schema validation failed: ${validation.message}`, "error");
      return;
    }

    setCmsMessage(msg, "Pushing to GitHub...", "");
    try {
      await pushToRepo(owner, repo, branch, token, normalized);
      setCmsMessage(msg, `Pushed data/projects.json to repo. ${validation.message}`, "ok");
    } catch (error) {
      if (/401|403/.test(error.message)) {
        setCmsMessage(msg, "Push failed: token missing repo write permission.", "error");
        return;
      }
      if (/404/.test(error.message)) {
        setCmsMessage(msg, "Push failed: owner/repo/branch not found.", "error");
        return;
      }
      setCmsMessage(msg, `Push failed: ${error.message}`, "error");
    }
  });

  refreshSelect();
}

function wireDesktopSelectionRectangle() {
  let dragStart = null;

  desktop.addEventListener("mousedown", (event) => {
    if (event.target.closest(".desktop-icon") || event.target.closest(".xp-window")) return;
    deselectDesktopIcons();
    dragStart = { x: event.clientX, y: event.clientY };
    selectionBox.style.display = "block";
    selectionBox.style.left = `${dragStart.x}px`;
    selectionBox.style.top = `${dragStart.y}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
  });

  desktop.addEventListener("mousemove", (event) => {
    if (!dragStart) return;
    const left = Math.min(dragStart.x, event.clientX);
    const top = Math.min(dragStart.y, event.clientY);
    const width = Math.abs(event.clientX - dragStart.x);
    const height = Math.abs(event.clientY - dragStart.y);
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  });

  desktop.addEventListener("mouseup", () => {
    dragStart = null;
    selectionBox.style.display = "none";
  });
}

function startClock() {
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  tick();
  setInterval(tick, 30000);
}

async function init() {
  await loadProjects();
  renderIcons();
  renderTaskbar();
  startClock();
  wireDesktopSelectionRectangle();
}

init();
