// ═══════════════════════════════════════════════════════════════════
//  TRC FIREBASE APP  —  Replaces entire Node.js + MongoDB backend
//  Paste YOUR Firebase config below (from Firebase Console)
// ═══════════════════════════════════════════════════════════════════
<script>
function switchTab(tab) {
    const loginPanel = document.getElementById("login-panel");
    const registerPanel = document.getElementById("register-panel");

    if (tab === "register") {
        loginPanel.style.display = "none";
        registerPanel.style.display = "block";
    } else {
        loginPanel.style.display = "block";
        registerPanel.style.display = "none";
    }
}
</script>
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────────
//  Firebase Console → Your Project → Project Settings → Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyDfFd87JukSkB1v-jAs2bLVG-OlKNJ4w5k",
  authDomain: "trc-portal-3b6de.firebaseapp.com",
  projectId: "trc-portal-3b6de",
  storageBucket: "trc-portal-3b6de.firebasestorage.app",
  messagingSenderId: "608154775398",
  appId: "1:608154775398:web:71a7b6d7cb7729c465a2a7"
};
// ─────────────────────────────────────────────────────────────────────

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ─── EMAILJS CONFIG (free email sending — no backend needed) ─────────
//  1. Sign up at emailjs.com
//  2. Create a service (Gmail) and a template
//  3. Paste your IDs below
const EMAILJS_SERVICE_ID  = "service_0lkkoln";
const EMAILJS_TEMPLATE_SELECT = "template_pbac5qh";
const EMAILJS_TEMPLATE_REJECT = "template_sdjbndc";
const EMAILJS_PUBLIC_KEY  = "TquhAa9_mPr5XTMRm";

// ─── ADMIN MOBILE NUMBERS (set these to your admin phones) ──────────
//  Any mobile number in this list gets admin access after login
const ADMIN_MOBILES = ["9040942617"];


// ═══════════════════════════════════════════════════════════════════
//  AUTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Register new student
window.trcRegister = async ({ name, year, course, mobile, email, password }) => {
  // Check if mobile already used
  const mobileCheck = await getDocs(query(collection(db, "users"), where("mobile", "==", mobile)));
  if (!mobileCheck.empty) throw new Error("Mobile number already registered");

  // Firebase Auth uses email+password under the hood
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;
  const isAdmin = ADMIN_MOBILES.includes(mobile);

  await setDoc(doc(db, "users", uid), {
    uid, name, year, course, mobile, email,
    role: isAdmin ? "admin" : "student",
    applicationStatus: "Pending",
    isFirstLogin: true,
    isProfileComplete: false,
    idCardVisible: false,
    uniqueId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { uid, name, email, mobile, year, course, role: isAdmin ? "admin" : "student",
           applicationStatus: "Pending", isFirstLogin: true, isProfileComplete: false, idCardVisible: false };
};

// Login with mobile + password
window.trcLogin = async (mobile, password) => {
  // Find email by mobile
  const snap = await getDocs(query(collection(db, "users"), where("mobile", "==", mobile)));
  if (snap.empty) throw new Error("Mobile number not registered");
  const userData = snap.docs[0].data();

  const cred = await signInWithEmailAndPassword(auth, userData.email, password);
  const fullDoc = await getDoc(doc(db, "users", cred.user.uid));
  return fullDoc.data();
};

// Logout
window.trcLogout = () => signOut(auth);

// Get current user data from Firestore
window.trcGetMe = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? snap.data() : null;
};

// Auth state observer
window.trcOnAuthChange = (callback) => onAuthStateChanged(auth, callback);


// ═══════════════════════════════════════════════════════════════════
//  STUDENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Submit detailed application with optional photo upload
window.trcSubmitApplication = async (formData, photoFile) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  let photoUrl = null;
  if (photoFile) {
    const storageRef = ref(storage, `photos/${user.uid}_${Date.now()}`);
    await uploadBytes(storageRef, photoFile);
    photoUrl = await getDownloadURL(storageRef);
  }

  const appData = { ...formData, photoUrl, submittedAt: serverTimestamp() };

  await updateDoc(doc(db, "users", user.uid), {
    detailedProfile: appData,
    applicationStatus: "Applied",
    isFirstLogin: false,
    isProfileComplete: true,
    updatedAt: serverTimestamp()
  });

  return { success: true };
};

