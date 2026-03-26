import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ==========================================
// ADMIN LOGICA
// ==========================================
if (document.getElementById('admin-agenda-list')) {
    
    // EENVOUDIG WACHTWOORD CHECK
    const pass = prompt("Voer het beheer-wachtwoord in:");
    if (pass !== "WVM2024") { // PAS HIER JE WACHTWOORD AAN
        alert("Verkeerd wachtwoord. Je wordt teruggestuurd.");
        window.location.href = "index.html";
    }

    // Live Agenda
    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            html += `<div class="admin-item">
                        <span><strong>${d.datum}</strong>: ${d.titel}</span>
                        <button class="btn-delete" data-id="${docSnap.id}">Verwijder</button>
                    </div>`;
        });
        document.getElementById('admin-agenda-list').innerHTML = html || 'Geen items.';
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => { if(confirm("Verwijderen?")) await deleteDoc(doc(db, "agenda", btn.dataset.id)); };
        });
    });

    // Prefill Mededeling & Rooster
    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        if (docSnap.exists()) document.getElementById('med-tekst').value = docSnap.data().tekst;
    });
    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('rooster-zorg').value = docSnap.data().zorgbad;
            document.getElementById('rooster-wed').value = docSnap.data().wedstrijdbad;
        }
    });

    // Opslaan
    document.getElementById('btn-save-agenda').onclick = async () => {
        const dVal = document.getElementById('ag-datum').value;
        if(!dVal) return alert("Kies een datum");
        const d = new Date(dVal);
        await addDoc(collection(db, "agenda"), {
            datum: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).toUpperCase(),
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: d.getTime()
        });
        alert("Opgeslagen!");
    };

    document.getElementById('btn-save-med').onclick = async () => {
        await setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value });
        alert("Mededeling bijgewerkt!");
    };

    document.getElementById('btn-save-rooster').onclick = async () => {
        await setDoc(doc(db, "content", "rooster"), {
            zorgbad: document.getElementById('rooster-zorg').value,
            wedstrijdbad: document.getElementById('rooster-wed').value
        });
        alert("Rooster bijgewerkt!");
    };
}

// ==========================================
// SCHERM LOGICA
// ==========================================
if (document.getElementById('agenda-content')) {
    let activePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;

    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            html += `<div class="agenda-item"><span class="date">${data.datum}</span> <span>${data.titel} - ${data.onderwerp}</span></div>`;
        });
        document.getElementById('agenda-content').innerHTML = html;
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

    setInterval(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        const nextPage = document.getElementById(activePages[currentIndex]);
        if(nextPage) nextPage.classList.add('active');
    }, 15000);
}
