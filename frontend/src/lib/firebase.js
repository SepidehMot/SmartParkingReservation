import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgnK0cQd3b63pYjEg6cwXRQI7y7a6hOg4",
  authDomain: "smart-parking-2443e.firebaseapp.com",
  projectId: "smart-parking-2443e",
  storageBucket: "smart-parking-2443e.firebasestorage.app",
  messagingSenderId: "106578797921",
  appId: "1:106578797921:web:3cd5ae30931b2f5b195120",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
