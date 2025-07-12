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

// รับ roomId จาก URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");

// 1. ตรวจสอบว่ามี roomId หรือไม่
if (!roomId) {
  alert("ไม่พบรหัสห้อง กรุณาเข้าสู่ห้องจากหน้าหลัก");
  window.location.href = "home.html";
}

// 2. Element References
const roomNameDisplay = document.getElementById('roomNameDisplay');
const roomStatusDisplay = document.getElementById('roomStatusDisplay');
const alreadyVotedMessage = document.getElementById('alreadyVotedMessage');
const sampleSelectionSection = document.getElementById('sampleSelectionSection');
const sampleSelect = document.getElementById('sampleSelect');
const cuppingForm = document.getElementById('cuppingForm'); 
const submitVoteBtn = document.getElementById('submitVoteBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const backToHostBtn = document.getElementById('backToHostBtn');
const samplesList = document.getElementById('samplesList');
const loadingMessage = document.getElementById('loadingMessage'); 
const mainContent = document.getElementById('mainContent'); 

let roomRef = ref(db, `rooms/${roomId}`);
let votesRef = ref(db, `rooms/${roomId}/votes`);
let samplesRef = ref(db, `rooms/${roomId}/samples`);

// 3. ฟังก์ชันสำหรับจัดการการแสดงผลเมื่อโหลดเสร็จ
function showContent() {
    if (loadingMessage) {
        loadingMessage.classList.add('hidden');
    }
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
}

// ฟังก์ชันสำหรับแสดง samples ใน dropdown
function loadSamples(roomId) {
  if (!roomId || !sampleSelect) return; 

  // ใช้ onValue เพื่อฟังการเปลี่ยนแปลงของ samples แบบเรียลไทม์
  onValue(samplesRef, (snapshot) => {
    const samples = snapshot.val();
    
    if (sampleSelect) {
        sampleSelect.innerHTML = '<option value="">เลือกตัวอย่าง</option>'; 
    }

    if (samples) {
      // กรอง placeholder และเรียงตามหมายเลขตัวอย่าง
      const validSamples = Object.keys(samples)
        .filter(key => key !== 'placeholder')
        .map(key => ({ id: key, ...samples[key] }))
        .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));

      if (validSamples.length === 0) {
        if (samplesList) samplesList.innerHTML = "<p class='text-gray-500'>Host ยังไม่ได้เพิ่มตัวอย่าง</p>";
        if (sampleSelectionSection) sampleSelectionSection.classList.add('hidden');
        return;
      }

      if (sampleSelectionSection) sampleSelectionSection.classList.remove('hidden');
      validSamples.forEach(sample => {
        const option = document.createElement('option');
        option.value = sample.number;
        option.textContent = `Sample #${sample.number} (${sample.description || 'ไม่มีรายละเอียด'})`;
        if (sampleSelect) sampleSelect.appendChild(option);
      });
    } else {
        if (samplesList) samplesList.innerHTML = "<p class='text-gray-500'>Host ยังไม่ได้เพิ่มตัวอย่าง</p>";
        if (sampleSelectionSection) sampleSelectionSection.classList.add('hidden');
    }
  });
}

// ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้โหวตสำหรับ sample นี้แล้วหรือยัง
async function checkUserVoteStatus(user, roomId, sampleNumber) {
  if (!user || !roomId || !sampleNumber) return;

  const voteRef = ref(db, `rooms/${roomId}/votes/${user.uid}/${sampleNumber}`);
  const snapshot = await get(voteRef);

  if (snapshot.exists()) {
    // ผู้ใช้เคยโหวตแล้ว
    if (alreadyVotedMessage) alreadyVotedMessage.classList.remove('hidden');
    if (cuppingForm) {
      cuppingForm.classList.add('hidden');
    }
  } else {
    // ยังไม่เคยโหวต
    if (alreadyVotedMessage) alreadyVotedMessage.classList.add('hidden');
    if (cuppingForm) {
      cuppingForm.classList.remove('hidden');
    }
  }
}

