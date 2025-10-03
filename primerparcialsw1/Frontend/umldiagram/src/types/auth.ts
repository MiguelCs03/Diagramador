// Tipos para autenticación
export interface User {
  id: number;
  nombre: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Project {
  id: number;
  nombre: string;
  descripcion?: string;
  contenido_diagrama: {
    id?: string;
    name?: string;
    entities?: any[];
    relations?: any[];
    metadata?: any;
  } | null; // JSON del diagrama UML
  usuario_id: number;
  createdAt: string;
  updatedAt: string;
}

// Contexto de autenticación
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}