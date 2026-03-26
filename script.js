import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvb1RTOvNSMuRvIntSUPQKoI-mdPBlhcA",
  authDomain: "wvm-scherm.firebaseapp.com",
  databaseURL: "https://wvm-scherm-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wvm-scherm",
  storageBucket: "wvm-scherm.firebasestorage.app",
  messagingSenderId: "916379881435",
  appId: "1:916379881435:web:8e1cc130766e460bdca1fe",
  measurementId: "G-Z6FES6DGSV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ADMIN FUNCTIES ---
if (document.getElementById('btn-save-agenda')) {
    document.getElementById('btn-save-agenda').onclick = async () => {
        const rawDate = new Date(document.getElementById('ag-datum').value);
        const options = { day: 'numeric', month: 'short' };
        const datumStr = rawDate.toLocaleDateString('nl-NL', options).toUpperCase();

        await addDoc(collection(db, "agenda"), {
            datum: datumStr,
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            sortDate: rawDate
        });
        alert("Opgeslagen!");
    };

    document.getElementById('btn-save-mededeling').onclick = async () => {
        await setDoc(doc(db, "instellingen", "mededeling"), {
            tekst: document.getElementById('mededeling-tekst').value
        });
        alert("Mededeling bijgewerkt!");
    };
}

// --- DISPLAY FUNCTIES ---
if (document.getElementById('agenda-content')) {
    let pages = ['page-agenda', 'page-rooster'];
    let currentPageIndex = 0;

    // Haal Agenda op
    onSnapshot(query(collection(db, "agenda"), orderBy("sortDate")), (snapshot) => {
        let html = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            html += `<div class="agenda-item"><span class="date">${d.datum}</span> <span>${d.titel} - ${d.onderwerp}</span></div>`;
        });
        document.getElementById('agenda-content').innerHTML = html;
    });

    // Haal Mededeling op & check of pagina moet worden toegevoegd
    onSnapshot(doc(db, "instellingen", "mededeling"), (doc) => {
        const tekst = doc.data()?.tekst;
        if (tekst && tekst.trim() !== "") {
            document.getElementById('announcement-text').innerText = tekst;
            if (!pages.includes('page-announcement')) pages.push('page-announcement');
        } else {
            pages = pages.filter(p => p !== 'page-announcement');
        }
    });

    // Wissel-systeem
    setInterval(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentPageIndex = (currentPageIndex + 1) % pages.length;
        document.getElementById(pages[currentPageIndex]).classList.add('active');
    }, 10000); // Wisselt elke 15 seconden
}
