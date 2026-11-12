// src/firebase/firebase.js
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyD4WUgkt9E6ZDJT5KzAVpSuyOAW3csABbM',
  authDomain: 'kalafokus.firebaseapp.com',
  projectId: 'kalafokus',
  storageBucket: 'kalafokus.firebasestorage.app',
  messagingSenderId: '208230228462',
  appId: '1:208230228462:web:ba801e98f3342365802eff',
  measurementId: 'G-DNGCQJ0W1G'
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
auth.languageCode = 'id'

isSupported().then((ok) => {
  if (ok) getAnalytics(app)
})

export default app
