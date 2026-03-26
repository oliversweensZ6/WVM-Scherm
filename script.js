import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvb1RTOvNSMuRvIntSUPQKoI-mdPBlhcA",
  authDomain: "wvm-scherm.firebaseapp.com",
  databaseURL: "https://wvm-scherm-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wvm-scherm",
  storageBucket: "wvm-scherm.firebasestorage.app",
  messagingSenderId: "916379881435",
  appId: "1:916379881435:web:8e1cc130766e460bdca1fe"
  measurementId: "G-Z6FES6DGSV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ADMIN LOGICA ---
if (document.getElementById('admin-agenda-list')) {
    console.log("Admin paneel gedetecteerd. Verbinding maken...");

    // 1. LIVE AGENDA LIJST OPHALEN
    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            html += `
                <div class="admin-item">
                    <span><strong>${d.datum}</strong>: ${d.titel}</span>
                    <button class="btn-delete" data-id="${docSnap.id}">Verwijder</button>
                </div>`;
        });
        document.getElementById('admin-agenda-list').innerHTML = html || 'Geen items in de agenda.';
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => {
                if(confirm("Verwijderen?")) await deleteDoc(doc(db, "agenda", btn.dataset.id));
            };
        });
    }, (error) => {
        console.error("Fout bij agenda laden: ", error);
        document.getElementById('admin-agenda-list').innerHTML = "Fout bij laden. Check console (F12).";
    });

    // 2. LIVE MEDEDELING OPHALEN (Prefill)
    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('med-tekst').value = docSnap.data().tekst;
            console.log("Mededeling geladen");
        }
    }, (error) => console.error("Fout bij mededeling: ", error));

    // 3. LIVE ROOSTER OPHALEN (Prefill)
    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        if (docSnap.exists()) {
            document.getElementById('rooster-zorg').value = docSnap.data().zorgbad;
            document.getElementById('rooster-wed').value = docSnap.data().wedstrijdbad;
            console.log("Rooster geladen");
        }
    }, (error) => console.error("Fout bij rooster: ", error));

    // 4. OPSLAAN ACTIES
    document.getElementById('btn-save-agenda').onclick = async () => {
        const dInput = document.getElementById('ag-datum').value;
        if(!dInput) return alert("Kies een datum");
        const d = new Date(dInput);
        const datumStr = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).toUpperCase();
        
        await addDoc(collection(db, "agenda"), {
            datum: datumStr, titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value, timestamp: d.getTime()
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

// --- DISPLAY LOGICA (index.html) ---
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
            document.getElementById('rooster-zorgbad').innerHTML = (data.zorgbad || "").split('\n').map(line => `<div class="rooster-item">${line}</div>`).join('');
            document.getElementById('rooster-wedstrijdbad').innerHTML = (data.wedstrijdbad || "").split('\n').map(line => `<div class="rooster-item">${line}</div>`).join('');
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
        const pages = document.querySelectorAll('.page');
        if (pages.length === 0) return;
        pages.forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        const nextPage = document.getElementById(activePages[currentIndex]);
        if (nextPage) nextPage.classList.add('active');
    }, 15000);
}
