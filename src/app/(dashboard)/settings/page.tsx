
'use client';

import AppHeader from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Configuración" />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                La gestión de usuarios ha sido deshabilitada temporalmente para simplificar la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Para gestionar usuarios, necesitarías volver a implementar un sistema de autenticación completo y seguro.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
