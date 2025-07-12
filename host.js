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
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// ➕ สร้างห้องใหม่
if (createRoomBtn) {
  createRoomBtn.onclick = async () => {
    const roomName = roomNameInput.value.trim();
    if (roomName === "") {
      alert("กรุณาใส่ชื่อห้อง");
      return;
    }

    // สร้าง ID ห้องที่ไม่ซ้ำกัน
    const roomId = generateRandomCode(6);
    const roomRef = ref(db, `rooms/${roomId}`);

    try {
      await set(roomRef, {
        name: roomName,
        status: "open", // สถานะเริ่มต้น: open
        createdAt: Date.now(),
        hostUid: auth.currentUser.uid, // บันทึก UID ของผู้สร้างห้อง
        // ✅ เพิ่มโหนด samples เพื่อรองรับการจัดการตัวอย่าง
        samples: { placeholder: true } 
      });
      alert(`สร้างห้อง "${roomName}" สำเร็จ! รหัสห้อง: ${roomId}`);
      roomNameInput.value = ""; // เคลียร์ input
      // รีเฟรชรายการห้องหลังจากสร้าง
      fetchRooms(auth.currentUser);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("เกิดข้อผิดพลาดในการสร้างห้อง: " + error.message);
    }
  };
}

// 📊 จัดการสถานะห้องและตัวอย่าง (สำหรับ Host)
function fetchRooms(user) {
  if (!user || !roomList) return;

  // ตรวจสอบว่าเป็น Admin หรือไม่
  const isAdmin = ADMIN_UIDS.includes(user.uid);
  const roomsRef = ref(db, "rooms");

  let queryRef;
  if (isAdmin) {
    // Admin เห็นทุกห้อง
    queryRef = roomsRef;
  } else {
    // User ทั่วไปเห็นเฉพาะห้องที่ตัวเองสร้าง
    queryRef = query(roomsRef, orderByChild("hostUid"), equalTo(user.uid));
  }

  // ใช้ onValue เพื่อฟังการเปลี่ยนแปลงข้อมูลแบบเรียลไทม์
  onValue(queryRef, (snapshot) => {
    roomList.innerHTML = ""; // ล้างรายการเก่า
    const rooms = snapshot.val();
    if (!rooms) {
      roomList.innerHTML =
        "<p class='text-gray-500'>ยังไม่มีห้อง Cupping ในระบบ</p>";
      return;
    }

    // แปลง Object เป็น Array และเรียงลำดับตามเวลาล่าสุดก่อน
    const roomsToShow = Object.keys(rooms)
      .map((key) => ({ id: key, ...rooms[key] }))
      .sort((a, b) => b.createdAt - a.createdAt);

    roomsToShow.forEach((room) => {
      const li = document.createElement("li");
      li.className = "bg-gray-50 p-4 rounded-lg shadow-sm mb-4 flex justify-between items-center";

      const statusColor = room.status === "open" ? "text-green-600" : "text-red-600";
      const statusText = room.status === "open" ? "เปิดอยู่" : "ปิดแล้ว";

      const mainContent = document.createElement("div");
      mainContent.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800">${room.name} <span class="text-sm font-normal text-gray-500">(ID: ${room.id})</span></h3>
        <p class="text-sm ${statusColor}">สถานะ: ${statusText}</p>
        <div class="sample-management-buttons mt-3">
          <button 
            data-room-id="${room.id}"
            class="toggle-status-btn bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs font-semibold"
          >
            ${room.status === "open" ? "ปิดรับคะแนน" : "เปิดรับคะแนน"}
          </button>
          <a 
            href="results.html?roomId=${room.id}" 
            class="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-xs font-semibold"
          >
            ดูผลลัพธ์
          </a>
          <a
            href="manage-samples.html?roomId=${room.id}"
            class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-semibold"
          >
            จัดการตัวอย่าง
          </a>
        </div>
      `;

      // 🛠️ การจัดการห้อง (ลบห้อง)
      const controls = document.createElement("div");

      // เพิ่มปุ่ม 'ลบห้อง' เฉพาะผู้สร้างห้องหรือ Admin
      if (user.uid === room.hostUid || isAdmin) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className =
          "bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-white";
        deleteBtn.textContent = "ลบห้อง";
        deleteBtn.onclick = async () => {
          if (
            confirm(
              `คุณต้องการลบห้อง "${room.name}" ใช่หรือไม่? (ลบแล้วไม่สามารถกู้คืนได้)`
            )
          ) {
            await remove(ref(db, `rooms/${room.id}`));
          }
        };
        controls.appendChild(deleteBtn);
      }

      const copyIdBtn = document.createElement("button");
      copyIdBtn.className =
        "bg-gray-400 px-3 py-1 rounded hover:bg-gray-500 text-white";
      copyIdBtn.textContent = "คัดลอก ID ห้อง";
      copyIdBtn.onclick = () => {
        navigator.clipboard.writeText(room.id)
          .then(() => alert("คัดลอกรหัสห้องแล้ว: " + room.id))
          .catch(err => console.error('Failed to copy: ', err));
      };
      controls.appendChild(copyIdBtn);

      li.appendChild(mainContent);
      li.appendChild(controls);

      roomList.appendChild(li);
    });
    
    // ⚙️ จัดการสถานะห้องเมื่อคลิกปุ่ม "เปิด/ปิดรับคะแนน"
    document.querySelectorAll('.toggle-status-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const roomId = button.getAttribute('data-room-id');
            const roomRef = ref(db, `rooms/${roomId}`);
            
            // อ่านสถานะปัจจุบันก่อนอัปเดต
            const snapshot = await get(roomRef);
            if (snapshot.exists()) {
                const currentStatus = snapshot.val().status;
                const newStatus = currentStatus === "open" ? "closed" : "open";
                
                await update(roomRef, { status: newStatus });
            }
        });
    });
  });
}

// 👤 ตรวจสอบสถานะการล็อกอินและโหลดห้อง
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed. User:", user);
  if (user) {
    // ถ้าล็อกอินแล้ว ให้โหลดรายการห้อง
    fetchRooms(user);
  } else {
    // ถ้ายังไม่ได้ล็อกอิน ให้กลับไปหน้า index
    alert("กรุณาเข้าสู่ระบบก่อนใช้งาน Host Dashboard");
    window.location.href = "index.html"; 
  }
});

// 🏠 ปุ่มกลับหน้าหลัก
if (backToHomeBtn) {
    backToHomeBtn.onclick = () => {
        window.location.href = "home.html";
    };
}