// ฟังก์ชันสำหรับส่งคะแนนโหวต
async function submitVote(e, user) {
  e.preventDefault();

  if (!cuppingForm) {
      console.error("cuppingForm is missing.");
      return;
  }

  const roastLevel = document.getElementById('roastLevel').value;
  const roastNotes = document.getElementById('roastNotes').value;
  const fragrance = document.getElementById('fragrance').value;
  const fragranceNotes = document.getElementById('fragranceNotes').value;
  const aroma = document.getElementById('aroma').value;
  const aromaNotes = document.getElementById('aromaNotes').value;
  const flavor = document.getElementById('flavor').value;
  const flavorNotes = document.getElementById('flavorNotes').value;
  const aftertaste = document.getElementById('aftertaste').value;
  const aftertasteNotes = document.getElementById('aftertasteNotes').value;
  const acidity = document.getElementById('acidity').value;
  const acidityNotes = document.getElementById('acidityNotes').value;
  const body = document.getElementById('body').value;
  const bodyNotes = document.getElementById('bodyNotes').value;
  const sweetness = document.getElementById('sweetness').value;
  const sweetnessNotes = document.getElementById('sweetnessNotes').value;
  const mainTastes = document.getElementById('mainTastes').value;
  const mouthfeel = document.getElementById('mouthfeel').value;
  const overall = document.getElementById('overall').value;
  const overallNotes = document.getElementById('overallNotes').value;

  const sampleNumber = sampleSelect.value;

  if (!sampleNumber) {
    alert("กรุณาเลือกหมายเลขตัวอย่าง");
    return;
  }

  const voteData = {
    userId: user.uid,
    userName: user.displayName || user.email,
    sampleNumber: sampleNumber,
    timestamp: Date.now(),
    scores: {
      roastLevel: roastLevel,
      fragrance: fragrance,
      aroma: aroma,
      flavor: flavor,
      aftertaste: aftertaste,
      acidity: acidity,
      body: body,
      sweetness: sweetness,
      overall: overall
    },
    notes: {
      roastNotes: roastNotes,
      fragranceNotes: fragranceNotes,
      aromaNotes: aromaNotes,
      flavorNotes: flavorNotes,
      aftertasteNotes: aftertasteNotes,
      acidityNotes: acidityNotes,
      bodyNotes: bodyNotes,
      sweetnessNotes: sweetnessNotes,
      mainTastes: mainTastes,
      mouthfeel: mouthfeel,
      overallNotes: overallNotes
    }
  };

  try {
    // บันทึกคะแนนโหวตลงใน Firebase
    // rooms/{roomId}/votes/{userId}/{sampleNumber}
    const votePath = `rooms/${roomId}/votes/${user.uid}/${sampleNumber}`;
    await set(ref(db, votePath), voteData);
    alert(`ส่งคะแนนสำหรับ Sample #${sampleNumber} สำเร็จ!`);

    // รีเซ็ตฟอร์ม (ถ้าจำเป็น)
    cuppingForm.reset();
    
    // หลังจากส่งโหวตสำเร็จ ให้ตรวจสอบสถานะอีกครั้ง
    checkUserVoteStatus(user, roomId, sampleNumber);

  } catch (error) {
    console.error("Error submitting vote:", error);
    alert("เกิดข้อผิดพลาดในการส่งคะแนน: " + error.message);
  }
}

// 4. จัดการสถานะห้องแบบ Realtime
let roomDataLoaded = false;
onValue(roomRef, (snapshot) => {
  const roomData = snapshot.val();
  
  roomDataLoaded = true;
  showContent(); // แสดงเนื้อหาหลักเมื่อข้อมูลห้องโหลดเสร็จ

  if (roomData) {
    if (roomNameDisplay) roomNameDisplay.textContent = `Cupping Room: ${roomData.name}`;

    if (roomData.status === "open") {
      if (roomStatusDisplay) {
        roomStatusDisplay.textContent = "สถานะ: เปิดรับคะแนน";
        roomStatusDisplay.classList.remove("text-red-600", "text-gray-500");
        roomStatusDisplay.classList.add("text-green-600");
      }

      // ตรวจสอบสถานะการโหวตเมื่อสถานะห้องเปิดอยู่
      if (auth.currentUser && sampleSelect && sampleSelect.value) {
        checkUserVoteStatus(auth.currentUser, roomId, sampleSelect.value);
      } else if (cuppingForm) {
          // หากไม่มี sample ที่ถูกเลือก หรือยังไม่ login ให้แสดงฟอร์ม
          cuppingForm.classList.remove('hidden');
          if (alreadyVotedMessage) alreadyVotedMessage.classList.add('hidden');
      }

    } else if (roomData.status === "closed") {
      if (roomStatusDisplay) {
        roomStatusDisplay.textContent = "สถานะ: ปิดรับคะแนนแล้ว";
        roomStatusDisplay.classList.remove("text-green-600", "text-gray-500");
        roomStatusDisplay.classList.add("text-red-600");
      }
      
      if (cuppingForm) {
        cuppingForm.classList.add("hidden");
      }
      if (alreadyVotedMessage) alreadyVotedMessage.classList.add("hidden");
      if (sampleSelectionSection) sampleSelectionSection.classList.add("hidden");
      alert("ห้องนี้ปิดรับคะแนนแล้ว คุณไม่สามารถโหวตได้");
    }
  } else {
    if (roomNameDisplay) roomNameDisplay.textContent = "ไม่พบห้องนี้";
    if (roomStatusDisplay) roomStatusDisplay.textContent = "ห้องนี้อาจถูกลบไปแล้ว";
    
    if (cuppingForm) {
      cuppingForm.classList.add("hidden");
    }
    if (alreadyVotedMessage) alreadyVotedMessage.classList.add("hidden");
    if (sampleSelectionSection) sampleSelectionSection.classList.add("hidden");
  }
});

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
    sampleSelect.addEventListener('change', (e) => {
        checkUserVoteStatus(user, roomId, e.target.value);
    });
  }

  // 6. ผูก submit event กับ cuppingForm
  if (cuppingForm) {
    cuppingForm.addEventListener('submit', (e) => submitVote(e, user));
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