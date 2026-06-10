<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portalgrupper — IT Support</title>
  <link rel="stylesheet" href="/assets/navbar.css" />
  <meta name="herrup-app" content="it-support">
  <meta name="herrup-title" content="IT Support">
  <meta name="herrup-subtitle" content="Portalgrupper">
  <script src="/assets/navbar.js" defer></script>
  <script src="/assets/auth.js" defer></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f3f4f6; color: #111827; }
    .container { max-width: 1400px; margin: 0 auto; padding: 32px 20px; }
    .cat-tiles { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
    .cat-tile { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: #fff; border: 2px solid #e5e7eb; border-radius: 14px; cursor: pointer; transition: all .15s; user-select: none; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
    .cat-tile:hover { border-color: #850c18; background: #fef3f2; }
    .cat-tile.active { border-color: #850c18; background: #850c18; color: #fff; box-shadow: 0 4px 12px rgba(133,12,24,.25); }
    .cat-tile-icon { font-size: 1.4rem; }
    .cat-tile-label { font-size: .95rem; font-weight: 700; }
    .cat-tile-count { font-size: .8rem; opacity: .7; margin-left: 4px; }
    .tile { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.05); margin-bottom: 16px; overflow: hidden; }
    .tile-header { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #f3f4f6; cursor: pointer; user-select: none; }
    .tile-icon { font-size: 1.2rem; }
    .tile-title { font-size: 1rem; font-weight: 700; color: #111827; flex: 1; }
    .tile-chevron { color: #9ca3af; font-size: .9rem; transition: transform .2s; }
    .tile-chevron.open { transform: rotate(180deg); }
    .tile-body { padding: 20px 24px; }
    .group-list { display: flex; flex-direction: column; gap: 6px; }
    .group-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: background .15s; }
    .group-item:hover { background: #f9fafb; }
    .group-item.active { background: #fef3f2; border-color: #fca5a5; }
    .group-name { font-weight: 600; font-size: .9rem; color: #111827; }
    .group-email { font-size: .78rem; color: #6b7280; }
    .member-count { margin-left: auto; background: #f3f4f6; border-radius: 999px; padding: 2px 10px; font-size: .78rem; color: #374151; font-weight: 600; white-space: nowrap; }
    .editor { display: none; }
    .editor.visible { display: grid; grid-template-columns: 260px 1fr auto 1fr; gap: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .col { display: flex; flex-direction: column; min-width: 0; }
    .col-header { padding: 11px 16px; background: #1f2937; color: #fff; font-size: .83rem; font-weight: 700; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
    .col-header.light { background: #f8fafc; color: #374151; border-bottom: 1px solid #e5e7eb; }
    .col-body { flex: 1; overflow-y: auto; max-height: 380px; }
    .stamdata { border-right: 1px solid #e5e7eb; }
    .stamdata .col-body { padding: 14px 16px; }
    .sd-row { margin-bottom: 12px; }
    .sd-label { font-size: .72rem; color: #6b7280; margin-bottom: 2px; text-transform: uppercase; letter-spacing: .03em; }
    .sd-value { font-size: .87rem; color: #111827; font-weight: 500; word-break: break-word; }
    .member-list { border-right: 1px solid #e5e7eb; }
    .user-item { display: flex; align-items: center; gap: 10px; padding: 7px 12px; cursor: pointer; border-bottom: 1px solid #f9fafb; transition: background .1s; }
    .user-item:hover { background: #f9fafb; }
    .user-item.selected { background: #eff6ff; }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #850c18; color: #fff; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 700; flex-shrink: 0; }
    .user-info { flex: 1; min-width: 0; }
    .user-name { font-size: .83rem; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { font-size: .72rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-check { width: 15px; height: 15px; border-radius: 3px; border: 2px solid #d1d5db; flex-shrink: 0; }
    .user-item.selected .user-check { background: #850c18; border-color: #850c18; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 10 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4l3 3 5-6' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; }
    .btn-col { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 16px 10px; background: #f8fafc; border-right: 1px solid #e5e7eb; min-width: 50px; }
    .arrow-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; font-size: .95rem; display: flex; align-items: center; justify-content: center; transition: background .15s; }
    .arrow-btn:hover { background: #850c18; color: #fff; border-color: #850c18; }
    .col-search { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
    .col-search input { width: 100%; padding: 5px 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: .82rem; outline: none; }
    .col-search input:focus { border-color: #850c18; }
    .filter-checks { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 2px; }
    .filter-check { display: flex; align-items: center; gap: 5px; font-size: .78rem; color: #374151; cursor: pointer; user-select: none; }
    .filter-check input[type=checkbox] { accent-color: #850c18; width: 13px; height: 13px; cursor: pointer; }
    .btn-refresh { padding: 4px 10px; background: #fff; border: 1px solid #d1d5db; border-radius: 6px; font-size: .75rem; cursor: pointer; color: #374151; white-space: nowrap; font-weight: 600; }
    .btn-refresh:hover { background: #f3f4f6; }
    .async-info { display: none; font-size: .82rem; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 14px; margin: 12px 20px; }
    .async-info.visible { display: flex; align-items: center; gap: 10px; }
    .async-info .btn-refresh { margin-left: auto; flex-shrink: 0; }
    .editor-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .changes-info { font-size: .85rem; color: #6b7280; }
    .changes-info strong { color: #111827; }
    .btn-save { padding: 8px 22px; background: #850c18; color: #fff; border: none; border-radius: 10px; font-size: .88rem; font-weight: 600; cursor: pointer; }
    .btn-save:hover { background: #6b0913; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .btn-cancel { padding: 8px 14px; background: #fff; color: #374151; border: 1px solid #e5e7eb; border-radius: 10px; font-size: .88rem; cursor: pointer; }
    .btn-cancel:hover { background: #f3f4f6; }
    .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 12px; font-size: .9rem; font-weight: 600; color: #fff; z-index: 999; opacity: 0; transition: opacity .3s; pointer-events: none; }
    .toast.show { opacity: 1; }
    .toast.ok  { background: #16a34a; }
    .toast.err { background: #dc2626; }
    .loading { padding: 24px; text-align: center; color: #9ca3af; font-size: .88rem; }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid #e5e7eb; border-top-color: #850c18; border-radius: 50%; animation: spin .7s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty { padding: 20px; text-align: center; color: #9ca3af; font-size: .85rem; }
    #editorTile { display: none; }
  </style>
</head>
<body>
<div id="appContent" style="display:none;">
  <div class="container">
    <div class="cat-tiles" id="catTiles">
      <div class="loading"><span class="spinner"></span>Henter grupper...</div>
    </div>
    <div class="tile" id="groupTile" style="display:none;">
      <div class="tile-header" onclick="toggleTile(this)">
        <div class="tile-icon">👥</div>
        <div class="tile-title" id="groupTileTitle">Grupper</div>
        <div class="tile-chevron open">▼</div>
      </div>
      <div class="tile-body">
        <div class="group-list" id="groupList"></div>
      </div>
    </div>
    <div class="tile" id="editorTile">
      <div class="tile-header" onclick="toggleTile(this)">
        <div class="tile-icon">✏️</div>
        <div class="tile-title" id="editorTileTitle">Vælg en gruppe</div>
        <div class="tile-chevron open">▼</div>
      </div>
      <div class="tile-body" style="padding:0;">
        <div class="editor visible" id="groupEditor">
          <div class="col stamdata">
            <div class="col-header">Stamdata</div>
            <div class="col-body" id="stamdataBody"><div class="empty">Vælg en gruppe</div></div>
          </div>
          <div class="col member-list">
            <div class="col-header light">
              Nuværende medlemmer <span id="memberCount" style="font-weight:400;"></span>
              <button class="btn-refresh" id="refreshBtn" onclick="refreshMembers()" title="Genindlæs medlemmer" style="display:none;">↻ Opdater</button>
            </div>
            <div class="col-search">
              <input type="search" id="memberSearch" placeholder="Søg..." oninput="filterMembers()" />
            </div>
            <div class="col-body" id="memberBody"><div class="empty">Vælg en gruppe</div></div>
          </div>
          <div class="btn-col">
            <button class="arrow-btn" onclick="addSelected()" title="Tilføj valgte til gruppe">◀</button>
            <button class="arrow-btn" onclick="removeSelected()" title="Fjern valgte fra gruppe">▶</button>
          </div>
          <div class="col">
            <div class="col-header light">Alle brugere <span id="allUserCount" style="font-weight:400;"></span></div>
            <div class="col-search">
              <input type="search" id="userSearch" placeholder="Søg..." oninput="filterUsers()" />
              <div class="filter-checks">
                <label class="filter-check"><input type="checkbox" id="filterResources" onchange="filterUsers()" /> Ressourcer</label>
                <label class="filter-check"><input type="checkbox" id="filterShared" onchange="filterUsers()" /> Delte mailbokse</label>
                <label class="filter-check"><input type="checkbox" id="selectAll" onchange="toggleSelectAll()" /> Markér alle</label>
              </div>
            </div>
            <div class="col-body" id="userBody"><div class="loading"><span class="spinner"></span>Henter brugere...</div></div>
          </div>
        </div>
        <div class="async-info" id="asyncInfo">
          ⏳ Ændringer er sendt — tjek om de er trådt i kraft.
          <button class="btn-refresh" onclick="refreshMembers()">↻ Opdater medlemmer</button>
        </div>
        <div class="editor-footer">
          <div class="changes-info" id="changesInfo">Ingen ændringer</div>
          <div style="display:flex;gap:8px;">
            <button class="btn-cancel" onclick="cancelChanges()">Annuller</button>
            <button class="btn-save" id="saveBtn" onclick="saveChanges()" disabled>Gem ændringer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
const AGENT = "http://localhost:5199";
const APP_ID    = "368f6374-a1c8-4091-b92d-b0c517a851fe";
const CERT_THUMB = "67F955D36ADCE50A407505F2C09785C4EC50EECE";
const ORG       = "lcherrup.dk";

const CATEGORIES = [
  { id: "portal", label: "Portal", icon: "🔐", prefix: "portal_" },
  { id: "alle",   label: "Alle",   icon: "👥", prefix: "Alle" },
];

let allGroups = [], allUsers = [], currentGroup = null, activeCategory = null;
let workingMembers = [], originalMembers = [];
let selectedMembers = new Set(), selectedUsers = new Set();

document.addEventListener("DOMContentLoaded", () => {
  ITAuth.requireAuth(({ user, roles, isAdmin }) => {
    document.getElementById("appContent").style.setProperty("display", "block", "important");
    init();
  });
});

async function init() {
  const [groupRes, userRes] = await Promise.all([
    fetch("/api/getGroups").then(r => r.json()).catch(() => ({ groups: [] })),
    fetch("/api/getUsers").then(r => r.json()).catch(() => ({ users: [] }))
  ]);
  allGroups = groupRes.groups ?? [];
  allUsers  = userRes.users  ?? [];
  document.getElementById("allUserCount").textContent = `(${allUsers.length})`;
  renderUsers();
  renderCatTiles();
}

function isMailGroup(group) {
  return group?.mailEnabled === true && !(group?.groupTypes ?? []).includes("Unified");
}

function passesFilter(u) {
  const showResources = document.getElementById("filterResources").checked;
  const showShared    = document.getElementById("filterShared").checked;
  if (!showResources && u.mailboxType === "room")   return false;
  if (!showShared    && u.mailboxType === "shared") return false;
  return true;
}

function renderCatTiles() {
  const container = document.getElementById("catTiles");
  container.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const count = allGroups.filter(g => g.displayName?.toLowerCase().startsWith(cat.prefix.toLowerCase())).length;
    const div = document.createElement("div");
    div.className = "cat-tile" + (activeCategory?.id === cat.id ? " active" : "");
    div.innerHTML = `<div class="cat-tile-icon">${cat.icon}</div><div class="cat-tile-label">${cat.label}</div><div class="cat-tile-count">(${count})</div>`;
    div.onclick = () => selectCategory(cat);
    container.appendChild(div);
  });
}

function selectCategory(cat) {
  activeCategory = cat;
  renderCatTiles();
  const filtered = allGroups.filter(g => g.displayName?.toLowerCase().startsWith(cat.prefix.toLowerCase()));
  document.getElementById("groupTile").style.display = "";
  document.getElementById("groupTileTitle").textContent = `${cat.label} grupper (${filtered.length})`;
  renderGroupList(filtered);
  currentGroup = null;
  document.getElementById("editorTile").style.removeProperty("display");
}

function renderGroupList(groups) {
  const list = document.getElementById("groupList");
  list.innerHTML = "";
  if (groups.length === 0) { list.innerHTML = '<div class="empty">Ingen grupper fundet</div>'; return; }
  groups.forEach(g => {
    const div = document.createElement("div");
    div.className = "group-item" + (currentGroup?.id === g.id ? " active" : "");
    div.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div class="group-name">${esc(g.displayName)}</div>
        <div class="group-email">${esc(g.mail ?? "")}</div>
      </div>
      <div class="member-count" id="mc-${g.id}">⏳</div>`;
    div.onclick = () => selectGroup(g);
    list.appendChild(div);
  });
}

async function selectGroup(group) {
  currentGroup = group;
  renderGroupList(allGroups.filter(g => g.displayName?.toLowerCase().startsWith(activeCategory?.prefix?.toLowerCase() ?? "")));
  const editorTile = document.getElementById("editorTile");
  editorTile.style.setProperty("display", "block", "important");
  document.getElementById("editorTileTitle").textContent = `Medlemmer — ${group.displayName}`;
  editorTile.querySelector(".tile-body").style.display = "";
  editorTile.querySelector(".tile-chevron").classList.add("open");
  document.getElementById("asyncInfo").classList.remove("visible");
  document.getElementById("refreshBtn").style.display = isMailGroup(group) ? "" : "none";
  setTimeout(() => editorTile.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  renderStamdata(group);
  await loadMembers(group);
}

async function loadMembers(group) {
  document.getElementById("memberBody").innerHTML = '<div class="loading"><span class="spinner"></span>Henter...</div>';
  document.getElementById("memberCount").textContent = "";
  selectedMembers.clear(); selectedUsers.clear();
  try {
    const data = await fetch(`/api/getGroupMembers?id=${encodeURIComponent(group.id)}`).then(r => r.json());
    originalMembers = data.members ?? [];
    workingMembers  = [...originalMembers];
    renderMembers(); renderUsers();
    updateMemberCount(group.id, originalMembers.length);
    updateFooter();
  } catch {
    document.getElementById("memberBody").innerHTML = '<div class="empty">Kunne ikke hente medlemmer.</div>';
  }
}

async function refreshMembers() {
  if (!currentGroup) return;
  await loadMembers(currentGroup);
  document.getElementById("asyncInfo").classList.remove("visible");
  showToast("Medlemsliste opdateret", "ok");
}

function renderStamdata(g) {
  document.getElementById("stamdataBody").innerHTML = `
    <div class="sd-row"><div class="sd-label">Navn</div><div class="sd-value">${esc(g.displayName)}</div></div>
    <div class="sd-row"><div class="sd-label">E-mail</div><div class="sd-value">${esc(g.mail ?? "—")}</div></div>
    <div class="sd-row"><div class="sd-label">Beskrivelse</div><div class="sd-value">${esc(g.description ?? "—")}</div></div>
    <div class="sd-row"><div class="sd-label">Oprettet</div><div class="sd-value">${esc(g.createdDateTime ? g.createdDateTime.substring(0,10) : "—")}</div></div>
    <div class="sd-row"><div class="sd-label">Gruppe ID</div><div class="sd-value" style="font-size:.72rem;color:#9ca3af;">${esc(g.id)}</div></div>`;
}

function updateMemberCount(groupId, count) {
  const el = document.getElementById(`mc-${groupId}`);
  if (el) el.textContent = count + " medlemmer";
}

function toggleTile(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector(".tile-chevron");
  const isOpen = body.style.display !== "none";
  body.style.display = isOpen ? "none" : "";
  chevron.classList.toggle("open", !isOpen);
}

function renderMembers(q = "") {
  const body = document.getElementById("memberBody");
  const list = workingMembers.filter(u => !q || u.displayName?.toLowerCase().includes(q.toLowerCase()) || u.mail?.toLowerCase().includes(q.toLowerCase()));
  document.getElementById("memberCount").textContent = `(${workingMembers.length})`;
  if (list.length === 0) { body.innerHTML = '<div class="empty">Ingen medlemmer</div>'; return; }
  body.innerHTML = "";
  list.forEach(u => {
    const div = document.createElement("div");
    div.className = "user-item" + (selectedMembers.has(u.id) ? " selected" : "");
    div.innerHTML = `<div class="user-avatar">${initials(u.displayName)}</div><div class="user-info"><div class="user-name">${esc(u.displayName)}</div><div class="user-email">${esc(u.mail ?? "")}</div></div><div class="user-check"></div>`;
    div.onclick = () => { selectedMembers.has(u.id) ? selectedMembers.delete(u.id) : selectedMembers.add(u.id); renderMembers(document.getElementById("memberSearch").value); };
    body.appendChild(div);
  });
}

function filterMembers() { renderMembers(document.getElementById("memberSearch").value); }

function getVisibleUsers() {
  const q = document.getElementById("userSearch").value.toLowerCase();
  const memberIds = new Set(workingMembers.map(m => m.id));
  return allUsers.filter(u => {
    if (memberIds.has(u.id)) return false;
    if (!passesFilter(u)) return false;
    if (q && !u.displayName?.toLowerCase().includes(q) && !u.mail?.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderUsers() {
  const body = document.getElementById("userBody");
  const list = getVisibleUsers();
  if (list.length === 0) { body.innerHTML = '<div class="empty">Ingen brugere at vise</div>'; return; }
  body.innerHTML = "";
  list.forEach(u => {
    const div = document.createElement("div");
    div.className = "user-item" + (selectedUsers.has(u.id) ? " selected" : "");
    div.innerHTML = `<div class="user-avatar">${initials(u.displayName)}</div><div class="user-info"><div class="user-name">${esc(u.displayName)}</div><div class="user-email">${esc(u.mail ?? "")}</div></div><div class="user-check"></div>`;
    div.onclick = () => {
      selectedUsers.has(u.id) ? selectedUsers.delete(u.id) : selectedUsers.add(u.id);
      const vis = getVisibleUsers().map(v => v.id);
      document.getElementById("selectAll").checked = vis.length > 0 && vis.every(id => selectedUsers.has(id));
      renderUsers();
    };
    body.appendChild(div);
  });
}

function filterUsers() { document.getElementById("selectAll").checked = false; selectedUsers.clear(); renderUsers(); renderMembers(document.getElementById("memberSearch").value); }
function toggleSelectAll() { const checked = document.getElementById("selectAll").checked; const vis = getVisibleUsers().map(u => u.id); if (checked) vis.forEach(id => selectedUsers.add(id)); else selectedUsers.clear(); renderUsers(); }

function addSelected() {
  if (selectedUsers.size === 0) return;
  workingMembers = [...workingMembers, ...allUsers.filter(u => selectedUsers.has(u.id))];
  selectedUsers.clear(); document.getElementById("selectAll").checked = false;
  renderMembers(document.getElementById("memberSearch").value); renderUsers(); updateFooter();
}

function removeSelected() {
  if (selectedMembers.size === 0) return;
  workingMembers = workingMembers.filter(u => !selectedMembers.has(u.id));
  selectedMembers.clear(); renderMembers(document.getElementById("memberSearch").value); renderUsers(); updateFooter();
}

function updateFooter() {
  const origIds = new Set(originalMembers.map(m => m.id));
  const workIds = new Set(workingMembers.map(m => m.id));
  const toAdd = workingMembers.filter(m => !origIds.has(m.id));
  const toRem = originalMembers.filter(m => !workIds.has(m.id));
  const info = document.getElementById("changesInfo");
  if (toAdd.length === 0 && toRem.length === 0) {
    info.innerHTML = "Ingen ændringer";
    document.getElementById("saveBtn").disabled = true;
  } else {
    const parts = [];
    if (toAdd.length > 0) parts.push(`<strong>+${toAdd.length}</strong> tilføjes`);
    if (toRem.length > 0) parts.push(`<strong>-${toRem.length}</strong> fjernes`);
    info.innerHTML = parts.join(" · ");
    document.getElementById("saveBtn").disabled = false;
  }
}

function cancelChanges() {
  workingMembers = [...originalMembers];
  selectedMembers.clear(); selectedUsers.clear();
  document.getElementById("selectAll").checked = false;
  document.getElementById("asyncInfo").classList.remove("visible");
  renderMembers(); renderUsers(); updateFooter();
}

// ── EXO via agent ──────────────────────────────────────────────
async function runPs(script) {
  const res = await fetch(`${AGENT}/api/run-ps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script })
  });
  if (!res.ok) throw new Error(`Agent svarede ${res.status}`);
  return await res.json();
}

async function saveViaAgent(groupEmail, addEmails, removeEmails) {
  const addPs    = addEmails.map(e => `"${e}"`).join(",");
  const removePs = removeEmails.map(e => `"${e}"`).join(",");

  const script = `
$ErrorActionPreference = 'Stop'
try {
  Connect-ExchangeOnline -AppId "${APP_ID}" -CertificateThumbprint "${CERT_THUMB}" -Organization "${ORG}" -ShowBanner:$false
  $added = 0; $removed = 0; $errors = @()
  foreach ($email in @(${addPs || '""'})) {
    if (-not $email) { continue }
    try {
      Add-DistributionGroupMember -Identity "${groupEmail}" -Member $email -BypassSecurityGroupManagerCheck -ErrorAction Stop
      $added++
    } catch {
      $errors += "Fejl for $($email): $($_.Exception.Message)"
    }
  }
  foreach ($email in @(${removePs || '""'})) {
    if (-not $email) { continue }
    try {
      Remove-DistributionGroupMember -Identity "${groupEmail}" -Member $email -BypassSecurityGroupManagerCheck -Confirm:$false -ErrorAction Stop
      $removed++
    } catch {
      $errors += "Fejl for $($email): $($_.Exception.Message)"
    }
  }
  Disconnect-ExchangeOnline -Confirm:$false
  Write-Output "RESULT:added=$added,removed=$removed,errors=$($errors -join '|')"
} catch {
  Write-Output "FATAL:$($_.Exception.Message)"
}`.trim();

  const data = await runPs(script);
  const output = (data.output || "").trim();

  if (output.includes("FATAL:")) throw new Error(output.replace(/.*FATAL:/, "").trim());

  const resultLine = output.split("\n").find(l => l.startsWith("RESULT:"));
  if (!resultLine) throw new Error("Intet resultat fra agent: " + output);

  const parts   = resultLine.replace("RESULT:", "").split(",");
  const added   = parseInt(parts.find(p => p.startsWith("added="))?.split("=")[1]   || "0");
  const removed = parseInt(parts.find(p => p.startsWith("removed="))?.split("=")[1] || "0");
  const errStr  = parts.find(p => p.startsWith("errors="))?.split("=").slice(1).join("=") || "";
  const errors  = errStr ? errStr.split("|").filter(Boolean) : [];
  return { added, removed, errors };
}

// ── Graph (normale grupper) ────────────────────────────────────
async function saveViaGraph(groupId, toAdd, toRem) {
  const res = await fetch("/api/updateGroupMembers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, add: toAdd, remove: toRem })
  });
  return await res.json();
}

// ── Gem ───────────────────────────────────────────────────────
async function saveChanges() {
  const origIds = new Set(originalMembers.map(m => m.id));
  const workIds = new Set(workingMembers.map(m => m.id));
  const toAdd = workingMembers.filter(m => !origIds.has(m.id));
  const toRem = originalMembers.filter(m => !workIds.has(m.id));
  if (toAdd.length === 0 && toRem.length === 0) return;

  const btn = document.getElementById("saveBtn");
  btn.disabled = true; btn.textContent = "Gemmer...";

  try {
    if (isMailGroup(currentGroup)) {
      // Mail-enabled gruppe → agent
      const groupEmail  = currentGroup.mail;
      const addEmails   = toAdd.map(u => u.mail || u.userPrincipalName).filter(Boolean);
      const removeEmails = toRem.map(u => u.mail || u.userPrincipalName).filter(Boolean);
      const result = await saveViaAgent(groupEmail, addEmails, removeEmails);

      if (result.errors.length > 0) {
        showToast("Delvist gennemført — se konsol", "err");
        console.warn("EXO fejl:", result.errors);
      } else {
        showToast(`Gemt ✓ (+${result.added} / -${result.removed})`, "ok");
      }
      originalMembers = [...workingMembers];
      updateMemberCount(currentGroup.id, originalMembers.length);
      updateFooter();

    } else {
      // Normal gruppe → Graph via Azure Function
      const data = await saveViaGraph(
        currentGroup.id,
        toAdd.map(m => m.id),
        toRem.map(m => m.id)
      );
      if (data.error) throw new Error(data.error);
      originalMembers = [...workingMembers];
      updateMemberCount(currentGroup.id, originalMembers.length);
      updateFooter();
      showToast("Ændringer gemt ✓", "ok");
    }
  } catch (err) {
    showToast("Fejl: " + err.message, "err");
  } finally {
    btn.textContent = "Gem ændringer";
    btn.disabled = false;
  }
}

function initials(name) { if (!name) return "?"; const parts = name.trim().split(" "); return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : name[0].toUpperCase(); }
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function showToast(msg, type) { const t = document.getElementById("toast"); t.textContent = msg; t.className = `toast ${type} show`; setTimeout(() => t.classList.remove("show"), 3500); }
</script>
</body>
</html>
