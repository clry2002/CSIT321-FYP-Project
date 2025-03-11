import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Test Firestore connection by fetching collections
async function testFirestoreConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, "testCollection")); 
    console.log("Firestore connected! Documents found:", querySnapshot.size);
  } catch (error) {
    console.error("Firestore connection failed:", error);
  }
}

testFirestoreConnection();
