export type FirebaseUserLike = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
};

declare global {
  interface Window {
    firebase?: any;
  }
}

const cfg = {
  apiKey: "AIzaSyD1BvUQDUak-zNBX5tF3pTuU68HNFKI8bs",
  authDomain: "voicecart-ai-8426b.firebaseapp.com",
  projectId: "voicecart-ai-8426b",
  storageBucket: "voicecart-ai-8426b.firebasestorage.app",
  messagingSenderId: "918794294624",
  appId: "1:918794294624:web:df1718f0aa724266d5fa05"
};

export const firebaseConfigured = Boolean(
  cfg.apiKey &&
  cfg.authDomain &&
  cfg.projectId &&
  cfg.appId
);

let sdkPromise: Promise<any> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      if ((window as any).firebase) {
        resolve();
        return;
      }

      existing.addEventListener(
        'load',
        () => resolve(),
        { once: true }
      );

      existing.addEventListener(
        'error',
        () => reject(new Error('Firebase failed to load')),
        { once: true }
      );

      return;
    }

    const script = document.createElement('script');

    script.src = src;
    script.async = true;

    script.onload = () => resolve();

    script.onerror = () =>
      reject(new Error('Firebase failed to load'));

    document.head.appendChild(script);
  });
}

export async function getFirebase() {
  if (!firebaseConfigured) {
    throw new Error(
      'Firebase is not configured.'
    );
  }

  if (!sdkPromise) {
    sdkPromise = (async () => {
      await loadScript(
        'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js'
      );

      await loadScript(
        'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js'
      );

      await loadScript(
        'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
      );

      const firebase = window.firebase;

      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }

      await firebase.auth().setPersistence(
        firebase.auth.Auth.Persistence.LOCAL
      );

      return firebase;
    })();
  }

  return sdkPromise;
}

export async function firebaseGoogleSignIn() {
  const firebase = await getFirebase();

  const provider =
    new firebase.auth.GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: 'select_account'
  });

  return firebase.auth().signInWithPopup(provider);
}

export async function firebaseEmailSignIn(
  email: string,
  password: string
) {
  const firebase = await getFirebase();

  return firebase.auth().signInWithEmailAndPassword(
    email,
    password
  );
}

export async function firebaseRegister(
  email: string,
  password: string,
  name?: string
) {
  const firebase = await getFirebase();

  const credential =
    await firebase.auth().createUserWithEmailAndPassword(
      email,
      password
    );

  if (name) {
    await credential.user.updateProfile({
      displayName: name
    });
  }

  return credential;
}