import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    const t = new Date().toLocaleTimeString('nl-NL', { hour12: false });
    const kK = document.getElementById('klok-container');
    const kG = document.getElementById('grote-klok-tijd');
    if (kK) kK.innerText = t;
    if (kG) kG.innerText = t;
}, 1000);

// --- 1. ADMIN LOGICA ---
if (document.getElementById('is-admin-page')) {
    onAuthStateChanged(auth, (user) => {
        const loginDiv = document.getElementById('login-form');
        const adminDiv = document.getElementById('admin-content');
        if (user) {
            loginDiv.style.display = 'none';
            adminDiv.style.display = 'block';
            laadAdminData();
        } else {
            loginDiv.style.display = 'block';
            adminDiv.style.display = 'none';
        }
    });

    document.getElementById('btn-login')?.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(e => alert("Inlog fout"));
    });
    document.getElementById('btn-logout')?.addEventListener('click', () => signOut(auth));

    function laadAdminData() {
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            let h = '';
            snap.forEach(d => { 
                const data = d.data();
                h += `<div class="admin-item"><span>${data.datum}: ${data.titel}</span><button class="btn-del" data-id="${d.id}">X</button></div>`; 
            });
            document.getElementById('admin-agenda-list').innerHTML = h;
            document.querySelectorAll('.btn-del').forEach(b => b.onclick = () => deleteDoc(doc(db, "agenda", b.dataset.id)));
        });

        onSnapshot(doc(db, "content", "mededeling"), d => { if(d.exists()) document.getElementById('med-tekst').value = d.data().tekst; });
        onSnapshot(doc(db, "content", "rooster"), d => { if(d.exists()) { document.getElementById('rooster-zorg').value = d.data().zorgbad; document.getElementById('rooster-wed').value = d.data().wedstrijdbad; }});
        onSnapshot(doc(db, "content", "instellingen"), d => { 
            if(d.exists()) {
                const config = d.data();
                document.getElementById('klok-switch').checked = config.toonKlokKleine || false;
                document.getElementById('groot-klok-mode-switch').checked = config.alleenGroteKlok || false;
                document.getElementById('med-switch').checked = config.toonMededelingScherm || false;
                document.getElementById('interval-tijd').value = config.intervalTijd || 15;
            }
        });
    }

    document.getElementById('klok-switch')?.addEventListener('change', (e) => setDoc(doc(db, "content", "instellingen"), { toonKlokKleine: e.target.checked }, { merge: true }));
    document.getElementById('med-switch')?.addEventListener('change', (e) => setDoc(doc(db, "content", "instellingen"), { toonMededelingScherm: e.target.checked }, { merge: true }));
    document.getElementById('btn-save-interval')?.addEventListener('click', () => setDoc(doc(db, "content", "instellingen"), { intervalTijd: parseInt(document.getElementById('interval-tijd').value) }, { merge: true }).then(() => alert("Opgeslagen")));

    document.getElementById('groot-klok-mode-switch')?.addEventListener('change', async (e) => {
        const isAan = e.target.checked;
        const ref = doc(db, "content", "instellingen");
        const snap = await getDoc(ref);
        const data = snap.data() || {};
        if(isAan) await setDoc(ref, { alleenGroteKlok: true, toonKlokKleineBackup: data.toonKlokKleine || false, toonKlokKleine: false }, { merge: true });
        else await setDoc(ref, { alleenGroteKlok: false, toonKlokKleine: data.toonKlokKleineBackup || false }, { merge: true });
    });

    document.getElementById('btn-save-agenda')?.addEventListener('click', () => {
        const val = document.getElementById('ag-datum').value;
        if(!val) return alert("Selecteer datum");
        const d = new Date(val); d.setHours(0,0,0,0);
        addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', {day:'numeric', month:'long'}).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        }).then(() => { document.getElementById('ag-titel').value = ""; document.getElementById('ag-onderwerp').value = ""; });
    });

    document.getElementById('btn-save-med')?.addEventListener('click', () => setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value }).then(() => alert("Opgeslagen")));
    document.getElementById('btn-save-rooster')?.addEventListener('click', () => setDoc(doc(db, "content", "rooster"), { zorgbad: document.getElementById('rooster-zorg').value, wedstrijdbad: document.getElementById('rooster-wed').value }).then(() => alert("Opgeslagen")));
}

// --- 2. TV LOGICA ---
const displayAgenda = document.getElementById('agenda-content');
if (displayAgenda) {
    let basePages = ['page-agenda', 'page-rooster'], currentIndex = 0, config = {}, medTekst = "", rotTimer;

    function startRotatie(sec) {
        if(rotTimer) clearInterval(rotTimer);
        const dwellTime = (sec || 15) * 1000;
        
        rotTimer = setInterval(() => {
            if(config.alleenGroteKlok) return;
            
            let rot = [...basePages];
            if(config.toonMededelingScherm && medTekst.trim() !== "") rot.push('page-announcement');
            
            // Verwijder active klasse van alle pagina's
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            // Bereken volgende pagina
            currentIndex = (currentIndex + 1) % rot.length;
            const next = document.getElementById(rot[currentIndex]);
            
            // CSS handelt de fade-in van 1.5s nu automatisch af
            if(next) next.classList.add('active');
            
        }, dwellTime);
    }

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => { 
            const d = doc.data();
            h += `<div class="agenda-item"><span class="date">${d.datum}</span> <span>${d.titel} ${d.onderwerp ? '- ' + d.onderwerp : ''}</span></div>`; 
        });
        displayAgenda.innerHTML = h;
    });

    onSnapshot(doc(db, "content", "rooster"), d => { if(d.exists()) {
        document.getElementById('rooster-zorgbad').innerHTML = (d.data().zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        document.getElementById('rooster-wedstrijdbad').innerHTML = (d.data().wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
    }});

    onSnapshot(doc(db, "content", "mededeling"), d => { medTekst = d.data()?.tekst || ""; document.getElementById('announcement-text').innerText = medTekst; });

    onSnapshot(doc(db, "content", "instellingen"), d => {
        const oud = config.intervalTijd;
        config = d.data() || {};
        const klokContainer = document.getElementById('klok-container');
        if(klokContainer) klokContainer.style.display = config.toonKlokKleine ? 'block' : 'none';
        
        if(config.alleenGroteKlok) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-klok-groot').classList.add('active');
        } else if(oud !== config.intervalTijd) {
            startRotatie(config.intervalTijd);
        }
    });

    startRotatie(15);
}
