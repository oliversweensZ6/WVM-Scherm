import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- ADMIN LOGICA ---
if (document.getElementById('admin-agenda-list')) {
    
    // 1. Laat huidige agenda zien met verwijder-knoppen
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
        document.getElementById('admin-agenda-list').innerHTML = html || 'Geen items gevonden.';
        
        // Verwijder-knoppen laten werken
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => {
                if(confirm("Zeker weten?")) await deleteDoc(doc(db, "agenda", btn.dataset.id));
            };
        });
    });

    // 2. Haal bestaande Mededeling en Rooster op om te bewerken
    onSnapshot(doc(db, "content", "mededeling"), (d) => { if(d.exists()) document.getElementById('med-tekst').value = d.data().tekst; });
    onSnapshot(doc(db, "content", "rooster"), (d) => { 
        if(d.exists()) {
            document.getElementById('rooster-zorg').value = d.data().zorgbad;
            document.getElementById('rooster-wed').value = d.data().wedstrijdbad;
        }
    });

    // 3. Opslaan functies
    document.getElementById('btn-save-agenda').onclick = async () => {
        const d = new Date(document.getElementById('ag-datum').value);
        const datumStr = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).toUpperCase();
        await addDoc(collection(db, "agenda"), {
            datum: datumStr, titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value, timestamp: d.getTime()
        });
        alert("Toegevoegd!");
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

// --- DISPLAY LOGICA (Voor index.html) ---
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
            document.getElementById('rooster-zorgbad').innerHTML = data.zorgbad.split('\n').map(line => `<div class="rooster-item">${line}</div>`).join('');
            document.getElementById('rooster-wedstrijdbad').innerHTML = data.wedstrijdbad.split('\n').map(line => `<div class="rooster-item">${line}</div>`).join('');
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
        document.getElementById(activePages[currentIndex]).classList.add('active');
    }, 15000);
}
