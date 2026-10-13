import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===== Google Drive setup: paste your OAuth Client ID here =====
const GOOGLE_CLIENT_ID = "PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const firebaseConfig = {
  apiKey: "AIzaSyApS9a6cxv7O0LMARD7IKOr-WEQAtlq9fI",
  authDomain: "mydata-81da6.firebaseapp.com",
  projectId: "mydata-81da6",
  storageBucket: "mydata-81da6.firebasestorage.app",
  messagingSenderId: "577099961634",
  appId: "1:577099961634:web:e7540f6d3e2d4f8c46417b",
  measurementId: "G-TG577X5M4G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "homepageData", "userSettings");

const DEFAULT_HEADER = "Welcome Back, Hasan";
const CACHE_KEY = "homepage-cache", TOKEN_KEY = "homepage-drive-token";
let currentHeader = DEFAULT_HEADER, appsData = [], driveFolder = "", tokenClient = null;

const $ = (id) => document.getElementById(id);
const headerText = $('headerText'), searchInput = $('searchInput'), appsGrid = $('appsGrid');
const settingsModal = $('settingsModal'), editBtn = $('editBtn'), closeModal = $('closeModal');
const editHeaderText = $('editHeaderText'), saveHeaderBtn = $('saveHeaderBtn');
const newAppName = $('newAppName'), newAppUrl = $('newAppUrl'), addAppBtn = $('addAppBtn');
const driveFolderInput = $('driveFolderInput'), saveFolderBtn = $('saveFolderBtn');
const manageAppsList = $('manageAppsList'), toastEl = $('toast');
const driveList = $('driveList'), driveRefresh = $('driveRefresh'), driveSignOut = $('driveSignOut');

function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
}
let toastTimer;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
function setHeader(text) {
    currentHeader = text;
    headerText.textContent = text;
    headerText.dataset.text = text;
}

// ===== Search ("/" focuses it, Escape closes settings) =====
$('searchForm').addEventListener('submit', (e) => { if (!searchInput.value.trim()) e.preventDefault(); });
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); searchInput.focus(); }
    if (e.key === 'Escape') closeSettings();
});

// ===== Data: local cache paints instantly, Firestore is the source of truth =====
function cacheState() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ headerText: currentHeader, apps: appsData, driveFolder })); } catch {}
}
async function loadData() {
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const d = snap.data();
            setHeader(d.headerText || DEFAULT_HEADER);
            appsData = Array.isArray(d.apps) ? d.apps : [];
            driveFolder = d.driveFolder || "";
        } else {
            await setDoc(docRef, { headerText: DEFAULT_HEADER, apps: [], driveFolder: "" });
        }
        cacheState(); renderApps(); renderManageApps();
    } catch (err) {
        console.error("Error loading Firebase data:", err);
        toast("Couldn't load saved data. Showing the last version.");
    }
}
async function saveData() {
    try {
        await setDoc(docRef, { headerText: currentHeader, apps: appsData, driveFolder }, { merge: true });
        return true;
    } catch (err) { console.error("Error saving data:", err); return false; }
}
async function commit(okMsg) {
    renderApps(); renderManageApps(); cacheState();
    toast((await saveData()) ? okMsg : "Couldn't save. Check your connection.");
}

// ===== URLs & icons =====
function normalizeUrl(raw) {
    let v = raw.trim();
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
        const u = new URL(v);
        return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : null;
    } catch { return null; }
}
function iconSources(url) {
    let host = url, origin = '';
    try { const u = new URL(url); host = u.hostname; origin = u.origin; } catch {}
    return [
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=128`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
        `https://icons.duckduckgo.com/ip3/${host}.ico`,
        origin && `${origin}/favicon.ico`
    ].filter(Boolean);
}

function renderApps() {
    appsGrid.replaceChildren();
    appsData.forEach((item) => {
        const a = el('a', 'app-item');
        a.href = normalizeUrl(item.url) || '#';
        a.rel = 'noopener';

        const icon = el('span', 'app-icon');
        const img = new Image();
        const sources = iconSources(item.url);
        let n = 0;
        img.alt = '';
        img.onerror = () => {               // try the next icon source, then fall back to a letter
            if (++n < sources.length) { img.src = sources[n]; return; }
            img.remove();
            icon.classList.add('letter');
            icon.textContent = (item.name || '?').charAt(0).toUpperCase();
        };
        img.src = sources[0];
        icon.append(img);

        a.append(icon, el('span', 'app-name', item.name));
        appsGrid.append(a);
    });
}

function renderManageApps() {
    manageAppsList.replaceChildren();
    if (!appsData.length) { manageAppsList.append(el('li', 'muted', 'No websites yet. Add one above.')); return; }
    appsData.forEach((item, i) => {
        const li = el('li'), btns = el('div', 'action-btns');
        [['up', 'fa-arrow-up', 'Move up'], ['down', 'fa-arrow-down', 'Move down'], ['delete', 'fa-trash', 'Delete']].forEach(([act, icon, label]) => {
            const b = el('button', act === 'delete' ? 'del' : '');
            b.type = 'button';
            b.dataset.action = act;
            b.dataset.index = i;
            b.title = label;
            b.setAttribute('aria-label', `${label}: ${item.name}`);
            b.append(el('i', `fas ${icon}`));
            btns.append(b);
        });
        li.append(el('span', '', item.name), btns);
        manageAppsList.append(li);
    });
}

manageAppsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const i = Number(btn.dataset.index), act = btn.dataset.action;
    if (act === 'delete') {
        if (!confirm(`Delete "${appsData[i].name}"?`)) return;
        appsData.splice(i, 1);
        await commit('Website deleted');
    } else {
        const j = i + (act === 'up' ? -1 : 1);
        if (j < 0 || j >= appsData.length) return;
        [appsData[i], appsData[j]] = [appsData[j], appsData[i]];
        await commit('Order saved');
    }
});