// Get events (static — you can move these to Firestore later)
window.trcGetEvents = () => [
  { id:1, title:"Robotics Workshop: Arduino Basics", date:"2025-02-15", time:"10:00 AM", venue:"Lab 301", type:"Workshop", status:"upcoming", description:"Learn Arduino programming and build your first robot!" },
  { id:2, title:"Inter-College Robotics Championship", date:"2025-03-01", time:"9:00 AM", venue:"College Auditorium", type:"Competition", status:"upcoming", description:"Compete with 20+ colleges for exciting prizes!" },
  { id:3, title:"Drone Racing Event", date:"2025-01-20", time:"2:00 PM", venue:"College Ground", type:"Competition", status:"completed", description:"Annual drone racing. Congratulations to all participants!" },
  { id:4, title:"AI & ML in Robotics Seminar", date:"2025-02-28", time:"11:00 AM", venue:"Seminar Hall A", type:"Seminar", status:"upcoming", description:"Industry experts on the future of AI-powered robotics." }
];

// Get notices (static — you can move these to Firestore later)
window.trcGetNotices = () => [
  { id:1, title:"New Batch Recruitment Open", content:"We are now accepting applications for the 2025 batch. Register now and fill the detailed form. Selection results will be announced within 2 weeks.", date:"2025-01-15", type:"important", author:"Club Admin" },
  { id:2, title:"Workshop Registration Deadline", content:"Last date to register for the Arduino Basics workshop is February 10, 2025. Limited seats — first come, first served.", date:"2025-01-18", type:"warning", author:"Events Team" },
  { id:3, title:"Club Meeting — Every Saturday", content:"Weekly meetings every Saturday at 4:00 PM in Lab 301. All selected members expected to attend.", date:"2025-01-10", type:"info", author:"Club President" }
];


// ═══════════════════════════════════════════════════════════════════
//  ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Get dashboard stats
window.trcAdminDashboard = async () => {
  const snap = await getDocs(collection(db, "users"));
  const users = snap.docs.map(d => d.data()).filter(u => u.role === "student");
  return {
    total:    users.length,
    applied:  users.filter(u => u.applicationStatus === "Applied").length,
    selected: users.filter(u => u.applicationStatus === "Selected").length,
    rejected: users.filter(u => u.applicationStatus === "Rejected").length,
    pending:  users.filter(u => u.applicationStatus === "Pending").length,
    recent:   users.sort((a,b) => (b.updatedAt?.seconds||0) - (a.updatedAt?.seconds||0)).slice(0,5)
  };
};

// Get all student applications with optional filter
window.trcAdminGetStudents = async (statusFilter = "all", search = "") => {
  const snap = await getDocs(collection(db, "users"));
  let users = snap.docs.map(d => d.data()).filter(u => u.role === "student");

  if (statusFilter !== "all") users = users.filter(u => u.applicationStatus === statusFilter);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u =>
      u.name?.toLowerCase().includes(s) ||
      u.mobile?.includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.course?.toLowerCase().includes(s)
    );
  }
  return users.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
};

// Get single student
window.trcAdminGetStudent = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

// Generate unique TRC ID
const genId = async () => {
  const yr = new Date().getFullYear().toString().slice(-2);
  while (true) {
    const id = `TRC${yr}${Math.floor(1000 + Math.random() * 9000)}`;
    const check = await getDocs(query(collection(db, "users"), where("uniqueId", "==", id)));
    if (check.empty) return id;
  }
};

