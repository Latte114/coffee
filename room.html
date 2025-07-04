import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, child, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const auth = getAuth();
const db = getDatabase(app);

const roomId = new URLSearchParams(window.location.search).get("roomId");
const roomNameEl = document.getElementById("roomName");
const voteForm = document.getElementById("voteForm");
const statusMsg = document.getElementById("statusMsg");
const statusContainer = document.getElementById('statusContainer');
const backHomeBtn = document.getElementById('backHomeBtn');

// DOM elements for new fields
const sampleNoInput = document.getElementById('sampleNo');
const roastLevelInput = document.getElementById('roastLevel');

const fragranceIntensityInput = document.getElementById('fragranceIntensity');
const aromaIntensityInput = document.getElementById('aromaIntensity');
const flavorIntensityInput = document.getElementById('flavorIntensity');
const aftertasteIntensityInput = document.getElementById('aftertasteIntensity');
const acidityIntensityInput = document.getElementById('acidityIntensity');
const sweetnessIntensityInput = document.getElementById('sweetnessIntensity');
const bodyIntensityInput = document.getElementById('bodyIntensity');
const mouthfeelIntensityInput = document.getElementById('mouthfeelIntensity');

const fragranceNotesInput = document.getElementById('fragranceNotes');
const aromaNotesInput = document.getElementById('aromaNotes');
const flavorNotesInput = document.getElementById('flavorNotes');
const aftertasteNotesInput = document.getElementById('aftertasteNotes');
const acidityNotesInput = document.getElementById('acidityNotes');
const sweetnessNotesInput = document.getElementById('sweetnessNotes');
const bodyNotesInput = document.getElementById('bodyNotes');
const mouthfeelNotesInput = document.getElementById('mouthfeelNotes');

const submitButton = voteForm.querySelector('button[type="submit"]'); // อ้างอิงปุ่ม Submit

// Helper to get checked values from a checkbox group
function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

// Helper to set checkboxes based on an array of values
function setCheckboxes(name, values) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    checkboxes.forEach(cb => {
        cb.checked = values.includes(cb.value);
    });
}

// ✅ ฟังก์ชันใหม่: สำหรับเติมข้อมูลลงในฟอร์ม
function populateForm(data) {
    sampleNoInput.value = data.sampleNo || '';
    roastLevelInput.value = data.roastLevel || '';

    // Intensities
    fragranceIntensityInput.value = data.fragrance?.intensity ?? 7; // ใช้ ?? เพื่อให้ค่าเริ่มต้นถ้าเป็น null/undefined
    aromaIntensityInput.value = data.aroma?.intensity ?? 7;
    flavorIntensityInput.value = data.flavor?.intensity ?? 7;
    aftertasteIntensityInput.value = data.aftertaste?.intensity ?? 7;
    acidityIntensityInput.value = data.acidity?.intensity ?? 7;
    sweetnessIntensityInput.value = data.sweetness?.intensity ?? 7;
    bodyIntensityInput.value = data.body?.intensity ?? 7;
    mouthfeelIntensityInput.value = data.mouthfeel?.intensity ?? 7;

    // Descriptors (Checkboxes)
    setCheckboxes('fragranceDescriptor', data.fragrance?.descriptors || []);
    setCheckboxes('aromaDescriptor', data.aroma?.descriptors || []);
    setCheckboxes('flavorDescriptor', data.flavor?.descriptors || []);
    setCheckboxes('aftertasteDescriptor', data.aftertaste?.descriptors || []);
    setCheckboxes('mainTaste', data.mainTastes || []);
    setCheckboxes('mouthfeelDescriptor', data.mouthfeel?.descriptors || []);

    // Notes
    fragranceNotesInput.value = data.fragrance?.notes || '';
    aromaNotesInput.value = data.aroma?.notes || '';
    flavorNotesInput.value = data.flavor?.notes || '';
    aftertasteNotesInput.value = data.aftertaste?.notes || '';
    acidityNotesInput.value = data.acidity?.notes || '';
    sweetnessNotesInput.value = data.sweetness?.notes || '';
    bodyNotesInput.value = data.body?.notes || '';
    mouthfeelNotesInput.value = data.mouthfeel?.notes || '';
}

// ซ่อนคอนเทนเนอร์สถานะในตอนเริ่มต้น
statusContainer.style.display = "none";

// กำหนด Listener สำหรับปุ่มกลับหน้าหลัก
backHomeBtn.onclick = () => {
    window.location.href = "home.html";
};

