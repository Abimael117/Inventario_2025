
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, type Auth } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc, type Firestore } from 'firebase/firestore';


const DUMMY_DOMAIN = 'decd.local';

async function createInitialUsers(auth: Auth, firestore: Firestore) {
  const adminEmail = `admin@${DUMMY_DOMAIN}`;
  const educacionEmail = `educacion@${DUMMY_DOMAIN}`;

  // Helper function to create a user only if they don't exist
  const createUserIfNotExists = async (email: string, password: string, userData: any) => {
    try {
      // Try to create the user. This will fail if the email is already in use.
      const { user: authUser } = await createUserWithEmailAndPassword(auth, email, password);
      // If creation succeeds, set their profile in Firestore.
      await setDoc(doc(firestore, "users", authUser.uid), { ...userData, uid: authUser.uid });
    } catch (error: any) {
      // If the user already exists, we can ignore the error.
      // Otherwise, we should log it for debugging.
      if (error.code !== 'auth/email-already-in-use') {
        console.error(`Error creating initial user ${email}:`, error);
      }
    }
  };

  // Define admin user data
  const adminUserData = {
    name: 'Administrador',
    username: 'admin',
    role: 'admin' as const,
    permissions: ['dashboard', 'inventory', 'loans', 'reports', 'settings'],
  };

  // Define educacion user data
  const educacionUserData = {
    name: 'Centro educativo',
    username: 'educacion',
    role: 'user' as const,
    permissions: ['dashboard', 'inventory', 'loans'],
  };

  // Create both users if they don't exist
  await createUserIfNotExists(adminEmail, 'password123', adminUserData);
  await createUserIfNotExists(educacionEmail, '123456', educacionUserData);
}


export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!auth || !firestore) {
        setError('Los servicios de Firebase no están disponibles. Inténtalo de nuevo más tarde.');
        setIsLoading(false);
        return;
    }

    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const email = `${username}@${DUMMY_DOMAIN}`;

    try {
      // First, silently attempt to create the initial users.
      // This will only succeed the very first time and will fail silently if they already exist.
      await createInitialUsers(auth, firestore);
      
      // After ensuring users might exist, always attempt to sign in.
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');

    } catch (e) {
        let errorMessage = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
        if (e instanceof FirebaseError) {
          switch (e.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
              errorMessage = 'Usuario o contraseña incorrectos.';
              break;
            case 'auth/invalid-email':
              errorMessage = 'El formato del nombre de usuario no es válido.';
              break;
            default:
              errorMessage = 'Error de autenticación. Por favor, revisa tus credenciales.';
              break;
          }
        }
        setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-6">
        <div className="flex items-center gap-2 text-foreground">
          <Boxes className="size-8 text-primary" />
          <h1 className="text-2xl font-semibold">D.E.C.D</h1>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Introduce tu nombre de usuario y contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {error && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Error de Acceso</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin"
                  required
                  defaultValue="admin"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  defaultValue="password123"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Accediendo...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Usuarios de prueba: <strong>admin</strong> (pass: password123) y <strong>educacion</strong> (pass: 123456).
        </p>
      </div>
    </main>
  );
}
