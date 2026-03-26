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

// Altijd kloktijd berekenen als het element bestaat
setInterval(() => {
    const el = document.getElementById('klok-container');
    if (el) el.innerText = new Date().toLocaleTimeString('nl-NL', { hour12: false });
}, 1000);

// ==========================================
// A. ADMIN LOGICA (Alleen op admin.html)
// ==========================================
if (document.getElementById('is-admin-page')) {
    const loginDiv = document.getElementById('login-form');
    const adminDiv = document.getElementById('admin-content');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            if(loginDiv) loginDiv.style.display = 'none';
            if(adminDiv) adminDiv.style.display = 'block';
            laadBeheerData();
        } else {
            if(loginDiv) loginDiv.style.display = 'block';
            if(adminDiv) adminDiv.style.display = 'none';
        }
    });

    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) {
        btnLogin.onclick = () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Login fout: " + e.message));
        };
    }

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.onclick = () => signOut(auth);

    function laadBeheerData() {
        // Agenda lijst
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            const list = document.getElementById('admin-agenda-list');
            if(!list) return;
            let h = '';
            snap.forEach(d => {
                h += `<div class="admin-item"><span>${d.data().datum}: ${d.data().titel}</span>
                     <button class="btn-del" data-id="${d.id}" style="background:red;color:white;border:none;padding:5px;cursor:pointer;">X</button></div>`;
            });
            list.innerHTML = h;
            document.querySelectorAll('.btn-del').forEach(b => b.onclick = () => deleteDoc(doc(db, "agenda", b.dataset.id)));
        });

        // Prefill vakken
        onSnapshot(doc(db, "content", "mededeling"), d => { 
            const el = document.getElementById('med-tekst');
            if(d.exists() && el) el.value = d.data().tekst; 
        });
        onSnapshot(doc(db, "content", "rooster"), d => { 
            const z = document.getElementById('rooster-zorg');
            const w = document.getElementById('rooster-wed');
            if(d.exists()) {
                if(z) z.value = d.data().zorgbad;
                if(w) w.value = d.data().wedstrijdbad;
            }
        });
        onSnapshot(doc(db, "content", "instellingen"), d => { 
            const sw = document.getElementById('klok-switch');
            if(d.exists() && sw) sw.checked = d.data().toonKlok; 
        });
    }

    // Event listeners voor opslaan (Eerst checken of knop bestaat)
    const btnAg = document.getElementById('btn-save-agenda');
    if(btnAg) btnAg.onclick = () => {
        const val = document.getElementById('ag-datum').value;
        if(!val) return alert("Datum verplicht");
        const d = new Date(val); d.setHours(0,0,0,0);
        addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', {day:'numeric', month:'short'}).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        }).then(() => alert("Toegevoegd"));
    };

    const swKlok = document.getElementById('klok-switch');
    if(swKlok) swKlok.onchange = (e) => setDoc(doc(db, "content", "instellingen"), { toonKlok: e.target.checked }, { merge: true });

    const btnMed = document.getElementById('btn-save-med');
    if(btnMed) btnMed.onclick = () => setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value }).then(() => alert("Opgeslagen"));

    const btnRoos = document.getElementById('btn-save-rooster');
    if(btnRoos) btnRoos.onclick = () => setDoc(doc(db, "content", "rooster"), { 
        zorgbad: document.getElementById('rooster-zorg').value, wedstrijdbad: document.getElementById('rooster-wed').value 
    }).then(() => alert("Rooster opgeslagen"));
}

// ==========================================
// B. DISPLAY LOGICA (Alleen op index.html)
// ==========================================
const displayAgenda = document.getElementById('agenda-content');
if (displayAgenda) {
    let activePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => { h += `<div class="agenda-item"><span class="date">${doc.data().datum}</span> <span>${doc.data().titel} - ${doc.data().onderwerp}</span></div>`; });
        displayAgenda.innerHTML = h;
    });

    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        const z = document.getElementById('rooster-zorgbad');
        const w = document.getElementById('rooster-wedstrijdbad');
        if (docSnap.exists()) {
            if(z) z.innerHTML = (docSnap.data().zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
            if(w) w.innerHTML = (docSnap.data().wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        }
    });

    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        const t = docSnap.data()?.tekst;
        const ann = document.getElementById('announcement-text');
        if (t && t.trim() !== "" && ann) {
            ann.innerText = t;
            if (!activePages.includes('page-announcement')) activePages.push('page-announcement');
        } else {
            activePages = activePages.filter(p => p !== 'page-announcement');
        }
    });

    onSnapshot(doc(db, "content", "instellingen"), (docSnap) => {
        const k = document.getElementById('klok-container');
        if(k) k.style.display = (docSnap.exists() && docSnap.data().toonKlok === false) ? 'none' : 'block';
    });

    setInterval(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        const next = document.getElementById(activePages[currentIndex]);
        if(next) next.classList.add('active');
    }, 15000);
}
