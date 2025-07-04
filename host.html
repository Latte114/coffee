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

const roomNameInput = document.getElementById("roomName");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomList = document.getElementById("roomList");

const ADMIN_UIDS = [
  "someAdminUID12345", // คุณต้องเปลี่ยนเป็น UID จริงของแอดมิน
];

function isAdmin(uid) {
  return ADMIN_UIDS.includes(uid);
}

let currentUserUID = null;
let currentUserDisplayName = "ไม่ทราบชื่อ";

function generateRandomCode(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

createRoomBtn.onclick = async () => {
  const name = roomNameInput.value.trim();
  if (!name) return alert("กรุณาใส่ชื่อห้อง");

  let newRoomId;
  let isUnique = false;
  while (!isUnique) {
    newRoomId = generateRandomCode(6);
    const roomRefCheck = ref(db, `rooms/${newRoomId}`);
    const snapshot = await get(roomRefCheck);
    if (!snapshot.exists()) {
      isUnique = true;
    }
  }

  await set(ref(db, `rooms/${newRoomId}`), {
    name,
    createdAt: new Date().toISOString(),
    createdBy: currentUserUID,
    creatorName: currentUserDisplayName,
    status: "open",
  });
  roomNameInput.value = "";
};

function loadRooms() {
  const myRoomsQuery = query(
    ref(db, "rooms"),
    orderByChild("createdBy"),
    equalTo(currentUserUID)
  );

  onValue(myRoomsQuery, (snapshot) => {
    roomList.innerHTML = "";
    const rooms = [];
    snapshot.forEach((childSnapshot) => {
      rooms.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });

    if (rooms.length === 0) {
      roomList.innerHTML = '<p class="text-gray-600 text-center">คุณยังไม่ได้สร้างห้อง Cupping</p>';
      return;
    }

    rooms.forEach((room) => {
      const li = document.createElement("li");
      li.className =
        "p-4 border rounded bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between";

      const roomInfo = document.createElement("div");
      roomInfo.innerHTML = `
        <strong class="text-lg">${room.name} ${
        room.status === "closed" ? "🔒 (ปิดแล้ว)" : ""
      }</strong><br/>
        สร้างเมื่อ: ${room.createdAt.split("T")[0]}<br/>
        ผู้สร้าง: ${room.creatorName || room.createdBy || "ไม่ระบุ"}<br/>
        **รหัสห้อง: <span class="font-mono text-sm text-gray-500">${room.id}</span>**<br/> ผู้โหวต: <span id="voteCount-${room.id}">โหลด...</span>
      `;

      const canvas = document.createElement("canvas");
      canvas.id = `chart-${room.id}`;
      canvas.style.maxWidth = "350px";
      canvas.style.maxHeight = "180px";

      const controls = document.createElement("div");
      controls.className = "mt-2 md:mt-0 flex gap-2 flex-wrap";

      if (isAdmin(currentUserUID) || currentUserUID === room.createdBy) {
        const toggleBtn = document.createElement("button");
        toggleBtn.className =
          "bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 text-black";
        toggleBtn.textContent = room.status === "open" ? "ปิดห้อง" : "เปิดห้อง";
        toggleBtn.onclick = async () => {
          await update(ref(db, `rooms/${room.id}`), {
            status: room.status === "open" ? "closed" : "open",
          });
        };
        controls.appendChild(toggleBtn);

        const editBtn = document.createElement("button");
        editBtn.className =
          "bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 text-white";
        editBtn.textContent = "แก้ไขชื่อ";
        editBtn.onclick = () => {
          const newName = prompt("กรุณาใส่ชื่อห้องใหม่:", room.name);
          if (newName && newName.trim() !== "") {
            update(ref(db, `rooms/${room.id}`), {
              name: newName.trim(),
            });
          }
        };
        controls.appendChild(editBtn);

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
      copyIdBtn.textContent = "คัดลอก ID";
      copyIdBtn.onclick = () => {
        navigator.clipboard.writeText(room.id)
          .then(() => alert("คัดลอกรหัสห้องแล้ว: " + room.id))
          .catch(err => console.error('Failed to copy: ', err));
      };
      controls.appendChild(copyIdBtn);

      const viewResultsBtn = document.createElement("button");
      viewResultsBtn.className =
        "bg-green-500 px-3 py-1 rounded hover:bg-green-600 text-white";
      viewResultsBtn.textContent = "ดูผลโหวต";
      viewResultsBtn.onclick = () => {
        window.location.href = `results.html?roomId=${room.id}`;
      };
      controls.appendChild(viewResultsBtn);


      li.appendChild(roomInfo);
      li.appendChild(canvas);
      li.appendChild(controls);
      roomList.appendChild(li);

      loadRoomVotes(room.id);
    });
  });
}

async function loadRoomVotes(roomId) {
  const votesRef = ref(db, `rooms/${roomId}/votes`);
  const voteCountSpan = document.getElementById(`voteCount-${roomId}`);
  const ctx = document.getElementById(`chart-${roomId}`)?.getContext("2d");
  if (!ctx) return;

  const snapshot = await get(votesRef);
  if (!snapshot.exists()) {
    voteCountSpan.textContent = "0";
    return;
  }

  const votes = snapshot.val();
  const totalVotes = Object.keys(votes).length;
  voteCountSpan.textContent = totalVotes;

  const sum = {
    sweetness: 0,
    acidity: 0,
    body: 0,
    aftertaste: 0,
    fragrance: 0,
    aroma: 0,
    flavor: 0,
  };

  Object.values(votes).forEach((vote) => {
    sum.sweetness += vote.sweetness?.intensity || 0;
    sum.acidity += vote.acidity?.intensity || 0;
    sum.body += vote.body?.intensity || 0;
    sum.aftertaste += vote.aftertaste?.intensity || 0;
    sum.fragrance += vote.fragrance?.intensity || 0;
    sum.aroma += vote.aroma?.intensity || 0;
    sum.flavor += vote.flavor?.intensity || 0;
  });

  const avg = {
    sweetness: sum.sweetness / totalVotes,
    acidity: sum.acidity / totalVotes,
    body: sum.body / totalVotes,
    aftertaste: sum.aftertaste / totalVotes,
    fragrance: sum.fragrance / totalVotes,
    aroma: sum.aroma / totalVotes,
    flavor: sum.flavor / totalVotes,
  };

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  ctx.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Sweetness", "Acidity", "Body", "Aftertaste", "Fragrance", "Aroma", "Flavor"],
      datasets: [
        {
          label: "คะแนนเฉลี่ย",
          data: [
            avg.sweetness,
            avg.acidity,
            avg.body,
            avg.aftertaste,
            avg.fragrance,
            avg.aroma,
            avg.flavor
          ].map((v) => v.toFixed(2)),
          backgroundColor: "rgba(37, 99, 235, 0.7)",
        },
      ],
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { stepSize: 1 },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

// ✅ ส่วนที่แก้ไข: เพิ่ม console.log และ setTimeout
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed. User:", user); // ตรวจสอบสถานะผู้ใช้ใน Console (F12)
  if (!user) {
    // หน่วงเวลา 1 วินาทีก่อนเปลี่ยนหน้า เพื่อให้ Firebase มีเวลาโหลดสถานะที่แท้จริง
    setTimeout(() => {
      // ตรวจสอบ auth.currentUser อีกครั้ง เพื่อยืนยันสถานะการล็อกอิน
      if (!auth.currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = "index.html";
      }
    }, 1000); // หน่วง 1 วินาที
    return; // ออกจากฟังก์ชันทันที การเปลี่ยนหน้าจะเกิดขึ้นหลังหน่วงเวลาถ้าจำเป็น
  }
  // ถ้ามีผู้ใช้ล็อกอินอยู่ ให้ดำเนินการต่อไป
  currentUserUID = user.uid;
  currentUserDisplayName = user.displayName || user.email;
  loadRooms();
});
