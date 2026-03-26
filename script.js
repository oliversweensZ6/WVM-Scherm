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

// Klokken
setInterval(() => {
    const t = new Date().toLocaleTimeString('nl-NL', { hour12: false });
    if(document.getElementById('klok-container')) document.getElementById('klok-container').innerText = t;
    if(document.getElementById('grote-klok-tijd')) document.getElementById('grote-klok-tijd').innerText = t;
}, 1000);

// --- ADMIN ---
if (document.getElementById('is-admin-page')) {
    onAuthStateChanged(auth, (user) => {
        document.getElementById('login-form').style.display = user ? 'none' : 'block';
        document.getElementById('admin-content').style.display = user ? 'block' : 'none';
        if(user) laadData();
    });

    document.getElementById('btn-login')?.addEventListener('click', () => signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-pass').value).catch(e => alert(e.message)));
    document.getElementById('btn-logout')?.addEventListener('click', () => signOut(auth));

    function laadData() {
        onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
            let h = '';
            snap.forEach(d => { h += `<div class="admin-item"><span>${d.data().datum}: ${d.data().titel}</span><button class="btn-del" data-id="${d.id}">X</button></div>`; });
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
        if(!val) return;
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

// --- TV ---
const displayAgenda = document.getElementById('agenda-content');
if (displayAgenda) {
    let basePages = ['page-agenda', 'page-rooster'], currentIndex = 0, config = {}, medTekst = "", rotTimer;

    function startRotatie(sec) {
        if(rotTimer) clearInterval(rotTimer);
        rotTimer = setInterval(() => {
            if(config.alleenGroteKlok) return;
            let rot = [...basePages];
            if(config.toonMededelingScherm && medTekst.trim() !== "") rot.push('page-announcement');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            currentIndex = (currentIndex + 1) % rot.length;
            if(document.getElementById(rot[currentIndex])) document.getElementById(rot[currentIndex]).classList.add('active');
        }, (sec || 15) * 1000);
    }

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let h = '';
        snap.forEach(doc => { h += `<div class="agenda-item"><span class="date">${doc.data().datum}</span> <span>${doc.data().titel} ${doc.data().onderwerp ? '- ' + doc.data().onderwerp : ''}</span></div>`; });
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
        document.getElementById('klok-container').style.display = config.toonKlokKleine ? 'block' : 'none';
        if(config.alleenGroteKlok) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-klok-groot').classList.add('active');
        } else if(oud !== config.intervalTijd) {
            startRotatie(config.intervalTijd);
        }
    });

    startRotatie(15);
}
