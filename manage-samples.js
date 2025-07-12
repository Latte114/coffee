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
    measurementId: "G-87PS6HD9N8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// รับ roomId จาก URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');

// Element references
const roomNameDisplay = document.getElementById('roomNameDisplay');
const samplesList = document.getElementById('samplesList');
const sampleNumberInput = document.getElementById('sampleNumberInput');
const sampleDescriptionInput = document.getElementById('sampleDescriptionInput');
const addSampleBtn = document.getElementById('addSampleBtn');
const backToHostBtn = document.getElementById('backToHostBtn');

let roomRef;
let samplesRef;

// 1. ตรวจสอบว่ามี roomId หรือไม่
if (!roomId) {
    alert("ไม่พบ Room ID กรุณากลับสู่หน้าหลัก");
    window.location.href = "host.html";
} else {
    roomRef = ref(db, `rooms/${roomId}`);
    samplesRef = ref(db, `rooms/${roomId}/samples`);
    
    // โหลดข้อมูลห้องและตัวอย่าง
    loadRoomDetails();
    loadSamples();
}

// 2. โหลดรายละเอียดห้อง
function loadRoomDetails() {
    onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        if (roomData) {
            roomNameDisplay.textContent = roomData.name;
        } else {
            roomNameDisplay.textContent = "ห้องนี้ไม่มีอยู่แล้ว";
            samplesList.innerHTML = "<p>ไม่พบห้องนี้ในระบบ</p>";
        }
    });
}

// 3. โหลดและแสดงรายการตัวอย่าง
function loadSamples() {
    // ฟังการเปลี่ยนแปลงของ samples แบบเรียลไทม์
    onValue(samplesRef, (snapshot) => {
        samplesList.innerHTML = "";
        const samples = snapshot.val();

        if (samples) {
            const sampleKeys = Object.keys(samples);
            
            // กรอง placeholder ออกก่อน และเรียงตามหมายเลขตัวอย่าง
            const validSamples = sampleKeys
                .filter(key => key !== 'placeholder')
                .map(key => ({ id: key, ...samples[key] }))
                .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));

            if (validSamples.length === 0) {
                samplesList.innerHTML = "<p class='text-gray-500'>ยังไม่มีตัวอย่างในห้องนี้</p>";
                return;
            }

            validSamples.forEach(sample => {
                const sampleElement = document.createElement('div');
                sampleElement.className = "bg-gray-100 p-4 rounded-lg flex justify-between items-center";
                sampleElement.innerHTML = `
                    <div>
                        <strong class="text-lg text-gray-800">ตัวอย่าง #${sample.number}</strong>
                        ${sample.description ? `<p class="text-gray-600">${sample.description}</p>` : ''}
                    </div>
                    <button 
                        data-sample-id="${sample.id}" 
                        class="remove-sample-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                        ลบ
                    </button>
                `;
                samplesList.appendChild(sampleElement);
            });

            // เพิ่ม Event Listener สำหรับปุ่มลบ
            document.querySelectorAll('.remove-sample-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const sampleId = e.target.getAttribute('data-sample-id');
                    if (confirm("คุณแน่ใจหรือไม่ที่จะลบตัวอย่างนี้?")) {
                        // ✅ ใช้ child() เพื่อสร้าง Reference ไปยังตัวอย่างที่ต้องการลบ
                        await remove(child(samplesRef, sampleId)); 
                    }
                });
            });

        } else {
            samplesList.innerHTML = "<p class='text-gray-500'>ยังไม่มีตัวอย่างในห้องนี้</p>";
        }
    });
}

// 4. เพิ่มตัวอย่างใหม่
if (addSampleBtn) {
    addSampleBtn.onclick = async () => {
        const number = sampleNumberInput.value.trim();
        const description = sampleDescriptionInput.value.trim();

        if (!number) {
            alert("กรุณาใส่หมายเลขตัวอย่าง");
            return;
        }

        // ตรวจสอบว่าหมายเลขตัวอย่างนี้ถูกใช้ไปแล้วหรือยัง
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
    if (!user) {
        alert("กรุณาเข้าสู่ระบบ Host Dashboard ก่อนใช้งาน");
        window.location.href = "index.html"; 
    }
    // TODO: อาจเพิ่มการตรวจสอบว่าเป็น Host หรือ Admin ที่ได้รับอนุญาตหรือไม่
});