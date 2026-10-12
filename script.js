// 1. Firebase Imports (Using CDN for static HTML)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyApS9a6cxv7O0LMARD7IKOr-WEQAtlq9fI",
  authDomain: "mydata-81da6.firebaseapp.com",
  projectId: "mydata-81da6",
  storageBucket: "mydata-81da6.firebasestorage.app",
  messagingSenderId: "577099961634",
  appId: "1:577099961634:web:e7540f6d3e2d4f8c46417b",
  measurementId: "G-TG577X5M4G"
};

// 3. Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// State Variables & Default Data
// ==========================================
let defaultHeader = "Welcome Back, Hasan";
let appsData = [];

// ==========================================
// DOM Elements
// ==========================================
const headerText = document.getElementById('headerText');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const appsGrid = document.getElementById('appsGrid');
const animeList = document.getElementById('animeList');

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
// Google Search Functionality
// ==========================================
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
});

// ==========================================
// Fetch & Save Data from Firebase
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
        alert("Failed to save data. Check console for details.");
    }
}

// ==========================================
// Render Apps & Auto Fetch Favicon
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
            <img src="${iconUrl}" class="app-icon" alt="${app.name}" onerror="this.src='https://via.placeholder.com/128?text=App'">
            <span class="app-name">${app.name}</span>
        `;
        appsGrid.appendChild(a);
    });
}

// ==========================================
// Modal & Settings Logic
// ==========================================
editBtn.onclick = () => {
    settingsModal.style.display = "flex";
    editHeaderText.value = headerText.innerText;
}
closeModal.onclick = () => {
    settingsModal.style.display = "none";
}
window.onclick = (e) => { 
    if (e.target == settingsModal) {
        settingsModal.style.display = "none";
    }
}

saveHeaderBtn.onclick = async () => {
    const newText = editHeaderText.value.trim();
    if(newText !== "") {
        headerText.innerText = newText;
        await saveDataToFirebase();
        alert("Header Text Saved Successfully!");
    }
}

addAppBtn.onclick = async () => {
    const name = newAppName.value.trim();
    let url = newAppUrl.value.trim();
    
    if (name && url) {
        if(!url.startsWith('http')) {
            url = 'https://' + url;
        }
        appsData.push({ id: Date.now(), name, url });
        await saveDataToFirebase();
        renderApps();
        renderManageApps();
        newAppName.value = "";
        newAppUrl.value = "";
    } else {
        alert("Please enter both Name and URL!");
    }
}

// Render the list inside the settings modal
function renderManageApps() {
    manageAppsList.innerHTML = "";
    appsData.forEach((app, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${app.name}</span>
            <div class="action-btns">
                <button onclick="window.moveApp(${index}, -1)" title="Move Up"><i class="fas fa-arrow-up"></i></button>
                <button onclick="window.moveApp(${index}, 1)" title="Move Down"><i class="fas fa-arrow-down"></i></button>
                <button class="del" onclick="window.deleteApp(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        manageAppsList.appendChild(li);
    });
}

// Make functions available globally for inline onclick attributes
window.deleteApp = async (index) => {
    if(confirm("Are you sure you want to delete this website?")) {
        appsData.splice(index, 1);
        await saveDataToFirebase();
        renderApps();
        renderManageApps();
    }
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
// Anime Schedule Setup (Today + Next 2 days)
// ==========================================
const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const todayIndex = new Date().getDay();
const daysToFetch = [
    { label: "Today", value: daysOfWeek[todayIndex] },
    { label: "Tomorrow", value: daysOfWeek[(todayIndex + 1) % 7] },
    { label: "Day After", value: daysOfWeek[(todayIndex + 2) % 7] }
];

async function loadAnimeSchedule() {
    animeList.innerHTML = "<p>Loading schedule...</p>";
    let scheduleHTML = "";
    
    for (let day of daysToFetch) {
        try {
            const res = await fetch(`https://api.jikan.moe/v4/schedules?filter=${day.value}&limit=3`);
            const data = await res.json();
            
            if (data.data && data.data.length > 0) {
                // Get top 2 animes for the day
                const topAnimes = data.data.slice(0, 2).map(a => a.title_english || a.title).join(", ");
                scheduleHTML += `
                    <div class="anime-item">
                        <span class="anime-day">${day.label}</span>
                        <span>${topAnimes}</span>
                    </div>
                `;
            }
        } catch (e) {
            console.error(`Failed to load anime for ${day.label}:`, e);
        }
    }
    
    if (scheduleHTML === "") {
        animeList.innerHTML = "<p>No schedule available right now.</p>";
    } else {
        animeList.innerHTML = scheduleHTML;
    }
}

// ==========================================
// Initialize Everything on Load
// ==========================================
loadData();
loadAnimeSchedule();
