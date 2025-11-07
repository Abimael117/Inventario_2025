
import { NextResponse, type NextRequest } from 'next/server';

// Este middleware se ejecuta en cada petición al servidor.
export function middleware(request: NextRequest) {
  // Clona las cabeceras de la petición para poder modificarlas.
  const requestHeaders = new Headers(request.headers);
  
  // Obtiene la cookie de sesión del navegador.
  const session = request.cookies.get('session')?.value;

  // Si la cookie de sesión existe...
  if (session) {
    // ...la añade a una nueva cabecera 'x-session-cookie'.
    // Esta es la forma correcta de pasar la información de sesión a las Server Actions.
    requestHeaders.set('x-session-cookie', session);
  }

  // Devuelve la respuesta con las cabeceras actualizadas, permitiendo que la petición continúe.
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configuración del matcher para que el middleware se aplique a todas las rutas.
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de la petición excepto para:
     * - api (rutas de API)
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (archivo de favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
