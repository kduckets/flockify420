import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkMaDVBQAlv3p296nUGzDpiHeVtSs-nTA",
  authDomain: "flockify.firebaseapp.com",
  databaseURL: "https://flockify.firebaseio.com",
  projectId: "firebase-flockify",
  storageBucket: "firebase-flockify.appspot.com",
  messagingSenderId: "390824755072",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
