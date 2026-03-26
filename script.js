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

// --- KLOK FUNCTIE ---
function startKlok() {
    const klokEl = document.getElementById('klok-container');
    if (klokEl) {
        setInterval(() => {
            const nu = new Date();
            klokEl.innerText = nu.toLocaleTimeString('nl-NL', { hour12: false });
        }, 1000);
    }
}
startKlok();

// --- ADMIN LOGICA ---
if (document.getElementById('login-form')) {
    const loginDiv = document.getElementById('login-form');
    const adminDiv = document.getElementById('admin-content');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginDiv.style.display = 'none';
            adminDiv.style.display = 'block';
            laadAdminData();
        } else {
            loginDiv.style.display = 'block';
            adminDiv.style.display = 'none';
        }
    });

    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (e) { alert("Inloggegevens incorrect"); }
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);

    function laadAdminData() {
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            let h = '';
            snap.forEach(d => {
                h += `<div class="admin-item"><span>${d.data().datum}: ${d.data().titel}</span>
                     <button class="btn-delete" data-id="${d.id}">X</button></div>`;
            });
            document.getElementById('admin-agenda-list').innerHTML = h;
            document.querySelectorAll('.btn-delete').forEach(b => b.onclick = () => deleteDoc(doc(db, "agenda", b.dataset.id)));
        });

        onSnapshot(doc(db, "content", "mededeling"), d => { if(d.exists()) document.getElementById('med-tekst').value = d.data().tekst; });
        onSnapshot(doc(db, "content", "rooster"), d => { 
            if(d.exists()) {
                document.getElementById('rooster-zorg').value = d.data().zorgbad;
                document.getElementById('rooster-wed').value = d.data().wedstrijdbad;
            }
        });
        onSnapshot(doc(db, "content", "instellingen"), d => { if(d.exists()) document.getElementById('klok-toggle').checked = d.data().toonKlok; });
    }

    document.getElementById('btn-save-agenda').onclick = async () => {
        const val = document.getElementById('ag-datum').value;
        if(!val) return alert("Datum verplicht");
        const d = new Date(val); d.setHours(0,0,0,0);
        await addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', {day:'numeric', month:'short'}).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        });
        document.getElementById('ag-titel').value = ""; document.getElementById('ag-onderwerp').value = "";
    };

    document.getElementById('btn-save-med').onclick = () => setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value });
    document.getElementById('btn-save-rooster').onclick = () => setDoc(doc(db, "content", "rooster"), { 
        zorgbad: document.getElementById('rooster-zorg').value, wedstrijdbad: document.getElementById('rooster-wed').value 
    });
    document.getElementById('btn-save-settings').onclick = () => setDoc(doc(db, "content", "instellingen"), { toonKlok: document.getElementById('klok-toggle').checked });
}

// --- DISPLAY LOGICA (index.html) ---
if (document.getElementById('agenda-content')) {
    let activePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => {
            const d = doc.data();
            h += `<div class="agenda-item"><span class="date">${d.datum}</span> <span>${d.titel} - ${d.onderwerp}</span></div>`;
        });
        document.getElementById('agenda-content').innerHTML = h;
    });

    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('rooster-zorgbad').innerHTML = (data.zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
            document.getElementById('rooster-wedstrijdbad').innerHTML = (data.wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        }
    });

    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        const tekst = docSnap.data()?.tekst;
        if (tekst && tekst.trim() !== "") {
            document.getElementById('announcement-text').innerText = tekst;
            if (!activePages.includes('page-announcement')) activePages.push('page-announcement');
        } else {
            activePages = activePages.filter(p => p !== 'page-announcement');
        }
    });

    onSnapshot(doc(db, "content", "instellingen"), (docSnap) => {
        const klok = document.getElementById('klok-container');
        if (docSnap.exists() && docSnap.data().toonKlok) klok.style.display = 'block';
        else klok.style.display = 'none';
    });

    setInterval(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        document.getElementById(activePages[currentIndex]).classList.add('active');
    }, 15000);
}
