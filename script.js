// 1. Firebase (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 2. State
const DEFAULT_HEADER = "Welcome Back, Hasan";
const CACHE_KEY = "homepage-cache";
let currentHeader = DEFAULT_HEADER;
let appsData = [];

// 3. DOM
const $ = (id) => document.getElementById(id);
const headerText = $('headerText'), searchInput = $('searchInput'), appsGrid = $('appsGrid');
const animeList = $('animeList'), settingsModal = $('settingsModal'), editBtn = $('editBtn');
const closeModal = $('closeModal'), editHeaderText = $('editHeaderText'), saveHeaderBtn = $('saveHeaderBtn');
const newAppName = $('newAppName'), newAppUrl = $('newAppUrl'), addAppBtn = $('addAppBtn');
const manageAppsList = $('manageAppsList'), toastEl = $('toast');

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

// 4. Greeting + live date/time
function tick() {
    const now = new Date(), h = now.getHours();
    $('greeting').textContent = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('when').textContent = `${date}, ${time}`;
}
tick();
setInterval(tick, 15000);

function setHeader(text) {
    currentHeader = text;
    headerText.textContent = text;
    headerText.dataset.text = text;
}

// 5. Search (form also works natively), "/" focuses it
$('searchForm').addEventListener('submit', (e) => {
    if (!searchInput.value.trim()) e.preventDefault();
});
document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); searchInput.focus(); }
    if (e.key === 'Escape') closeSettings();
});

// 6. Data: cache for instant paint, Firestore as source of truth
function cacheState() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ headerText: currentHeader, apps: appsData })); } catch {}
}

async function loadData() {
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            setHeader(data.headerText || DEFAULT_HEADER);
            appsData = Array.isArray(data.apps) ? data.apps : [];
        } else {
            await setDoc(docRef, { headerText: DEFAULT_HEADER, apps: [] });
        }
        cacheState();
        renderApps();
        renderManageApps();
    } catch (err) {
        console.error("Error loading Firebase data:", err);
        toast("Couldn't load saved data. Showing the last version.");
    }
}

async function saveData() {
    try {
        await setDoc(docRef, { headerText: currentHeader, apps: appsData }, { merge: true });
        return true;
    } catch (err) {
        console.error("Error saving data:", err);
        return false;
    }
}

async function commit(okMsg) {
    renderApps();
    renderManageApps();
    cacheState();
    toast((await saveData()) ? okMsg : "Couldn't save. Check your connection.");
}

// 7. URLs
function normalizeUrl(raw) {
    let v = raw.trim();
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
        const u = new URL(v);
        return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : null;
    } catch { return null; }
}
function hostOf(url) {
    try { return new URL(url).hostname; } catch { return url; }
}

// 8. Render apps (DOM APIs only, so names/URLs can't inject HTML)
function renderApps() {
    appsGrid.replaceChildren();
    appsData.forEach((item) => {
        const a = el('a', 'app-item');
        a.href = normalizeUrl(item.url) || '#';
        a.rel = 'noopener';

        const icon = el('span', 'app-icon');
        const img = new Image();
        img.alt = '';
        img.loading = 'lazy';
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(item.url))}&sz=128`;
        img.onerror = () => {
            img.remove();
            icon.classList.add('letter');
            icon.textContent = (item.name || '?').charAt(0).toUpperCase();
        };
        icon.append(img);

        a.append(icon, el('span', 'app-name', item.name));
        appsGrid.append(a);
    });
}

function renderManageApps() {
    manageAppsList.replaceChildren();
    if (!appsData.length) {
        manageAppsList.append(el('li', 'muted', 'No websites yet. Add one above.'));
        return;
    }
    appsData.forEach((item, i) => {
        const li = el('li');
        const btns = el('div', 'action-btns');
        [['up', 'fa-arrow-up', 'Move up'], ['down', 'fa-arrow-down', 'Move down'], ['delete', 'fa-trash', 'Delete']].forEach(([act, icon, label]) => {
            const b = el('button', act === 'delete' ? 'del' : '');
            b.type = 'button';
            b.dataset.action = act;
            b.dataset.index = i;
            b.title = label;
            b.setAttribute('aria-label', `${label}: ${item.name}`);
            const ic = el('i', `fas ${icon}`);
            b.append(ic);
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

// 9. Settings modal
let lastFocus = null;
function openSettings() {
    lastFocus = document.activeElement;
    editHeaderText.value = currentHeader;
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
    setHeader(text);
    cacheState();
    toast((await saveData()) ? 'Header saved' : "Couldn't save. Check your connection.");
});
editHeaderText.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveHeaderBtn.click(); });

addAppBtn.addEventListener('click', async () => {
    const name = newAppName.value.trim();
    const url = normalizeUrl(newAppUrl.value);
    if (!name || !newAppUrl.value.trim()) return toast('Enter both a name and a URL');
    if (!url) return toast("That URL doesn't look right (try youtube.com)");
    appsData.push({ id: Date.now(), name, url });
    newAppName.value = '';
    newAppUrl.value = '';
    await commit('Website added');
});
[newAppName, newAppUrl].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') addAppBtn.click(); }));

// 10. Release dates (today + next 2 days), cached 1 hour to respect Jikan rate limits
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function loadAnimeSchedule() {
    const t = new Date().getDay();
    const days = [['Today', 0], ['Tomorrow', 1], ['Day after', 2]].map(([label, n]) => ({ label, value: DAYS[(t + n) % 7] }));
    const key = 'homepage-anime-' + new Date().toDateString();
    let rows = null;

    try {
        const c = JSON.parse(localStorage.getItem(key));
        if (c && Date.now() - c.t < 3600000) rows = c.rows;
    } catch {}

    if (!rows) {
        rows = [];
        for (const d of days) {
            try {
                const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${d.value}&limit=3`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const { data } = await res.json();
                const titles = [...new Set((data || []).map((a) => a.title_english || a.title))].slice(0, 3);
                if (titles.length) rows.push({ label: d.label, titles });
            } catch (err) {
                console.error(`Failed to load anime for ${d.label}:`, err);
            }
            await new Promise((r) => setTimeout(r, 400));
        }
        if (rows.length) {
            try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), rows })); } catch {}
        }
    }

    animeList.replaceChildren();
    if (!rows.length) {
        animeList.append(el('p', 'muted', 'No schedule available right now.'));
        return;
    }
    rows.forEach((r) => {
        const item = el('div', 'anime-item');
        const chips = el('div', 'chips');
        r.titles.forEach((title) => chips.append(el('span', 'chip', title)));
        item.append(el('span', 'anime-day', r.label), chips);
        animeList.append(item);
    });
}

// 11. Start
setHeader(DEFAULT_HEADER);
try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c) {
        setHeader(c.headerText || DEFAULT_HEADER);
        appsData = c.apps || [];
        renderApps();
        renderManageApps();
    }
} catch {}
loadData();
loadAnimeSchedule();
