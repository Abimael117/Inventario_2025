
'use client';

import { useState, type FormEvent, useEffect } from 'react';
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
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';


const DUMMY_DOMAIN = 'decd.local';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    if (!auth) {
        setError('Los servicios de Firebase no están disponibles. Inténtalo de nuevo más tarde.');
        setIsLoading(false);
        return;
    }

    const formData = new FormData(event.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const email = `${username}@${DUMMY_DOMAIN}`;

    try {
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
                  placeholder="nombre.usuario"
                  required
                  defaultValue=""
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
                  defaultValue=""
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Accediendo...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
