import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAvy1kA6Mxw67E6z3UXW-zTyv4Jke2r1ik",
  authDomain: "digiwill-8f7bb.firebaseapp.com",
  databaseURL: "https://digiwill-8f7bb-default-rtdb.firebaseio.com",
  projectId: "digiwill-8f7bb",
  storageBucket: "digiwill-8f7bb.firebasestorage.app",
  messagingSenderId: "494872591990",
  appId: "1:494872591990:web:fcecfedcb1b5dac513a957",
  measurementId: "G-SVBGYQPBGV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