// Select a student
window.trcAdminSelect = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Student not found");
  const student = snap.data();

  const uniqueId = student.uniqueId || await genId();
  await updateDoc(doc(db, "users", uid), {
    applicationStatus: "Selected",
    idCardVisible: true,
    uniqueId,
    updatedAt: serverTimestamp()
  });

  // Send email via EmailJS
  await trcSendEmail({
    to_name:  student.name,
    to_email: student.email,
    unique_id: uniqueId,
    course:   student.course,
    year:     student.year
  }, "selection");

  return { ...student, uniqueId, applicationStatus: "Selected" };
};

// Reject a student
window.trcAdminReject = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) throw new Error("Student not found");
  const student = snap.data();

  await updateDoc(doc(db, "users", uid), {
    applicationStatus: "Rejected",
    idCardVisible: false,
    updatedAt: serverTimestamp()
  });

  await trcSendEmail({ to_name: student.name, to_email: student.email }, "rejection");
  return true;
};


// ═══════════════════════════════════════════════════════════════════
//  EMAIL VIA EMAILJS (no backend needed)
// ═══════════════════════════════════════════════════════════════════

const trcSendEmail = async (params, type) => {
  try {
    if (!window.emailjs) { console.warn("EmailJS not loaded"); return; }
    const templateId = type === "selection"
      ? EMAILJS_TEMPLATE_ID
      : EMAILJS_TEMPLATE_ID + "_reject"; // create 2 templates in EmailJS

    await emailjs.send(EMAILJS_SERVICE_ID, templateId, params, EMAILJS_PUBLIC_KEY);
    console.log("✅ Email sent to", params.to_email);
  } catch(e) {
    console.error("Email error:", e);
    // Don't block the selection if email fails
  }
};


// ═══════════════════════════════════════════════════════════════════
//  LOCAL STORAGE SESSION HELPERS
// ═══════════════════════════════════════════════════════════════════

window.session = {
  set: (user) => localStorage.setItem("trc_user", JSON.stringify(user)),
  get: () => { try { return JSON.parse(localStorage.getItem("trc_user")); } catch { return null; } },
  clear: () => localStorage.removeItem("trc_user"),
  isLoggedIn: () => !!localStorage.getItem("trc_user"),
  requireAuth(role = "student") {
    if (!this.isLoggedIn()) { window.location.href = "index.html"; return null; }
    const u = this.get();
    if (role === "admin" && u?.role !== "admin") { window.location.href = "index.html"; return null; }
    return u;
  },
  logout: async () => {
    await trcLogout();
    localStorage.removeItem("trc_user");
    window.location.href = "index.html";
  }
};

// ui helpers (same as before)
window.ui = {
  showAlert(sel, msg, type="danger") {
    const icons = {success:"✅",danger:"❌",warning:"⚠️",info:"ℹ️"};
    const el = document.querySelector(sel);
    if (el) el.innerHTML = `<div class="alert alert-${type}"><span>${icons[type]}</span><span>${msg}</span></div>`;
  },
  clearAlert(sel) { const el=document.querySelector(sel); if(el) el.innerHTML=""; },
  setLoading(btn, on, text="") {
    if(on){ btn.disabled=true; btn.dataset.orig=btn.innerHTML; btn.innerHTML=`<span class="spinner"></span> ${text||"Loading..."}`; }
    else { btn.disabled=false; btn.innerHTML=btn.dataset.orig||text; }
  },
  statusBadge(s) {
    const m={Pending:"badge-pending",Applied:"badge-applied",Selected:"badge-selected",Rejected:"badge-rejected"};
    return `<span class="badge ${m[s]||""}">${s}</span>`;
  },
  formatDate(ts) {
    if (!ts) return "N/A";
    const d = ts?.seconds ? new Date(ts.seconds*1000) : new Date(ts);
    return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  },
  timeAgo(ts) {
    const d = ts?.seconds ? new Date(ts.seconds*1000) : new Date(ts);
    const diff = Math.floor((Date.now()-d)/86400000);
    return diff===0?"Today":diff===1?"Yesterday":diff<30?`${diff}d ago`:this.formatDate(ts);
  }
};
