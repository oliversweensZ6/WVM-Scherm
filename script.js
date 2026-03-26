import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvb1RTOvNSMuRvIntSUPQKoI-mdPBlhcA",
  authDomain: "wvm-scherm.firebaseapp.com",
  projectId: "wvm-scherm",
  storageBucket: "wvm-scherm.firebasestorage.app",
  messagingSenderId: "916379881435",
  appId: "1:916379881435:web:8e1cc130766e460bdca1fe",
  measurementId: "G-Z6FES6DGSV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ADMIN LOGICA ---
if (document.getElementById('btn-save-agenda')) {
    const btn = document.getElementById('btn-save-agenda');
    btn.onclick = async () => {
        await addDoc(collection(db, "agenda"), {
            datum: document.getElementById('ag-datum').value,
            titel: document.getElementById('ag-titel').value,
            onderwerp: document.getElementById('ag-onderwerp').value,
            timestamp: Date.now()
        });
        alert("Toegevoegd!");
        location.reload();
    };
}

// --- DISPLAY LOGICA (INDEX) ---
if (document.getElementById('content-area')) {
    const contentArea = document.getElementById('content-area');
    
    // Luister live naar updates in de database
    onSnapshot(collection(db, "agenda"), (snapshot) => {
        let html = '<div class="agenda-grid">';
        snapshot.forEach((doc) => {
            const d = doc.data();
            html += `
                <div class="row">
                    <div class="col-date">${d.datum}</div>
                    <div class="col-text"><strong>${d.titel}</strong> - ${d.onderwerp}</div>
                </div>`;
        });
        html += '</div>';
        contentArea.innerHTML = html;
    });
}
