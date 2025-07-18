// manage-samples.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    get, 
    update, 
    onValue, 
    push, 
    remove, 
    // ✅ เพิ่ม child เข้ามาในรายการ import
    child 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase config (ต้องเหมือนกันทุกไฟล์)
// ... (ส่วนของ firebaseConfig ยังคงเดิม) ...
const firebaseConfig = {
    apiKey: "AIzaSyAa8YtOhh0IRHOxb0hJrAuEfbokabsPYqs",
    authDomain: "coffee-35446.firebaseapp.com",
    databaseURL: "https://coffee-35446-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "coffee-35446",
    storageBucket: "coffee-35446.firebasestorage.app",
    messagingSenderId: "1038338942121",
    appId: "1:1038338942121:web:29fa8f07cdff995f47b5b8",
    measurementId: "G-87PS6HD9N8",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const roomId = new URLSearchParams(window.location.search).get("roomId");
const roomNameDisplay = document.getElementById("roomNameDisplay");
const backToHostBtn = document.getElementById("backToHostBtn");
const sampleNumberInput = document.getElementById("sampleNumberInput");
const sampleDescriptionInput = document.getElementById("sampleDescriptionInput");
const addSampleBtn = document.getElementById("addSampleBtn");
const samplesList = document.getElementById("samplesList");
const noSamplesMessage = document.getElementById("noSamplesMessage");

// ⚠️ หมายเหตุ: ต้องแทนที่ UID นี้ด้วย UID ของผู้ดูแลระบบจริง (ซ้ำกับ host.js)
const ADMIN_UIDS = [
    "YMkUE69xF1f41E5QaMTiJVmU5BG2", 
];

// 1. โหลดชื่อห้องและแสดงผล
function loadRoomDetails(user) {
    if (!roomId) {
        alert("ไม่พบ Room ID");
        window.location.href = "host.html";
        return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const room = snapshot.val();
            roomNameDisplay.textContent = room.name;

            // ตรวจสอบสิทธิ์ (Host)
            if (user.uid !== room.hostUid && !ADMIN_UIDS.includes(user.uid)) {
                alert("คุณไม่มีสิทธิ์จัดการตัวอย่างในห้องนี้");
                window.location.href = "host.html";
            }
        } else {
            alert("ไม่พบห้องนี้");
            window.location.href = "host.html";
        }
    });
}

// 2. แสดงรายการตัวอย่างที่มีอยู่
function fetchSamples() {
    if (!roomId || !samplesList) return;

    const samplesRef = ref(db, `rooms/${roomId}/samples`);
    onValue(samplesRef, (snapshot) => {
        samplesList.innerHTML = ""; // ล้างรายการเดิม
        if (snapshot.exists()) {
            noSamplesMessage.classList.add("hidden");
            snapshot.forEach((childSnapshot) => {
                const sample = { id: childSnapshot.key, ...childSnapshot.val() };
                const li = document.createElement("li");
                li.className = "bg-white p-3 rounded shadow-sm flex justify-between items-center";
                li.innerHTML = `
                    <div>
                        <span class="font-semibold text-gray-800">ตัวอย่างที่ ${sample.number}</span>
                        ${sample.description ? `<p class="text-gray-600 text-sm">${sample.description}</p>` : ''}
                    </div>
                    <button data-sample-id="${sample.id}" class="delete-sample-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                        ลบ
                    </button>
                `;
                samplesList.appendChild(li);
            });

            // แนบ Event Listener สำหรับปุ่มลบ
            document.querySelectorAll(".delete-sample-btn").forEach((button) => {
                button.onclick = async (event) => {
                    const sampleIdToDelete = event.target.dataset.sampleId;
                    if (confirm("คุณแน่ใจหรือไม่ที่จะลบตัวอย่างนี้?")) {
                        await remove(ref(db, `rooms/${roomId}/samples/${sampleIdToDelete}`));
                        alert("ตัวอย่างถูกลบแล้ว");
                    }
                };
            });
        } else {
            noSamplesMessage.classList.remove("hidden");
        }
    });
}

// 3. เพิ่มตัวอย่างใหม่
if (addSampleBtn) {
    addSampleBtn.onclick = async () => {
        const number = parseInt(sampleNumberInput.value.trim()); // Parse as integer
        const description = sampleDescriptionInput.value.trim();

        if (isNaN(number) || number <= 0) { // Check for valid number
            alert("กรุณาใส่หมายเลขตัวอย่างที่เป็นตัวเลขและมากกว่า 0");
            return;
        }

        // ตรวจสอบว่าหมายเลขตัวอย่างนี้ถูกใช้ไปแล้วหรือยัง
        const samplesRef = ref(db, `rooms/${roomId}/samples`);
        const snapshot = await get(samplesRef);
        const samples = snapshot.val();
        let isDuplicate = false;

        if (samples) {
            for (const key in samples) {
                if (samples[key].number === number) {
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (isDuplicate) {
            alert(`หมายเลขตัวอย่าง ${number} มีอยู่แล้ว กรุณาใช้หมายเลขอื่น`);
            return;
        }

        // เพิ่มตัวอย่างใหม่
        await push(samplesRef, {
            number: number,
            description: description || null,
            createdAt: Date.now()
        });

        // เคลียร์ Input
        sampleNumberInput.value = "";
        sampleDescriptionInput.value = "";
    };
}

// 5. ปุ่มกลับสู่ Host Dashboard
if (backToHostBtn) {
    backToHostBtn.onclick = () => {
        window.location.href = "host.html";
    };
}

// 6. ตรวจสอบสถานะการล็อกอิน (สำหรับ Host)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ตรวจสอบว่าเป็น Host หรือ Admin
        const roomRef = ref(db, `rooms/${roomId}`);
        get(roomRef).then(snapshot => {
            if (snapshot.exists()) {
                const room = snapshot.val();
                if (user.uid === room.hostUid || ADMIN_UIDS.includes(user.uid)) {
                    loadRoomDetails(user);
                    fetchSamples();
                } else {
                    alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
                    window.location.href = "home.html"; // Redirect unauthorized users
                }
            } else {
                alert("ห้องไม่ถูกต้องหรือไม่พบ");
                window.location.href = "home.html"; // Redirect if room doesn't exist
            }
        }).catch(error => {
            console.error("Error checking room host:", error);
            alert("เกิดข้อผิดพลาดในการตรวจสอบห้อง");
            window.location.href = "home.html";
        });
    } else {
        alert("กรุณาเข้าสู่ระบบเพื่อเข้าถึงหน้านี้");
        window.location.href = "index.html";
    }
});