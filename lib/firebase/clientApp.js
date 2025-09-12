// lib/firebase/clientApp.js
import { initializeApp, getApps, getApp } from "firebase/app";
// 💡 Firestore 관련 함수들을 추가로 import 합니다.
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, setDoc, getDocs, writeBatch, updateDoc, getDoc, where, runTransaction, limit, startAfter } from "firebase/firestore"; 
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 💡 추가된 Firestore 함수들과 serverTimestamp를 export합니다.
export {
  app,
  db,
  auth,
  storage,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  doc,
  deleteDoc,
  deleteObject,
  setDoc,
  getDocs,
  writeBatch,
  updateDoc,
  getDoc,
  where,
  runTransaction,
  limit, // 💡 limit 추가
  startAfter, // 💡 startAfter 추가
};