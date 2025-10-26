// src/firebase.ts
// ตั้งค่า Firebase + helper ล็อกอิน Google
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Firebase config ที่ถูกต้อง
const firebaseConfig = {
  apiKey: "AIzaSyBZyvTsyAy4M1H2dqNt9EvpBJ6tIecqLKs",
  authDomain: "coffee-17f9c.firebaseapp.com",
  projectId: "coffee-17f9c",
  storageBucket: "coffee-17f9c.appspot.com", // ✅ แก้ตรงนี้!
  messagingSenderId: "1031227878537",
  appId: "1:1031227878537:web:4b5bd47fe23e475226ea58",
};

// ป้องกัน initialize ซ้ำ
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth / DB
export const auth = getAuth(app);
export const db = getFirestore(app);

// ===== Helper ล็อกอิน/ออก Google =====
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export async function googleLogin() {
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function googleLogout() {
  await signOut(auth);
}
