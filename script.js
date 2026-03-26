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
// DEEL 1: ADMIN LOGICA (Alleen voor admin.html)
// ==========================================
const agendaList = document.getElementById('admin-agenda-list');

if (agendaList) {
    console.log("Beheerpaneel actief...");

    // 1. Live Agenda Lijst laden
    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            html += `<div class="admin-item">
                        <span><strong>${d.datum}</strong>: ${d.titel}</span>
                        <button class="btn-delete" data-id="${docSnap.id}">Verwijder</button>
                    </div>`;
        });
        agendaList.innerHTML = html || 'Geen items in agenda.';
        
        // Verwijder-knoppen activeren
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = async () => {
                if(confirm("Verwijderen?")) await deleteDoc(doc(db, "agenda", btn.dataset.id));
            };
        });
    });

    // 2. Mededeling & Rooster ophalen (voor in de vakken)
    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        const field = document.getElementById('med-tekst');
        if (docSnap.exists() && field) field.value = docSnap.data().tekst;
    });

    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        const zorgField = document.getElementById('rooster-zorg');
        const wedField = document.getElementById('rooster-wed');
        if (docSnap.exists()) {
            if(zorgField) zorgField.value = docSnap.data().zorgbad;
            if(wedField) wedField.value = docSnap.data().wedstrijdbad;
        }
    });

    // 3. Opslaan knoppen (Beveiligd tegen fouten)
    const btnAg = document.getElementById('btn-save-agenda');
    if(btnAg) btnAg.onclick = async () => {
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

    const btnMed = document.getElementById('btn-save-med');
    if(btnMed) btnMed.onclick = async () => {
        await setDoc(doc(db, "content", "mededeling"), { tekst: document.getElementById('med-tekst').value });
        alert("Mededeling bijgewerkt!");
    };

    const btnRoos = document.getElementById('btn-save-rooster');
    if(btnRoos) btnRoos.onclick = async () => {
        await setDoc(doc(db, "content", "rooster"), {
            zorgbad: document.getElementById('rooster-zorg').value,
            wedstrijdbad: document.getElementById('rooster-wed').value
        });
        alert("Rooster bijgewerkt!");
    };
}

// ==========================================
// DEEL 2: SCHERM LOGICA (Alleen voor index.html)
// ==========================================
const screenAgenda = document.getElementById('agenda-content');

if (screenAgenda) {
    console.log("Informatiescherm actief...");
    let activePages = ['page-agenda', 'page-rooster'];
    let currentIndex = 0;

    // Agenda tonen
    onSnapshot(query(collection(db, "agenda"), orderBy("timestamp", "asc")), (snap) => {
        let html = '';
        snap.forEach(doc => {
            const data = doc.data();
            html += `<div class="agenda-item"><span class="date">${data.datum}</span> <span>${data.titel} - ${data.onderwerp}</span></div>`;
        });
        screenAgenda.innerHTML = html;
    });

    // Rooster tonen
    onSnapshot(doc(db, "content", "rooster"), (docSnap) => {
        const zBad = document.getElementById('rooster-zorgbad');
        const wBad = document.getElementById('rooster-wedstrijdbad');
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(zBad) zBad.innerHTML = (data.zorgbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
            if(wBad) wBad.innerHTML = (data.wedstrijdbad || "").split('\n').map(l => `<div class="rooster-item">${l}</div>`).join('');
        }
    });

    // Mededeling tonen & Pagina-wissel check
    onSnapshot(doc(db, "content", "mededeling"), (docSnap) => {
        const tekst = docSnap.data()?.tekst;
        const annText = document.getElementById('announcement-text');
        if (tekst && tekst.trim() !== "") {
            if(annText) annText.innerText = tekst;
            if (!activePages.includes('page-announcement')) activePages.push('page-announcement');
        } else {
            activePages = activePages.filter(p => p !== 'page-announcement');
        }
    });

    // Het wisselen van de pagina's
    setInterval(() => {
        const allPages = document.querySelectorAll('.page');
        if(allPages.length === 0) return;

        allPages.forEach(p => p.classList.remove('active'));
        currentIndex = (currentIndex + 1) % activePages.length;
        
        const nextPage = document.getElementById(activePages[currentIndex]);
        if(nextPage) nextPage.classList.add('active');
    }, 15000);
}
