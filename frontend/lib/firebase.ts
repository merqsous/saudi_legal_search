import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD1XyxcxiIAX1eNxGP9jFJWfauj1krO9-s",
  authDomain: "albaheth-d7f58.firebaseapp.com",
  projectId: "albaheth-d7f58",
  storageBucket: "albaheth-d7f58.firebasestorage.app",
  messagingSenderId: "465178640453",
  appId: "1:465178640453:web:97fafb87316578a82aa32c",
  measurementId: "G-EFMFXFZSL6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'ar';

export default app;