// ===== Settings modal =====
let lastFocus = null;
function openSettings() {
    lastFocus = document.activeElement;
    editHeaderText.value = currentHeader;
    driveFolderInput.value = driveFolder;
    settingsModal.classList.add('open');
    editHeaderText.focus();
}
function closeSettings() {
    if (!settingsModal.classList.contains('open')) return;
    settingsModal.classList.remove('open');
    if (lastFocus) lastFocus.focus();
}
editBtn.addEventListener('click', openSettings);
closeModal.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

saveHeaderBtn.addEventListener('click', async () => {
    const text = editHeaderText.value.trim();
    if (!text) return toast("Header can't be empty");
    setHeader(text); cacheState();
    toast((await saveData()) ? 'Header saved' : "Couldn't save. Check your connection.");
});
addAppBtn.addEventListener('click', async () => {
    const name = newAppName.value.trim(), url = normalizeUrl(newAppUrl.value);
    if (!name || !newAppUrl.value.trim()) return toast('Enter both a name and a URL');
    if (!url) return toast("That URL doesn't look right (try youtube.com)");
    appsData.push({ id: Date.now(), name, url });
    newAppName.value = newAppUrl.value = '';
    await commit('Website added');
});
editHeaderText.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveHeaderBtn.click(); });
[newAppName, newAppUrl].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') addAppBtn.click(); }));

function parseFolder(v) {
    v = v.trim();
    const m = v.match(/folders\/([\w-]+)/) || v.match(/[?&]id=([\w-]+)/);
    return m ? m[1] : /^[\w-]{10,}$/.test(v) ? v : '';
}
saveFolderBtn.addEventListener('click', async () => {
    const v = driveFolderInput.value.trim(), id = parseFolder(v);
    if (v && !id) return toast("That folder link doesn't look right");
    driveFolder = id; cacheState(); loadDrive();
    toast((await saveData()) ? 'Folder saved' : "Couldn't save. Check your connection.");
});

// ===== Google Drive panel (read-only) =====
const FILE_TYPES = {
    'application/vnd.google-apps.document': ['fa-file-lines', 'ft-doc'],
    'application/vnd.google-apps.spreadsheet': ['fa-table', 'ft-sheet'],
    'application/vnd.google-apps.presentation': ['fa-display', 'ft-slide'],
    'application/vnd.google-apps.folder': ['fa-folder', 'ft-folder'],
    'application/pdf': ['fa-file-pdf', 'ft-pdf']
};
const notConfigured = () => GOOGLE_CLIENT_ID.startsWith('PASTE');

function getToken() {
    try { const t = JSON.parse(localStorage.getItem(TOKEN_KEY)); return t && t.exp > Date.now() ? t.token : null; } catch { return null; }
}
function driveMessage(text, label, action) {
    const box = el('div', 'drive-empty');
    box.append(el('p', 'muted', text));
    if (label) {
        const b = el('button', 'btn', label);
        b.type = 'button';
        b.addEventListener('click', action);
        box.append(b);
    }
    driveList.replaceChildren(box);
    driveRefresh.hidden = driveSignOut.hidden = !getToken();
}
function connectDrive() {
    if (!window.google?.accounts?.oauth2) return toast('Google sign-in is still loading. Try again in a moment.');
    tokenClient ||= google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (r) => {
            if (r.error) return toast('Google sign-in was cancelled');
            localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in - 120) * 1000 }));
            loadDrive();
        }
    });
    tokenClient.requestAccessToken();
}
async function loadDrive() {
    if (notConfigured()) return driveMessage('Add your Google Client ID at the top of script.js to turn this on.');
    const token = getToken();
    if (!token) return driveMessage('Connect Google Drive to see your files and notes here.', 'Connect Google Drive', connectDrive);

    const q = driveFolder ? `'${driveFolder}' in parents and trashed=false` : 'trashed=false';
    try {
        const res = await fetch('https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
            q, pageSize: 8, orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink)'
        }), { headers: { Authorization: `Bearer ${token}` } });

        if (res.status === 401) { localStorage.removeItem(TOKEN_KEY); return driveMessage('Your Google session expired.', 'Reconnect', connectDrive); }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const { files } = await res.json();
        if (!files.length) return driveMessage('No files found here yet.');
        driveList.replaceChildren(...files.map((f) => {
            const [icon, cls] = FILE_TYPES[f.mimeType] || ['fa-file', 'ft-file'];
            const a = el('a', 'drive-item');
            a.href = f.webViewLink || '#';
            a.target = '_blank';
            a.rel = 'noopener';
            const ic = el('i', `fas ${icon} ${cls}`);
            a.append(ic, el('span', 'drive-name', f.name),
                el('span', 'drive-date', new Date(f.modifiedTime).toLocaleDateString([], { month: 'short', day: 'numeric' })));
            return a;
        }));
        driveRefresh.hidden = driveSignOut.hidden = false;
    } catch (err) {
        console.error('Drive error:', err);
        driveMessage("Couldn't load Drive files.", 'Try again', loadDrive);
    }
}
driveRefresh.addEventListener('click', loadDrive);
driveSignOut.addEventListener('click', () => {
    const t = getToken();
    if (t && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(t, () => {});
    localStorage.removeItem(TOKEN_KEY);
    loadDrive();
    toast('Google Drive disconnected');
});

// ===== Start =====
setHeader(DEFAULT_HEADER);
try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c) {
        setHeader(c.headerText || DEFAULT_HEADER);
        appsData = c.apps || [];
        driveFolder = c.driveFolder || "";
        renderApps(); renderManageApps();
    }
} catch {}
loadData().then(loadDrive);
