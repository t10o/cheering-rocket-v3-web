import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/**
 * Firebase 設定
 * 環境変数から読み込み
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Firebase アプリの初期化（シングルトン）
 */
let app: FirebaseApp
let db: Firestore
let storage: FirebaseStorage
let functionsInstance: Functions

export function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApps()[0]
  }
  return app
}

/**
 * Firestore インスタンスを取得
 */
export function getFirestoreInstance(): Firestore {
  if (!db) {
    db = getFirestore(initializeFirebase())
  }
  return db
}

/**
 * Storage インスタンスを取得
 */
export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(initializeFirebase())
  }
  return storage
}

/**
 * Functions インスタンスを取得
 */
export function getFunctionsInstance(): Functions {
  if (!functionsInstance) {
    const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-northeast1'
    functionsInstance = getFunctions(initializeFirebase(), region)
  }
  return functionsInstance
}
