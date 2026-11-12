// src/composables/useAuth.js
import { reactive, computed } from 'vue'
import { auth } from '../firebase'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth'

// State dibuat di luar fungsi supaya satu untuk seluruh aplikasi (singleton)
const state = reactive({
  user: null,     // { uid, displayName, email, photoURL, emailVerified } atau null
  loading: true
})

const snapshot = (u) =>
  u
    ? {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        emailVerified: u.emailVerified
      }
    : null

// Promise ini selesai setelah Firebase selesai memulihkan sesi login (saat refresh halaman).
// Router menunggu ini supaya user yang sudah login tidak dilempar ke /auth.
const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (u) => {
    state.user = snapshot(u)
    state.loading = false
    resolve()
  })
})

// Dianggap "login" hanya jika email sudah terverifikasi (akun Google otomatis terverifikasi)
const isAuthenticated = computed(() => !!state.user && state.user.emailVerified)
const needsVerification = computed(() => !!state.user && !state.user.emailVerified)

const verificationSettings = () => ({ url: `${window.location.origin}/auth` })

const register = async ({ name, email, password }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (name) await updateProfile(cred.user, { displayName: name })
  state.user = snapshot(auth.currentUser)
  // Email verifikasi langsung terkirim saat Daftar ditekan
  await sendEmailVerification(cred.user, verificationSettings())
}

const login = async ({ email, password }) => {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  state.user = snapshot(cred.user)
  return cred.user.emailVerified
}

const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth, provider)
  state.user = snapshot(cred.user)
}

const resendVerification = async () => {
  if (!auth.currentUser) throw new Error('no-user')
  await sendEmailVerification(auth.currentUser, verificationSettings())
}

// Dipanggil setelah user klik link di email: ambil data terbaru dari Firebase
const refreshUser = async () => {
  if (!auth.currentUser) return false
  await reload(auth.currentUser)
  await auth.currentUser.getIdToken(true) // segarkan token (penting nanti untuk backend PHP)
  state.user = snapshot(auth.currentUser)
  return state.user.emailVerified
}

const logout = async () => {
  await signOut(auth)
  state.user = null
}

const getErrorMessage = (error) => {
  const messages = {
    'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Kata sandi terlalu lemah (minimal 6 karakter).',
    'auth/invalid-credential': 'Email atau kata sandi salah.',
    'auth/user-not-found': 'Akun tidak ditemukan.',
    'auth/wrong-password': 'Email atau kata sandi salah.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
    'auth/network-request-failed': 'Koneksi bermasalah. Periksa internet Anda.',
    'auth/popup-closed-by-user': 'Jendela login Google ditutup sebelum selesai.',
    'auth/cancelled-popup-request': 'Jendela login Google ditutup sebelum selesai.',
    'auth/popup-blocked': 'Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.',
    'auth/unauthorized-domain': 'Domain ini belum diizinkan di Firebase (Authorized domains).',
    'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase Console.'
  }
  return messages[error?.code] || 'Terjadi kesalahan. Silakan coba lagi.'
}

export function useAuth() {
  return {
    state,
    authReady,
    isAuthenticated,
    needsVerification,
    register,
    login,
    loginWithGoogle,
    resendVerification,
    refreshUser,
    logout,
    getErrorMessage
  }
}