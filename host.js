import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  child,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const roomNameInput = document.getElementById("roomName");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomList = document.getElementById("roomList");
const backToHomeBtn = document.getElementById("backToHomeBtn");

// ⚠️ หมายเหตุ: ต้องแทนที่ UID นี้ด้วย UID ของผู้ดูแลระบบจริง
const ADMIN_UIDS = [
  "YMkUE69xF1f41E5QaMTiJVmU5BG2", 
];

// ฟังก์ชันสำหรับสร้างรหัสห้องแบบสุ่ม 6 หลัก
function generateRandomCode(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// 🌐 ฟังก์ชันสร้างห้องใหม่
if (createRoomBtn) {
  createRoomBtn.onclick = async () => {
    const roomName = roomNameInput.value.trim();
    if (!roomName) {
      alert("กรุณาใส่ชื่อห้อง");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("คุณต้องล็อกอินก่อนสร้างห้อง");
      return;
    }
    // ตรวจสอบว่าเป็น Admin หรือไม่
    if (!ADMIN_UIDS.includes(user.uid)) {
        alert("คุณไม่มีสิทธิ์สร้างห้อง");
        return;
    }

    let roomId;
    let isUnique = false;
    while (!isUnique) {
      roomId = generateRandomCode(6);
      const roomRef = ref(db, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      if (!snapshot.exists()) {
        isUnique = true;
      } else {
        console.log(`Room ID ${roomId} already exists, trying again.`);
      }
    }

    const newRoomRef = ref(db, `rooms/${roomId}`);
    await set(newRoomRef, {
      name: roomName,
      createdAt: Date.now(),
      hostUid: user.uid,
      hostEmail: user.email,
      status: "open", // open, closed
      // samples: {
      //   "sample-id-1": { number: 1, description: "Ethiopia Yirgacheffe" },
      //   "sample-id-2": { number: 2, description: "Colombia Supremo" }
      // }
    });

    roomNameInput.value = "";
    alert(`สร้างห้อง "${roomName}" (ID: ${roomId}) เรียบร้อยแล้ว`);
  };
}

// 🌐 ฟังก์ชันโหลดและแสดงรายการห้อง
function fetchRooms(user) {
    if (!roomList || !user) return; // ตรวจสอบว่า element และ user มีอยู่จริง

    const roomsRef = query(ref(db, 'rooms'), orderByChild('hostUid'), equalTo(user.uid));

    onValue(roomsRef, (snapshot) => {
        roomList.innerHTML = ''; // ล้างรายการเดิม
        if (!snapshot.exists()) {
            roomList.innerHTML = '<li class="text-gray-500">ยังไม่มีห้องที่คุณสร้าง</li>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const room = { id: childSnapshot.key, ...childSnapshot.val() };
            const li = document.createElement('li');
            li.className = 'bg-gray-50 p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center';

            const mainContent = document.createElement('div');
            mainContent.className = 'flex-grow mb-2 md:mb-0';
            mainContent.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800">${room.name} (ID: <span class="font-mono text-blue-600">${room.id}</span>)</h3>
                <p class="text-gray-600">สถานะ: <span class="${room.status === 'open' ? 'text-green-600' : 'text-red-600'} font-medium">${room.status === 'open' ? 'เปิดรับคะแนน' : 'ปิดรับคะแนน'}</span></p>
                <p class="text-sm text-gray-500">สร้างเมื่อ: ${new Date(room.createdAt).toLocaleString()}</p>
            `;
            
            const controls = document.createElement('div');
            controls.className = 'flex flex-wrap gap-2 md:ml-4';

            // ปุ่มจัดการตัวอย่าง
            const manageSamplesBtn = document.createElement('a');
            manageSamplesBtn.href = `manage-samples.html?roomId=${room.id}`;
            manageSamplesBtn.className = 'bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm flex items-center';
            manageSamplesBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 00-1 1v1a1 1 0 002 0V4a1 1 0 00-1-1zM9 8a1 1 0 00-1 1v1a1 1 0 002 0V9a1 1 0 00-1-1zM13 3a1 1 0 00-1 1v1a1 1 0 002 0V4a1 1 0 00-1-1zM15 8a1 1 0 00-1 1v1a1 1 0 002 0V9a1 1 0 00-1-1z"></path><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-2-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>จัดการตัวอย่าง';
            controls.appendChild(manageSamplesBtn);

            // ปุ่มดูผลลัพธ์
            const viewResultsBtn = document.createElement('a');
            viewResultsBtn.href = `results.html?roomId=${room.id}`;
            viewResultsBtn.className = 'bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center';
            viewResultsBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3zm11.707 5.293a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>ดูผลลัพธ์';
            controls.appendChild(viewResultsBtn);

            // ปุ่มเปิด/ปิดรับคะแนน
            const toggleStatusBtn = document.createElement('button');
            toggleStatusBtn.className = `toggle-status-btn px-3 py-1 rounded text-sm flex items-center ${room.status === 'open' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`;
            toggleStatusBtn.setAttribute('data-room-id', room.id);
            toggleStatusBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path></svg>${room.status === 'open' ? 'ปิดรับคะแนน' : 'เปิดรับคะแนน'}`;
            controls.appendChild(toggleStatusBtn);

            // ปุ่มลบห้อง
            const deleteRoomBtn = document.createElement('button');
            deleteRoomBtn.className = 'bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800 text-sm flex items-center';
            deleteRoomBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"></path></svg>ลบห้อง';
            deleteRoomBtn.onclick = async () => {
                if (confirm(`คุณแน่ใจหรือไม่ที่จะลบห้อง "${room.name}" (ID: ${room.id})? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) {
                    await remove(ref(db, `rooms/${room.id}`));
                    alert("ห้องถูกลบแล้ว");
                }
            };
            controls.appendChild(deleteRoomBtn);

            // ปุ่มคัดลอก Room ID
            const copyIdBtn = document.createElement('button');
            copyIdBtn.className = 'bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm flex items-center';
            copyIdBtn.innerHTML = '<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path></svg>คัดลอก ID';
            copyIdBtn.onclick = () => {
                navigator.clipboard.writeText(room.id)
                    .then(() => alert("คัดลอก Room ID แล้ว: " + room.id))
                    .catch(err => console.error('Failed to copy: ', err));
            };
            controls.appendChild(copyIdBtn);

            li.appendChild(mainContent);
            li.appendChild(controls);

            roomList.appendChild(li);
        });
        
        // ⚙️ จัดการสถานะห้องเมื่อคลิกปุ่ม \"เปิด/ปิดรับคะแนน\"\r\n    document.querySelectorAll('.toggle-status-btn').forEach(button => {\r\n        button.addEventListener('click', async () => {\r\n            const roomId = button.getAttribute('data-room-id');\r\n            const roomRef = ref(db, `rooms/${roomId}`);\r\n            \r\n            // อ่านสถานะปัจจุบันก่อนอัปเดต\r\n            const snapshot = await get(roomRef);\r\n            if (snapshot.exists()) {\r\n                const currentStatus = snapshot.val().status;\r\n                const newStatus = currentStatus === \"open\" ? \"closed\" : \"open\";\r\n                \r\n                await update(roomRef, { status: newStatus });\r\n            }\r\n        });\r\n    });
    });
}

// 👤 ตรวจสอบสถานะการล็อกอินและโหลดห้อง
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed. User:", user);
  if (user) {
    // ถ้าล็อกอินแล้ว ให้โหลดรายการห้อง
    fetchRooms(user);
    // ตรวจสอบว่าเป็น Admin หรือไม่
    if (!ADMIN_UIDS.includes(user.uid)) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        window.location.href = "home.html"; // Redirect non-admins
    }
  } else {
    // ถ้ายังไม่ได้ล็อกอิน ให้กลับไปหน้า index
    alert("กรุณาเข้าสู่ระบบเพื่อเข้าถึงหน้านี้");
    window.location.href = "index.html";
  }
});

// 5. ปุ่มกลับสู่ Home
if (backToHomeBtn) {
    backToHomeBtn.onclick = () => {
        window.location.href = "home.html";
    };
}