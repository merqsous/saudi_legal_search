import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

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

export const RECAPTCHA_ENTERPRISE_KEY = "6LfKG2ctAAAAABIjbgqEQ8T29I1wUb0-YtyBKXuu";

if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export default app;
