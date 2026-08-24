import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import {
  firebaseConfigured,
  firebaseEmailSignIn,
  firebaseGoogleSignIn,
  firebaseRegister,
  getFirebase,
} from '../lib/firebase';
import { setActiveCloudUser } from '../lib/cloudData';
import { sendWelcomeEmail } from '../lib/email';

interface S {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  google: () => Promise<void>;
  guest: () => void;
  togglePrime: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const mapUser = (
  u: any,
  provider: User['provider'] = 'email'
): User => ({
  uid: u.uid || `local-${u.email || 'user'}`,
  name:
    u.displayName ||
    u.email?.split('@')[0] ||
    'Customer',
  email: u.email || '',
  provider,
  isPrime: true,
});

export const useAuthStore = create<S>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,
      error: null,

      initialize: async () => {
        if (get().initialized) return;

        if (!firebaseConfigured) {
          set({
            initialized: true,
          });

          return;
        }

        set({
          loading: true,
        });

        try {
          const firebase = await getFirebase();

          firebase.auth().onAuthStateChanged((u: any) => {
            if (u) {
              const provider =
                u.providerData?.[0]?.providerId === 'google.com'
                  ? 'google'
                  : 'email';

              const user = mapUser(u, provider);

              setActiveCloudUser(user.uid);

              set({
                user,
                loading: false,
                initialized: true,
              });
            } else {
              setActiveCloudUser();

              set({
                user: null,
                loading: false,
                initialized: true,
              });
            }
          });
        } catch (error: any) {
          set({
            error:
              error.message ||
              'Firebase initialization failed',
            loading: false,
            initialized: true,
          });
        }
      },

      login: async (email, password) => {
        set({
          loading: true,
          error: null,
        });

        try {
          if (firebaseConfigured) {
            const result = await firebaseEmailSignIn(
              email,
              password
            );

            const user = mapUser(
              result.user,
              'email'
            );

            setActiveCloudUser(user.uid);

            set({
              user,
              loading: false,
            });
          } else {
            const user: User = {
              uid: `local-${email}`,
              name: email.split('@')[0],
              email,
              provider: 'email',
              isPrime: true,
            };

            setActiveCloudUser(user.uid);

            set({
              user,
              loading: false,
            });
          }
        } catch (error: any) {
          set({
            loading: false,
            error:
              error.message ||
              'Unable to log in',
          });

          throw error;
        }
      },

      register: async (
        email,
        password,
        name
      ) => {
        set({
          loading: true,
          error: null,
        });

        try {
          let user: User;

          if (firebaseConfigured) {
            const result = await firebaseRegister(
              email,
              password,
              name
            );

            user = mapUser(
              {
                ...result.user,
                displayName: name,
              },
              'email'
            );
          } else {
            user = {
              uid: `local-${email}`,
              name:
                name ||
                email.split('@')[0],
              email,
              provider: 'email',
              isPrime: true,
            };
          }

          setActiveCloudUser(user.uid);

          set({
            user,
            loading: false,
          });

          console.log(
            'Attempting to send welcome email to:',
            user.email
          );

          try {
            const emailResult =
              await sendWelcomeEmail(
                user.email,
                user.name
              );

            console.log(
              'Welcome email result:',
              emailResult
            );
          } catch (emailError) {
            console.error(
              'Welcome email could not be sent:',
              emailError
            );
          }
        } catch (error: any) {
          set({
            loading: false,
            error:
              error.message ||
              'Unable to create account',
          });

          throw error;
        }
      },

      google: async () => {
        set({
          loading: true,
          error: null,
        });

        try {
          if (firebaseConfigured) {
            const result =
              await firebaseGoogleSignIn();

            console.log(
              'Google sign-in result:',
              result
            );

            const user = mapUser(
              result.user,
              'google'
            );

            setActiveCloudUser(user.uid);

            set({
              user,
              loading: false,
            });

            console.log(
              'Attempting to send welcome email to:',
              user.email
            );

            try {
              const emailResult =
                await sendWelcomeEmail(
                  user.email,
                  user.name
                );

              console.log(
                'Welcome email result:',
                emailResult
              );
            } catch (emailError) {
              console.error(
                'Welcome email could not be sent:',
                emailError
              );
            }
          } else {
            const user: User = {
              uid: 'local-google-demo',
              name: 'Google User',
              email: 'google.user@example.com',
              provider: 'google',
              isPrime: true,
            };

            setActiveCloudUser(user.uid);

            set({
              user,
              loading: false,
            });

            console.log(
              'Attempting to send welcome email to:',
              user.email
            );

            try {
              const emailResult =
                await sendWelcomeEmail(
                  user.email,
                  user.name
                );

              console.log(
                'Welcome email result:',
                emailResult
              );
            } catch (emailError) {
              console.error(
                'Welcome email could not be sent:',
                emailError
              );
            }
          }
        } catch (error: any) {
          set({
            loading: false,
            error:
              error.message ||
              'Google sign-in failed',
          });

          throw error;
        }
      },

      guest: () => {
        const user: User = {
          uid: 'guest-local',
          name: 'Guest',
          email: 'guest@voicecart.local',
          provider: 'guest',
          isPrime: false,
        };

        setActiveCloudUser();

        set({
          user,
          error: null,
          initialized: true,
        });
      },

      togglePrime: () =>
        set((state) =>
          state.user
            ? {
                user: {
                  ...state.user,
                  isPrime: !state.user.isPrime,
                },
              }
            : {}
        ),

      logout: async () => {
        if (firebaseConfigured) {
          try {
            const firebase =
              await getFirebase();

            await firebase.auth().signOut();
          } catch {}
        }

        setActiveCloudUser();

        set({
          user: null,
          error: null,
        });
      },

      clearError: () =>
        set({
          error: null,
        }),
    }),
    {
      name: 'voicecart-auth',

      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);