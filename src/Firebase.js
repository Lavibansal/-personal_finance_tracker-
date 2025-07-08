// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth,GoogleAuthProvider } from "firebase/auth";
import { getFirestore,doc,setDoc,collection,getDocs,addDoc,updateDoc,deleteDoc,query,where,onSnapshot } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAqG2M2JZgLJU8fz25mHXVzMUVMkbbVY_M",
  authDomain: "personal-finance-tracker-76390.firebaseapp.com",
  projectId: "personal-finance-tracker-76390",
  storageBucket: "personal-finance-tracker-76390.firebasestorage.app",
  messagingSenderId: "733539716807",
  appId: "1:733539716807:web:0f54655249d712c725f8e2",
  measurementId: "G-RQ9KYMN7VE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics= getAnalytics(app);
const db=getFirestore(app);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
export{db,auth,provider,doc,setDoc,collection,getDocs,addDoc,updateDoc,deleteDoc,query,where,onSnapshot};