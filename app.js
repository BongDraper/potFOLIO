const DATA_URL = "data/projects.json";
const STORAGE_KEY = "potfolio.projects.override.v3";
const REQUIRED_FIELDS = ["name", "brand", "role", "year", "description"];
const OPTIONAL_FIELDS = ["videoUrl", "hyperlinks", "iconUrl", "type"];
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
  mediaPlayer:
    "data:image/svg+xml," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
      <defs>
        <radialGradient id='wmp-disc' cx='35%' cy='35%' r='70%'>
          <stop offset='0%' stop-color='#8fe4ff'/>
          <stop offset='60%' stop-color='#2398ea'/>
          <stop offset='100%' stop-color='#0d3fbc'/>
        </radialGradient>
        <linearGradient id='wmp-ring' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#ffd95c'/>
          <stop offset='100%' stop-color='#f2861b'/>
        </linearGradient>
      </defs>
      <circle cx='32' cy='32' r='25' fill='url(#wmp-disc)' stroke='#07328e' stroke-width='2'/>
      <circle cx='32' cy='32' r='18' fill='none' stroke='url(#wmp-ring)' stroke-width='8'/>
      <circle cx='32' cy='32' r='12' fill='#dff6ff' opacity='0.95'/>
      <polygon points='29,25 41,32 29,39' fill='#1a56be'/>
      <ellipse cx='24' cy='19' rx='8' ry='4' fill='#ffffff' opacity='0.2' transform='rotate(-25 24 19)'/>
    </svg>`),
};

const state = {
  projects: [],
  z: 20,
  cmsSelection: null,
  selectedIconId: null,
  taskManagerOpening: false,
  wallpaperUrl: "",
  mediaLibrary: [],
};

const DEFAULT_MEDIA_PLAYER = {
  name: "Windows Media Player",
  brand: "Windows XP",
  role: "Media Player",
  year: "2001",
  description: "Drop audio files from Task Manager and play them here.",
  videoUrl: "",
  hyperlinks: "",
  iconUrl: "",
  type: "media-player",
};

const WINDOW_KEYS = {
  taskManager: "task-manager",
};

const REPO_DEFAULTS = {
  owner: "bongdraper",
  repo: "potFOLIO",
  branch: "main",
};

let desktop;
let desktopIcons;
let selectionBox;
let windowLayer;
let taskItems;
let clock;
let startButton;

function cacheDomNodes() {
  desktop = document.getElementById("desktop");
  desktopIcons = document.getElementById("desktop-icons");
  selectionBox = document.getElementById("selection-box");
  windowLayer = document.getElementById("window-layer");
  taskItems = document.getElementById("task-items");
  clock = document.getElementById("clock");
  startButton = document.getElementById("start-button");

  if (!desktop || !desktopIcons || !selectionBox || !windowLayer || !taskItems || !clock || !startButton) {
    throw new Error("Desktop UI failed to initialize because required DOM nodes were not found.");
  }
}

const ABOUT_ME_TEXT = {
  name: "Maximiliano Gaudelli",
  title: "Writer + ACD",
  summary:
    "I found my calling as a writer through some truly cringey Tumblr blogs about music and culture. Since then I’ve led teams and campaigns from first concept to award wins. I care deeply about the work. The opposite of nonchalant.",
  experience: [
    { period: "Present", role: "Senior Copywriter", company: "The Community Miami" },
    { period: "2024 - 2025", role: "Associate Creative Director", company: "Dentsu Creative New York" },
    { period: "2022 - 2024", role: "Senior Copywriter", company: "Ogilvy Miami & Mexico" },
    { period: "2020 - 2022", role: "Associate Copywriter", company: "Ogilvy Tokyo" },
    { period: "2018 - 2020", role: "Associate Copywriter", company: "LaFusión Buenos Aires" },
    { period: "2014 - 2016", role: "Culture Intern", company: "VICE Media Mexico" },
  ],
  education: [
    "Miami Ad School 2017 - 2019 · Portfolio Program",
    "Miami Ad School 2021 · Digital Mkt. Bootcamp",
    "Miami Ad School 2022 - 2023 · AI for Brands Masters",
  ],
};

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

  if (safe.type !== "media-player") safe.type = "project";

  const roleKey = safe.role.toLowerCase();
  safe.role = ROLE_NORMALIZATION_MAP[roleKey] || safe.role;

  if (!safe.name) safe.name = "Untitled Project";
  if (!safe.year) safe.year = "Unknown";
  if (!safe.brand) safe.brand = "N/A";
  if (!safe.role) safe.role = "Associate Creative Director";
  if (!safe.description) safe.description = "No project description available.";
  return safe;
}

function parseHyperlinks(text = "") {
  if (!text) return [];
  return text
    .split(/\n|,/) 
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      try {
        const parsed = new URL(entry);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    });
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

function getUtf8ByteLength(text) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return unescape(encodeURIComponent(text)).length;
}

function formatByteCount(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function assertRepoSyncSize(serializedPayload, maxBytes = 900000) {
  const byteLength = getUtf8ByteLength(serializedPayload);
  if (byteLength <= maxBytes) return byteLength;

  throw new Error(
    `GitHub sync payload is ${formatByteCount(byteLength)}, which is too large for this contents API flow. ` +
      `Reduce the number of synced items or use smaller assets before pushing.`
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(`Failed to read file: ${file?.name || "unknown"}`));
    reader.readAsDataURL(file);
  });
}

function normalizeMediaLibrary(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((track) => ({
      name: typeof track?.name === "string" ? track.name.trim() : "",
      dataUrl: typeof track?.dataUrl === "string" ? track.dataUrl.trim() : "",
      type: typeof track?.type === "string" ? track.type.trim() : "audio/mpeg",
    }))
    .filter((track) => track.name && track.dataUrl);
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
  if (safe.type === "media-player") {
    openMediaPlayerWindow(projectId, safe);
    return;
  }
  const embedUrl = toEmbedUrl(safe.videoUrl);
  const links = parseHyperlinks(safe.hyperlinks);
  const media = embedUrl
    ? `<div class="project-media"><iframe src="${embedUrl}" title="${safe.name} video" loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`
    : "";

  const linkHtml = links.length
    ? `<div class="project-links"><strong>Links</strong><ul>${links
        .map((link) => `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></li>`)
        .join("")}</ul></div>`
    : "";

  createWindow(
    `${safe.name}.txt`,
    `<div class="project-meta">
      <strong>Brand</strong><span>${safe.brand}</span>
      <strong>Role</strong><span>${safe.role}</span>
      <strong>Year</strong><span>${safe.year}</span>
    </div>
    <p style="white-space: pre-line;">${safe.description}</p>${linkHtml}${media}`,
    { key: `project-${projectId}` }
  );
}

function openMediaPlayerWindow(projectId, project) {
  const tracks = state.mediaLibrary;
  const playlist = tracks.length
    ? `<ul class="media-playlist">${tracks
        .map(
          (track, idx) =>
            `<li><button type="button" class="media-track-btn" data-track-index="${idx}">${track.name}</button></li>`
        )
        .join("")}</ul>`
    : `<p class="small">No tracks loaded yet. Use Task Manager → Projects to add audio files.</p>`;

  const win = createWindow(
    `${project.name}.exe`,
    `<div class="wmp-shell">
      <div class="wmp-menu">File&nbsp;&nbsp;View&nbsp;&nbsp;Play&nbsp;&nbsp;Tools&nbsp;&nbsp;Help</div>
      <div class="wmp-screen"></div>
      <audio id="media-audio" controls preload="metadata"></audio>
      ${playlist}
    </div>`,
    { key: `project-${projectId}` }
  );

  const audio = win.querySelector("#media-audio");
  win.querySelectorAll(".media-track-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.trackIndex);
      if (Number.isNaN(index) || !tracks[index]) return;
      audio.src = tracks[index].url;
      audio.play().catch(() => {});
    });
  });

  if (tracks[0]) {
    audio.src = tracks[0].url;
  }
}

function ensureMediaPlayerProject() {
  const existing = state.projects.find((project) => sanitizeProject(project).type === "media-player");
  if (!existing) {
    state.projects.push(sanitizeProject(DEFAULT_MEDIA_PLAYER));
  }
}

function normalizeDataPayload(payload) {
  if (Array.isArray(payload)) {
    return { projects: sanitizeProjectList(payload), wallpaperUrl: "" };
  }
  return {
    projects: sanitizeProjectList(payload?.projects),
    wallpaperUrl: typeof payload?.wallpaperUrl === "string" ? payload.wallpaperUrl.trim() : "",
  };
}

function openMediaPlayerWindow(projectId, project) {
  const tracks = state.mediaLibrary;
  const playlist = tracks.length
    ? `<ul class="media-playlist">${tracks
        .map(
          (track, idx) =>
            `<li><button type="button" class="media-track-btn" data-track-index="${idx}">${track.name}</button></li>`
        )
        .join("")}</ul>`
    : `<p class="small">No tracks loaded yet. Use Task Manager → Projects to add audio files.</p>`;

  const win = createWindow(
    `${project.name}.exe`,
    `<div class="wmp-shell">
      <div class="wmp-menu">File&nbsp;&nbsp;View&nbsp;&nbsp;Play&nbsp;&nbsp;Tools&nbsp;&nbsp;Help</div>
      <div class="wmp-screen"></div>
      <audio id="media-audio" controls preload="metadata"></audio>
      ${playlist}
    </div>`,
    { key: `project-${projectId}` }
  );

  const audio = win.querySelector("#media-audio");
  win.querySelectorAll(".media-track-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.trackIndex);
      if (Number.isNaN(index) || !tracks[index]) return;
      audio.src = tracks[index].dataUrl;
      audio.play().catch(() => {});
    });
  });

  if (tracks[0]) {
    audio.src = tracks[0].dataUrl;
  }
}

function ensureMediaPlayerProject() {
  const existing = state.projects.find((project) => sanitizeProject(project).type === "media-player");
  if (!existing) {
    state.projects.push(sanitizeProject(DEFAULT_MEDIA_PLAYER));
  }
}

function normalizeDataPayload(payload) {
  if (Array.isArray(payload)) {
    return { projects: sanitizeProjectList(payload), wallpaperUrl: "", mediaLibrary: [] };
  }
  return {
    projects: sanitizeProjectList(payload?.projects),
    wallpaperUrl: typeof payload?.wallpaperUrl === "string" ? payload.wallpaperUrl.trim() : "",
    mediaLibrary: normalizeMediaLibrary(payload?.mediaLibrary),
  };
}

async function loadProjects() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      const normalized = normalizeDataPayload(JSON.parse(local));
      state.projects = normalized.projects;
      state.wallpaperUrl = normalized.wallpaperUrl;
      ensureMediaPlayerProject();
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const normalized = normalizeDataPayload(payload);
    state.projects = normalized.projects;
    state.wallpaperUrl = normalized.wallpaperUrl;
    ensureMediaPlayerProject();
  } catch (error) {
    console.error("Failed to load data/projects.json", error);
    state.projects = [];
  }
}

function saveOverride() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      wallpaperUrl: state.wallpaperUrl,
      projects: state.projects,
      mediaLibrary: state.mediaLibrary,
    })
  );
}

function applyWallpaper() {
  if (state.wallpaperUrl) {
    desktop.style.backgroundImage = `url("${state.wallpaperUrl}")`;
    desktop.style.backgroundColor = "#184da5";
  } else {
    desktop.style.backgroundImage = "";
    desktop.style.backgroundColor = "";
  }
}

function renderIcons() {
  desktopIcons.innerHTML = "";

  state.projects.forEach((project, index) => {
    const safe = sanitizeProject(project);
    desktopIcons.appendChild(
      createIcon({
        id: `project-${index}`,
        label: safe.name,
        img: safe.type === "media-player" ? ICONS.mediaPlayer : ICONS.project,
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
  return normalizeDataPayload(parsed);
}

async function pushToRepo(owner, repo, branch, token, payload) {
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/data/projects.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  let sha;
  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
  if (existing.ok) {
    const existingPayload = await existing.json();
    sha = existingPayload.sha;
  } else if (existing.status !== 404) {
    const text = await existing.text();
    throw new Error(`Could not read existing file (${existing.status}): ${text.slice(0, 160)}`);
  }

  const serialized = JSON.stringify(payload, null, 2);
  try {
    JSON.parse(serialized);
  } catch {
    throw new Error("JSON validation failed before push.");
  }
  assertRepoSyncSize(serialized);

  const requestBody = {
    message: "update projects.json from Task Manager CMS",
    content: encodeBase64Unicode(serialized),
    branch,
    sha,
  };

  let res = await fetch(api, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (res.status === 409) {
    const latest = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!latest.ok) {
      const text = await latest.text();
      throw new Error(`Push failed after conflict; could not refresh file (${latest.status}): ${text.slice(0, 160)}`);
    }

    const latestPayload = await latest.json();
    if (!latestPayload?.sha) {
      throw new Error("Push failed after conflict; latest file SHA missing.");
    }

    res = await fetch(api, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, sha: latestPayload.sha }),
    });
  }

  if (!res.ok) {
    const detail = (await res.text()).trim();
    if (res.status >= 500 && !detail) {
      throw new Error(
        "GitHub returned a server error while writing data/projects.json. This usually means the synced payload is still too large for the current contents API flow."
      );
    }
    throw new Error(`Push failed (${res.status}): ${(detail || "No response body.").slice(0, 180)}`);
  }

  const responsePayload = await res.json();
  return {
    commitSha: responsePayload?.commit?.sha || "",
    commitUrl: responsePayload?.commit?.html_url || "",
  };
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
    <div class="cms-grid task-manager-grid">
      <section class="cms-card">
        <h3>Projects</h3>
        <label>Choose project
          <select id="cms-select"></select>
        </label>
        <label>Name <input id="f-name" /></label>
        <label>Brand <input id="f-brand" /></label>
        <label>Role <input id="f-role" /></label>
        <label>Year <input id="f-year" /></label>
        <label>Description <textarea id="f-desc" rows="4"></textarea></label>
        <label>Video URL (YouTube/Vimeo) <input id="f-video" placeholder="https://..." /></label>
        <label>Hyperlinks (one URL per line or comma-separated) <textarea id="f-links" rows="3" placeholder="https://..."></textarea></label>
        <div class="cms-actions">
          <button id="new-btn">Add Project</button>
          <button id="new-wmp-btn">Add Windows Media Player</button>
          <button id="save-btn">Save Edit</button>
          <button id="delete-btn">Delete</button>
          <button id="local-btn">Save Local</button>
          <button id="self-check-btn">Self-Check</button>
        </div>
      </section>

      <section class="cms-card">
        <h3>Project Assets (push with projects)</h3>
        <label>Wallpaper image file <input id="wallpaper-file" type="file" accept="image/*" /></label>
        <div class="cms-actions">
          <button id="wallpaper-apply-btn">Apply Wallpaper File</button>
          <button id="wallpaper-clear-btn">Use Default Wallpaper</button>
        </div>
        <label>Windows Media files <input id="f-audio" type="file" accept="audio/*" multiple /></label>
        <button id="audio-add-btn" type="button">Load Audio Files</button>
        <p class="small">Wallpaper + media are stored and pushed together with projects.</p>
      </section>

      <section class="cms-card">
        <h3>Git Sync</h3>
        <label>Git key <input id="gh-token" type="password" placeholder="ghp_..." /></label>
        <p class="small">Using bongdraper/potFOLIO on main.</p>
        <div class="cms-actions">
          <button id="pull-btn">Pull From Repo</button>
          <button id="push-btn">Push To Repo</button>
        </div>
      </section>

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
      ["f-name", "f-brand", "f-role", "f-year", "f-desc", "f-video", "f-links"].forEach((id) => {
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
    el("f-links").value = project.hyperlinks;
  }

  function readForm() {
    const selected = sanitizeProject(state.projects[state.cmsSelection] || {});
    return sanitizeProject({
      name: el("f-name").value,
      brand: el("f-brand").value,
      role: el("f-role").value,
      year: el("f-year").value,
      description: el("f-desc").value,
      videoUrl: el("f-video").value,
      hyperlinks: el("f-links").value,
      iconUrl: "",
      type: selected.type,
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
        hyperlinks: "",
        iconUrl: "",
        type: "project",
      })
    );
    refreshSelect(state.projects.length - 1);
    renderIcons();
    saveOverride();
    setCmsMessage(msg, "Project added and saved locally.", "ok");
  });

  el("new-wmp-btn").addEventListener("click", () => {
    const existing = state.projects.findIndex((project) => sanitizeProject(project).type === "media-player");
    if (existing !== -1) {
      refreshSelect(existing);
      setCmsMessage(msg, "Windows Media Player already exists.", "error");
      return;
    }
    state.projects.push(sanitizeProject(DEFAULT_MEDIA_PLAYER));
    refreshSelect(state.projects.length - 1);
    renderIcons();
    saveOverride();
    setCmsMessage(msg, "Windows Media Player added.", "ok");
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
    saveOverride();
    setCmsMessage(msg, "Project saved locally.", "ok");
  });

  el("delete-btn").addEventListener("click", () => {
    if (state.cmsSelection == null) {
      setCmsMessage(msg, "No project selected.", "error");
      return;
    }
    const selected = sanitizeProject(state.projects[state.cmsSelection]);
    if (selected.type === "media-player") {
      setCmsMessage(msg, "Windows Media Player cannot be deleted.", "error");
      return;
    }
    state.projects.splice(state.cmsSelection, 1);
    refreshSelect(state.cmsSelection - 1);
    renderIcons();
    saveOverride();
    setCmsMessage(msg, "Project deleted and saved locally.", "ok");
  });

  el("audio-add-btn").addEventListener("click", async () => {
    const files = [...el("f-audio").files];
    if (!files.length) {
      setCmsMessage(msg, "Choose at least one audio file first.", "error");
      return;
    }
    setCmsMessage(msg, "Reading audio files...", "");
    try {
      const tracks = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
          type: file.type || "audio/mpeg",
        }))
      );
      state.mediaLibrary = tracks;
      saveOverride();
      setCmsMessage(msg, `Loaded ${files.length} audio file(s). They will sync on Push To Repo.`, "ok");
    } catch (error) {
      setCmsMessage(msg, `Audio load failed: ${error.message}`, "error");
    }
  });

  el("wallpaper-apply-btn").addEventListener("click", async () => {
    const file = el("wallpaper-file").files?.[0];
    if (!file) {
      setCmsMessage(msg, "Choose a wallpaper image file first.", "error");
      return;
    }
    setCmsMessage(msg, "Reading wallpaper file...", "");
    try {
      state.wallpaperUrl = await readFileAsDataUrl(file);
      applyWallpaper();
      saveOverride();
      setCmsMessage(msg, "Wallpaper updated from local file.", "ok");
    } catch (error) {
      setCmsMessage(msg, `Wallpaper load failed: ${error.message}`, "error");
    }
  });

  el("wallpaper-clear-btn").addEventListener("click", () => {
    state.wallpaperUrl = "";
    el("wallpaper-file").value = "";
    applyWallpaper();
    saveOverride();
    setCmsMessage(msg, "Restored default wallpaper.", "ok");
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
    const { owner, repo, branch } = REPO_DEFAULTS;
    setCmsMessage(msg, "Pulling from GitHub...", "");
    try {
      const pulled = await pullFromRepo(owner, repo, branch);
      const validation = validateProjects(pulled.projects);
      if (!validation.ok) throw new Error(`Pulled data failed validation: ${validation.message}`);
      state.projects = pulled.projects;
      state.wallpaperUrl = pulled.wallpaperUrl;
      state.mediaLibrary = pulled.mediaLibrary;
      ensureMediaPlayerProject();
      saveOverride();
      refreshSelect();
      renderIcons();
      applyWallpaper();
      setCmsMessage(msg, `Pulled data/projects.json from repo. ${validation.message}`, "ok");
    } catch (error) {
      setCmsMessage(msg, `Pull failed: ${error.message}`, "error");
    }
  });

  el("push-btn").addEventListener("click", async () => {
    const { owner, repo, branch } = REPO_DEFAULTS;
    const token = el("gh-token").value.trim();
    if (!token) {
      setCmsMessage(msg, "Git key is required.", "error");
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
      state.projects = normalized;
      saveOverride();
      const pushed = await pushToRepo(owner, repo, branch, token, {
        wallpaperUrl: state.wallpaperUrl,
        projects: normalized,
        mediaLibrary: state.mediaLibrary,
      });
      const pulled = await pullFromRepo(owner, repo, branch);
      state.projects = pulled.projects;
      state.wallpaperUrl = pulled.wallpaperUrl;
      state.mediaLibrary = pulled.mediaLibrary;
      ensureMediaPlayerProject();
      saveOverride();
      refreshSelect(state.cmsSelection ?? 0);
      renderIcons();
      applyWallpaper();

      const commitNote = pushed.commitUrl
        ? ` Commit: ${pushed.commitUrl}`
        : pushed.commitSha
          ? ` Commit SHA: ${pushed.commitSha.slice(0, 7)}`
          : "";
      setCmsMessage(msg, `Pushed and reloaded from GitHub (${branch}). ${validation.message}.${commitNote}`, "ok");
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

function createAboutStartMenu() {
  const menu = document.createElement("section");
  menu.id = "start-menu";
  menu.setAttribute("aria-label", "About me menu");
  menu.innerHTML = `
    <div class="start-menu-header">
      <small>About me</small>
      <strong>${ABOUT_ME_TEXT.name}</strong>
      <span>${ABOUT_ME_TEXT.title}</span>
    </div>
    <div class="start-menu-body">
      <p class="about-summary">${ABOUT_ME_TEXT.summary}</p>
      <div class="about-columns">
        <section>
          <h3>Experience</h3>
          <ul class="experience-list">
            ${ABOUT_ME_TEXT.experience
              .map(
                (item) =>
                  `<li><span>${item.period}</span><div><strong>${item.role}</strong><em>${item.company}</em></div></li>`
              )
              .join("")}
          </ul>
        </section>
        <section>
          <h3>Education</h3>
          <ul class="education-list">
            ${ABOUT_ME_TEXT.education.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>
      </div>
    </div>`;
  document.body.appendChild(menu);
  return menu;
}

function wireStartMenu() {
  const startMenu = createAboutStartMenu();

  const closeMenu = () => {
    startMenu.classList.remove("open");
    startButton.setAttribute("aria-expanded", "false");
  };

  startButton.setAttribute("aria-expanded", "false");

  startButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !startMenu.classList.contains("open");
    startMenu.classList.toggle("open", willOpen);
    startButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#start-menu") || event.target.closest("#start-button")) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
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
  cacheDomNodes();
  await loadProjects();
  applyWallpaper();
  renderIcons();
  renderTaskbar();
  startClock();
  wireStartMenu();
  wireDesktopSelectionRectangle();
}

function bootApp() {
  init().catch((error) => {
    console.error("Desktop initialization failed", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp, { once: true });
} else {
  bootApp();
}
