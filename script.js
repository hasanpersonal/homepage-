// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyC_X7kI9zBBqRPbM3UKkB5ykz8y1c3QuW4",
    authDomain: "homepage-imrul.firebaseapp.com",
    projectId: "homepage-imrul",
    storageBucket: "homepage-imrul.firebasestorage.app",
    messagingSenderId: "1072413707621",
    appId: "1:1072413707621:web:49d3a62212484a104d258c",
    measurementId: "G-MH05RYKD1E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Variables
let defaultHeader = "Welcome Back, Hasan";
let appsData = [];

// DOM Elements
const headerText = document.getElementById('headerText');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const appsGrid = document.getElementById('appsGrid');
const animeList = document.getElementById('animeList');

// Modal Elements
const settingsModal = document.getElementById('settingsModal');
const editBtn = document.getElementById('editBtn');
const closeModal = document.getElementById('closeModal');
const editHeaderText = document.getElementById('editHeaderText');
const saveHeaderBtn = document.getElementById('saveHeaderBtn');
const newAppName = document.getElementById('newAppName');
const newAppUrl = document.getElementById('newAppUrl');
const addAppBtn = document.getElementById('addAppBtn');
const manageAppsList = document.getElementById('manageAppsList');

// ==========================================
// 1. Google Search Functionality
// ==========================================
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
});

// ==========================================
// 2. Fetch Data from Firebase
// ==========================================
async function loadData() {
    try {
        const docRef = doc(db, "homepageData", "userSettings");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            headerText.innerText = data.headerText || defaultHeader;
            appsData = data.apps || [];
        } else {
            // First time setup: Create default data
            headerText.innerText = defaultHeader;
            await setDoc(docRef, { headerText: defaultHeader, apps: [] });
        }
        renderApps();
        renderManageApps();
    } catch (error) {
        console.error("Error loading Firebase data:", error);
    }
}

async function saveDataToFirebase() {
    try {
        const docRef = doc(db, "homepageData", "userSettings");
        await setDoc(docRef, {
            headerText: headerText.innerText,
            apps: appsData
        });
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

// ==========================================
// 3. Render Apps & Auto Fetch Favicon
// ==========================================
function renderApps() {
    appsGrid.innerHTML = "";
    appsData.forEach(app => {
        // Automatically fetches high quality logo using Google Favicon API
        const iconUrl = `https://www.google.com/s2/favicons?domain=${app.url}&sz=128`;
        
        const a = document.createElement('a');
        a.href = app.url;
        a.className = "app-item";
        a.innerHTML = `
            <img src="${iconUrl}" class="app-icon" alt="${app.name}">
            <span class="app-name">${app.name}</span>
        `;
        appsGrid.appendChild(a);
    });
}

// ==========================================
// 4. Modal & Settings Logic
// ==========================================
editBtn.onclick = () => {
    settingsModal.style.display = "flex";
    editHeaderText.value = headerText.innerText;
}
closeModal.onclick = () => settingsModal.style.display = "none";
window.onclick = (e) => { if (e.target == settingsModal) settingsModal.style.display = "none"; }

saveHeaderBtn.onclick = async () => {
    if(editHeaderText.value.trim() !== "") {
        headerText.innerText = editHeaderText.value;
        await saveDataToFirebase();
        alert("Header Saved!");
    }
}

addAppBtn.onclick = async () => {
    const name = newAppName.value.trim();
    let url = newAppUrl.value.trim();
    
    if (name && url) {
        if(!url.startsWith('http')) url = 'https://' + url;
        appsData.push({ id: Date.now(), name, url });
        await saveDataToFirebase();
        renderApps();
        renderManageApps();
        newAppName.value = "";
        newAppUrl.value = "";
    }
}

function renderManageApps() {
    manageAppsList.innerHTML = "";
    appsData.forEach((app, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${app.name}</span>
            <div class="action-btns">
                <button onclick="moveApp(${index}, -1)"><i class="fas fa-arrow-up"></i></button>
                <button onclick="moveApp(${index}, 1)"><i class="fas fa-arrow-down"></i></button>
                <button class="del" onclick="deleteApp(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        manageAppsList.appendChild(li);
    });
}

window.deleteApp = async (index) => {
    appsData.splice(index, 1);
    await saveDataToFirebase();
    renderApps();
    renderManageApps();
}

window.moveApp = async (index, direction) => {
    if (index + direction >= 0 && index + direction < appsData.length) {
        const temp = appsData[index];
        appsData[index] = appsData[index + direction];
        appsData[index + direction] = temp;
        await saveDataToFirebase();
        renderApps();
        renderManageApps();
    }
}

// ==========================================
// 5. Anime Schedule Setup (Today + Next 2 days)
// ==========================================
const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const todayIndex = new Date().getDay();
const daysToFetch = [
    { label: "Today", value: daysOfWeek[todayIndex] },
    { label: "Tomorrow", value: daysOfWeek[(todayIndex + 1) % 7] },
    { label: "Day After", value: daysOfWeek[(todayIndex + 2) % 7] }
];

async function loadAnimeSchedule() {
    animeList.innerHTML = "";
    for (let day of daysToFetch) {
        try {
            const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day.value}&limit=3`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                // Show top 2 animes of that day
                const topAnimes = data.data.slice(0, 2).map(a => a.title_english || a.title).join(", ");
                animeList.innerHTML += `
                    <div class="anime-item">
                        <span class="anime-day">${day.label}</span>
                        <span>${topAnimes}</span>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Failed to load anime:", e);
        }
    }
    if (animeList.innerHTML === "") animeList.innerHTML = "<p>No schedule found.</p>";
}

// Initialize Everything
loadData();
loadAnimeSchedule();
