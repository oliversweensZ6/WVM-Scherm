import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvb1RTOvNSMuRvIntSUPQKoI-mdPBlhcA",
  authDomain: "wvm-scherm.firebaseapp.com",
  projectId: "wvm-scherm",
  storageBucket: "wvm-scherm.firebasestorage.app",
  messagingSenderId: "916379881435",
  appId: "1:916379881435:web:8e1cc130766e460bdca1fe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Altijd Klok-tijd berekenen
setInterval(() => {
    const el = document.getElementById('klok-container');
    if(el) el.innerText = new Date().toLocaleTimeString('nl-NL', { hour12: false });
}, 1000);

// --- 1. ADMIN LOGICA (Wordt alleen uitgevoerd als #login-form bestaat) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const adminContent = document.getElementById('admin-content');
    const klokSwitch = document.getElementById('klok-switch');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginForm.style.display = 'none';
            adminContent.style.display = 'block';
            laadBeheerData();
        } else {
            loginForm.style.display = 'block';
            adminContent.style.display = 'none';
        }
    });

    document.getElementById('btn-login').onclick = () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Fout: " + e.message));
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);

    function laadBeheerData() {
        // Agenda met verwijder-knoppen
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            let h = '';
            snap.forEach(d => {
                h += `<div class="admin-item"><span>${d.data().datum}: ${d.data().titel}</span>
                     <button class="btn-del" data-id="${d.id}" style="background:red;color:white;border:none;padding:5px;border-radius:3px;">X</button></div>`;
            });
            document.getElementById('admin-agenda-list').innerHTML = h;
            document.querySelectorAll('.btn-del').forEach(b => b.onclick = () => deleteDoc(doc(db, "agenda", b.dataset.id)));
        });

        // Vullen van vakken
        onSnapshot(doc(db, "content", "mededeling"), d => { if(d.exists()) document.getElementById('med-tekst').value = d.data().tekst; });
        onSnapshot(doc(db, "content", "rooster"), d => { 
            if(d.exists()) {
                document.getElementById('rooster-zorg').value = d.data().zorgbad;
                document.getElementById('rooster-wed').value = d.data().wedstrijdbad;
            }
        });
        onSnapshot(doc(db, "content", "instellingen"), d => { 
            if(d.exists() && klokSwitch) klokSwitch.checked = d.data().toonKlok; 
        });
    }

    // Klok switch direct opslaan
    if(klokSwitch) {
        klokSwitch.onchange = (e) => {
            setDoc(doc(db, "content", "instellingen"), { toonKlok: e.target.checked }, { merge: true });
        };
    }

    // Opslaan knoppen
    document.getElementById('btn-save-agenda').onclick = () => {
        const val = document.getElementById('ag-datum').value;
        if(!val) return alert("Kies datum");
        const d = new Date(val); d.setHours(0,0,0,0);
        addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', {day:'numeric', month:'short'}).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        }).then(() => alert("Toegevoegd")).catch(e => alert(e.message));
    };

    document.getElementById('btn-save-med').onclick = () => setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value }).then(() => alert("Opgeslagen"));
    document.getElementById('btn-save-rooster').onclick = () => setDoc(doc(db, "content", "rooster"), { 
        zorgbad: document.getElementById('rooster-zorg').value, wedstrijdbad: document.getElementById('rooster-wed').value 
    }).then(() => alert("Opgeslagen"));
}

// --- 2. TV SCHERM LOGICA (Wordt alleen uitgevoerd als #agenda-content bestaat) ---
const screenAgenda = document.getElementById('agenda-content');
if (screenAgenda) {
    let activePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;

    // Agenda ophalen
    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => { h += `<div class="agenda-item"><span class="date">${doc.data().datum}</span> <span>${doc.data().titel} - ${doc.data().onderwerp}</span></div>`; });
        screenAgenda.innerHTML = h;
    });

    // Rooster ophalen
    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('rooster-zorgbad').innerHTML = (docSnap.data().zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
            document.getElementById('rooster-wedstrijdbad').innerHTML = (docSnap.data().wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        }
    });

    // Mededeling ophalen & wissel-check
    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        const t = docSnap.data()?.tekst;
        const annArea = document.getElementById('announcement-text');
        if (t && t.trim() !== "" && annArea) {
            annArea.innerText = t;
            if (!activePages.includes('page-announcement')) activePages.push('page-announcement');
        } else {
            activePages = activePages.filter(p => p !== 'page-announcement');
        }
    });

    // Klok status ophalen
    onSnapshot(doc(db, "content", "instellingen"), (docSnap) => {
        const k = document.getElementById('klok-container');
        if(k) k.style.display = (docSnap.exists() && docSnap.data().toonKlok === false) ? 'none' : 'block';
    });

    // Pagina's wisselen
    setInterval(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        const nextPage = document.getElementById(activePages[currentIndex]);
        if(nextPage) nextPage.classList.add('active');
    }, 15000);
}
