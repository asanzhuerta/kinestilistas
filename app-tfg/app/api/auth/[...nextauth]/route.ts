// Esta Api Route es la encargada de manejar las peticiones de autenticación, se encarga de redirigir las peticiones a los handlers correspondientes dependiendo del método HTTP (GET, POST, etc) y de la ruta (/api/auth/[...nextauth])
import { handlers } from "@/auth";

// GET /api/auth/[...nextauth]
// Atiende las operaciones de autenticacion de NextAuth para lectura de sesion y callbacks.
// POST /api/auth/[...nextauth]
// Atiende las operaciones de autenticacion de NextAuth para login, logout y callbacks.
export const { GET, POST } = handlers;
