// room.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  child,
  update,
  remove, // ตรวจสอบว่ามี remove ด้วย
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🧠 ใส่ config Firebase ของคุณตรงนี้
const firebaseConfig = {
  apiKey: "AIzaSyAa8YtOhh0IRHOxb0hJrAuEfbokabsPYqs",
  authDomain: "coffee-35446.firebaseapp.com",
  databaseURL:
    "https://coffee-35446-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "coffee-35446",
  storageBucket: "coffee-35446.firebasestorage.app",
  messagingSenderId: "1038338942121",
  appId: "1:1038338942121:web:29fa8f07cdff995f47b5b8",
  measurementId: "G-87PS6HD9N8",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// รับ roomId จาก URL - **บรรทัดนี้ถูกคอมเมนต์ไปแล้ว**
// const urlParams = new URLSearchParams(window.location.search);
// const roomId = urlParams.get("roomId");

// *** เปลี่ยนตรงนี้: ดึง roomId จาก localStorage แทน URL ***
const roomId = localStorage.getItem("currentRoomId");

// 🐛 DEBUGGING: เพิ่มบรรทัดนี้เพื่อตรวจสอบค่า roomId ใน Console
// console.log("Retrieved Room ID:", roomId); // ตัวเดิม
console.log("Room ID ที่ดึงได้จาก localStorage ใน room.js:", roomId); // ตัวใหม่

// 1. ตรวจสอบว่ามี roomId หรือไม่
if (!roomId) {
  alert("ไม่พบรหัสห้อง กรุณาเข้าสู่ห้องจากหน้าหลัก");
  window.location.href = "home.html";
} else {
  console.log("Room ID ที่ดึงได้จาก localStorage:", roomId);
  // ⚠️ ถ้าต้องการลบ roomId ออกจาก localStorage หลังจากใช้งานแล้ว
  // localStorage.removeItem("currentRoomId");
  // แต่ในกรณีนี้ ไม่ต้องลบก็ได้ เพื่อให้ room.js สามารถเข้าถึง roomId ได้ตลอดเวลาที่อยู่ในห้อง
}

// 2. Element References
const roomNameDisplay = document.getElementById("roomNameDisplay");
const roomStatusDisplay = document.getElementById("roomStatusDisplay");
const alreadyVotedMessage = document.getElementById("alreadyVotedMessage");
const sampleSelectionSection = document.getElementById(
  "sampleSelectionSection"
);
const sampleSelect = document.getElementById("sampleSelect");
const cuppingForm = document.getElementById("cuppingForm");
const submitVoteBtn = document.getElementById("submitVoteBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");
const backToHostBtn = document.getElementById("backToHostBtn");
const samplesList = document.getElementById("samplesList");
const loadingMessage = document.getElementById("loadingMessage");
const mainContent = document.getElementById("mainContent");

let roomRef = ref(db, `rooms/${roomId}`);
let votesRef = ref(db, `rooms/${roomId}/votes`);
let samplesRef = ref(db, `rooms/${roomId}/samples`);

// 3. ฟังก์ชันสำหรับจัดการการแสดงผลเมื่อโหลดเสร็จ
function showContent() {
  if (loadingMessage) {
    loadingMessage.classList.add("hidden");
  }
  if (mainContent) {
    mainContent.classList.remove("hidden");
  }
}

// ฟังก์ชันสำหรับแสดง samples ใน dropdown
 function loadSamples(roomId) {
    if (!roomId || !sampleSelect) return;
    
    // Show loading state
    sampleSelect.disabled = true;
    sampleSelect.innerHTML = '<option value="">กำลังโหลดตัวอย่าง...</option>';

    onValue(samplesRef, (snapshot) => {
        const samples = snapshot.val();
        sampleSelect.innerHTML = '<option value="">เลือกตัวอย่าง</option>';
        sampleSelect.disabled = false;

        if (samples) {
            const validSamples = Object.keys(samples)
                .filter(key => key !== 'placeholder')
                .map(key => ({ id: key, ...samples[key] }))
                .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));

            if (validSamples.length > 0) {
                validSamples.forEach(sample => {
                    const option = document.createElement('option');
                    option.value = sample.number;
                    option.textContent = `Sample #${sample.number}` + 
                        (sample.description ? ` (${sample.description})` : '');
                    sampleSelect.appendChild(option);
                });
            }
        }
    });
}

// ฟังก์ชันสำหรับส่งคะแนนโหวต
async function submitVote(e, user) {
    e.preventDefault();
    
    if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนโหวต");
        return;
    }

    const sampleNumber = document.getElementById('sampleNumber').value;
    if (!sampleNumber) {
        alert("กรุณาเลือกหมายเลขตัวอย่าง");
        return;
    }

    // Get all form values
    const voteData = {
        sampleNumber: sampleNumber,
        roastLevel: document.getElementById('roastLevel').value,
        // Add all other fields...
        timestamp: Date.now(),
        voterId: user.uid,
        voterName: user.displayName || user.email,
        voterEmail: user.email
    };

    try {
        // Push new vote to Firebase
        const newVoteRef = push(votesRef);
        await set(newVoteRef, voteData);
        
        alert("ส่งคะแนนสำเร็จ!");
        // Optional: Reset form or redirect
    } catch (error) {
        console.error("Error submitting vote:", error);
        alert("เกิดข้อผิดพลาดในการส่งคะแนน: " + error.message);
    }
}

// 5. ตรวจสอบสถานะการล็อกอิน
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed. User:", user);
  if (!user) {
    setTimeout(() => {
      if (!auth.currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = "index.html";
      }
    }, 1000);
    return;
  }

  // ✅ โหลดตัวอย่างเมื่อผู้ใช้ล็อกอิน
  loadSamples(roomId);

  // เรียกใช้ checkUserVoteStatus เมื่อมี roomId, user, และ sampleNumber (ถ้ามี)
  const currentSampleNumber = sampleSelect ? sampleSelect.value : null;
  if (currentSampleNumber) {
    checkUserVoteStatus(user, roomId, currentSampleNumber);
  }

  // เมื่อเลือก sample ใหม่ ให้ตรวจสอบสถานะการโหวตอีกครั้ง
  if (sampleSelect) {
    sampleSelect.addEventListener("change", (e) => {
      checkUserVoteStatus(user, roomId, e.target.value);
    });
  }

  // 6. ผูก submit event กับ cuppingForm
  if (cuppingForm) {
    cuppingForm.addEventListener("submit", (e) => submitVote(e, user));
  }
});

// 7. ปุ่มกลับหน้าหลัก/Dashboard
if (backToHomeBtn) {
  backToHomeBtn.onclick = () => {
    window.location.href = "home.html";
  };
}

if (backToHostBtn) {
  backToHostBtn.onclick = () => {
    window.location.href = "host.html";
  };
}
