// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile, // ✅ เพิ่มตรงนี้
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🧠 ใส่ config Firebase ของคุณตรงนี้
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const provider = new GoogleAuthProvider();

// 🌐 ฟังก์ชัน login/signup
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msg = document.getElementById("message");

// ... โค้ดเดิม ...

document.getElementById("signupBtn").onclick = () => {
  const username = document.getElementById("username").value;

  createUserWithEmailAndPassword(auth, emailEl.value, passEl.value)
    .then(async (userCredential) => {
      await updateProfile(userCredential.user, {
        displayName: username,
      });
      msg.innerText = `✅ Signed up as ${userCredential.user.email} (ชื่อ: ${username})`;
      // ✅ เปลี่ยนไปที่ home.html
      window.location.href = "home.html";
    })
    .catch((err) => (msg.innerText = `❌ ${err.message}`));
};

document.getElementById("loginBtn").onclick = () => {
  signInWithEmailAndPassword(auth, emailEl.value, passEl.value)
    .then((user) => {
      msg.innerText = `✅ Logged in as ${user.user.email}`;
      // ✅ เปลี่ยนไปที่ home.html
      window.location.href = "home.html";
    })
    .catch((err) => (msg.innerText = `❌ ${err.message}`));
};

document.getElementById("googleBtn").onclick = () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      msg.innerText = `✅ Google Login: ${result.user.email}`;
      // ✅ เปลี่ยนไปที่ home.html
      window.location.href = "home.html";
    })
    .catch((err) => (msg.innerText = `❌ ${err.message}`));
};
