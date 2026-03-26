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

// Klokken updaten
setInterval(() => {
    const tijd = new Date().toLocaleTimeString('nl-NL', { hour12: false });
    const elKleine = document.getElementById('klok-container');
    const elGrote = document.getElementById('grote-klok-tijd');
    if (elKleine) elKleine.innerText = tijd;
    if (elGrote) elGrote.innerText = tijd;
}, 1000);

// --- 1. ADMIN LOGICA ---
if (document.getElementById('is-admin-page')) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            laadData();
        } else {
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('admin-content').style.display = 'none';
        }
    });

    document.getElementById('btn-login')?.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(e => alert("Fout: " + e.message));
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => signOut(auth));

    function laadData() {
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            let h = '';
            snap.forEach(d => { h += `<div class="admin-item"><span>${d.data().datum}</span><button class="btn-del" data-id="${d.id}">X</button></div>`; });
            document.getElementById('admin-agenda-list').innerHTML = h;
            document.querySelectorAll('.btn-del').forEach(b => b.onclick = () => deleteDoc(doc(db, "agenda", b.dataset.id)));
        });

        onSnapshot(doc(db, "content", "mededeling"), d => { if(d.exists()) document.getElementById('med-tekst').value = d.data().tekst; });
        onSnapshot(doc(db, "content", "rooster"), d => { 
            if(d.exists()) {
                document.getElementById('rooster-zorg').value = d.data().zorgbad;
                document.getElementById('rooster-wed').value = d.data().wedstrijdbad;
            }
        });
        onSnapshot(doc(db, "content", "instellingen"), d => { 
            if(d.exists()) {
                document.getElementById('klok-switch').checked = d.data().toonKlokKleine || false;
                document.getElementById('groot-klok-mode-switch').checked = d.data().alleenGroteKlok || false;
                document.getElementById('med-switch').checked = d.data().toonMededelingScherm || false;
            }
        });
    }

    // Switches direct opslaan
    document.getElementById('klok-switch')?.addEventListener('change', (e) => setDoc(doc(db, "content", "instellingen"), { toonKlokKleine: e.target.checked }, { merge: true }));
    document.getElementById('groot-klok-mode-switch')?.addEventListener('change', (e) => setDoc(doc(db, "content", "instellingen"), { alleenGroteKlok: e.target.checked }, { merge: true }));
    document.getElementById('med-switch')?.addEventListener('change', (e) => setDoc(doc(db, "content", "instellingen"), { toonMededelingScherm: e.target.checked }, { merge: true }));

    document.getElementById('btn-save-agenda')?.addEventListener('click', () => {
        const val = document.getElementById('ag-datum').value;
        if(!val) return;
        const d = new Date(val); d.setHours(0,0,0,0);
        addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', {day:'numeric', month:'long'}).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        }).then(() => {
            document.getElementById('ag-titel').value = "";
            document.getElementById('ag-onderwerp').value = "";
        });
    });

    document.getElementById('btn-save-med')?.addEventListener('click', () => setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value }).then(() => alert("Tekst opgeslagen")));
    document.getElementById('btn-save-rooster')?.addEventListener('click', () => setDoc(doc(db, "content", "rooster"), { zorgbad: document.getElementById('rooster-zorg').value, wedstrijdbad: document.getElementById('rooster-wed').value }).then(() => alert("Rooster opgeslagen")));
}

// --- 2. TV LOGICA ---
const displayAgenda = document.getElementById('agenda-content');
if (displayAgenda) {
    let basePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;
    let config = {};
    let medTekst = "";

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => { h += `<div class="agenda-item"><span class="date">${doc.data().datum}</span> <span>${doc.data().titel}</span></div>`; });
        displayAgenda.innerHTML = h;
    });

    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('rooster-zorgbad').innerHTML = (docSnap.data().zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
            document.getElementById('rooster-wedstrijdbad').innerHTML = (docSnap.data().wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        }
    });

    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => { 
        medTekst = docSnap.data()?.tekst || "";
        document.getElementById('announcement-text').innerText = medTekst;
    });

    onSnapshot(doc(db, "content", "instellingen"), (docSnap) => {
        config = docSnap.data() || {};
        document.getElementById('klok-container').style.display = config.toonKlokKleine ? 'block' : 'none';
        
        // Als Grote Klok Modus aan staat, forceer die pagina direct
        if (config.alleenGroteKlok) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-klok-groot').classList.add('active');
        }
    });

    // Rotatie Systeem
    setInterval(() => {
        if (config.alleenGroteKlok) return; // Stop rotatie als klok-modus aan staat

        let rotation = [...basePages];
        if (config.toonMededelingScherm && medTekst.trim() !== "") rotation.push('page-announcement');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % rotation.length;
        const next = document.getElementById(rotation[currentIndex]);
        if(next) next.classList.add('active');
    }, 15000);
}
