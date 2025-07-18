import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 🌐 ฟังก์ชัน login/signup
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const msg = document.getElementById("message");

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
    .then((userCredential) => {
      msg.innerText = `✅ Logged in as ${userCredential.user.email}`;
      // ✅ เปลี่ยนไปที่ home.html
      window.location.href = "home.html";
    })
    .catch((err) => (msg.innerText = `❌ ${err.message}`));
};

// 🌐 Google Login (Pop-up)
document.getElementById("googleLoginBtn").onclick = () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      msg.innerText = `✅ Logged in with Google as ${result.user.email}`;
      window.location.href = "home.html";
    })
    .catch((err) => (msg.innerText = `❌ ${err.message}`));
};