// ห่อหุ้ม Logic หลักทั้งหมดในฟังก์ชัน async
async function initializeRoomVoting() {
    if (!roomId) {
        roomNameEl.textContent = "❌ ไม่พบรหัสห้อง";
        statusMsg.textContent = "กรุณาลองเข้าห้องโหวตใหม่อีกครั้ง";
        statusContainer.style.display = "block";
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("กรุณา Login ก่อนเข้าโหวต");
            window.location.href = "index.html";
            return;
        }

        // โหลดข้อมูลห้อง
        const roomSnap = await get(child(ref(db), `rooms/${roomId}`));
        if (!roomSnap.exists()) {
            roomNameEl.textContent = "❌ ไม่พบห้องนี้";
            statusMsg.textContent = "ห้องที่คุณพยายามเข้าร่วมไม่มีอยู่แล้ว";
            statusContainer.style.display = "block";
            return;
        }

        const roomData = roomSnap.val();
        roomNameEl.textContent = `🧪 โหวตห้อง: ${roomData.name}`;

        // ✅ ตรวจสอบสถานะห้องก่อน
        if (roomData.status === "closed") {
            statusMsg.textContent = "❌ ห้องนี้ถูกปิดแล้ว ไม่สามารถโหวตหรือแก้ไขคะแนนได้";
            statusContainer.style.display = "block";
            voteForm.style.display = "none"; // ต้องแน่ใจว่าฟอร์มซ่อนอยู่
            return;
        }

        // เช็คว่าเคยโหวตแล้วหรือยัง
        const voteRef = child(ref(db), `rooms/${roomId}/votes/${user.uid}`);
        const voteSnap = await get(voteRef);

        if (voteSnap.exists()) {
            // ✅ ผู้ใช้เคยโหวตแล้ว: โหลดข้อมูลและแสดงในฟอร์ม
            const existingVoteData = voteSnap.val();
            populateForm(existingVoteData);
            submitButton.textContent = 'อัปเดตคะแนน'; // เปลี่ยนข้อความปุ่ม
            statusMsg.textContent = "✅ คุณได้โหวตไปแล้ว (สามารถแก้ไขคะแนนได้)";
            statusContainer.style.display = "block"; // แสดงข้อความสถานะ
            voteForm.style.display = "block";      // แสดงฟอร์มที่กรอกข้อมูลไว้แล้ว

        } else {
            // ✅ ผู้ใช้ยังไม่เคยโหวต: แสดงฟอร์มเปล่า
            submitButton.textContent = 'ส่งคะแนน'; // ตั้งข้อความปุ่มเป็น 'ส่งคะแนน'
            voteForm.style.display = "block";      // แสดงฟอร์มเปล่า
            // statusMsg จะไม่แสดงในกรณีนี้ เพราะยังไม่มีสถานะให้แจ้ง
        }

        voteForm.onsubmit = async (e) => {
            e.preventDefault();

            const voteData = {
                sampleNo: sampleNoInput.value.trim(),
                roastLevel: roastLevelInput.value.trim(),
                fragrance: {
                    intensity: parseInt(fragranceIntensityInput.value, 10),
                    descriptors: getCheckedValues('fragranceDescriptor'),
                    notes: fragranceNotesInput.value.trim()
                },
                aroma: {
                    intensity: parseInt(aromaIntensityInput.value, 10),
                    descriptors: getCheckedValues('aromaDescriptor'),
                    notes: aromaNotesInput.value.trim()
                },
                flavor: {
                    intensity: parseInt(flavorIntensityInput.value, 10),
                    descriptors: getCheckedValues('flavorDescriptor'),
                    notes: flavorNotesInput.value.trim()
                },
                aftertaste: {
                    intensity: parseInt(aftertasteIntensityInput.value, 10),
                    descriptors: getCheckedValues('aftertasteDescriptor'),
                    notes: aftertasteNotesInput.value.trim()
                },
                mainTastes: getCheckedValues('mainTaste'),
                acidity: {
                    intensity: parseInt(acidityIntensityInput.value, 10),
                    notes: acidityNotesInput.value.trim()
                },
                sweetness: {
                    intensity: parseInt(sweetnessIntensityInput.value, 10),
                    notes: sweetnessNotesInput.value.trim()
                },
                body: {
                    intensity: parseInt(bodyIntensityInput.value, 10),
                    notes: bodyNotesInput.value.trim()
                },
                mouthfeel: {
                    intensity: parseInt(mouthfeelIntensityInput.value, 10),
                    descriptors: getCheckedValues('mouthfeelDescriptor'),
                    notes: mouthfeelNotesInput.value.trim()
                },
                timestamp: new Date().toISOString(), // อัปเดต timestamp ใหม่ทุกครั้งที่ส่ง
                voterUID: user.uid,
                voterName: user.displayName || user.email,
            };

            try {
                await set(voteRef, voteData); // การใช้ set จะเขียนทับข้อมูลเดิม
                statusMsg.textContent = "✅ ส่ง/อัปเดตคะแนนสำเร็จ! ขอบคุณที่เข้าร่วม";
                voteForm.style.display = "none";
                statusContainer.style.display = "block";

                setTimeout(() => {
                    window.location.href = "home.html";
                }, 2000);

            } catch (error) {
                console.error("Error submitting vote:", error);
                statusMsg.textContent = `❌ เกิดข้อผิดพลาดในการส่ง/อัปเดตคะแนน: ${error.message}`;
                statusContainer.style.display = "block";
            }
        };
    });
}

// เรียกใช้ฟังก์ชันหลักเมื่อสคริปต์โหลดเสร็จ
initializeRoomVoting();
