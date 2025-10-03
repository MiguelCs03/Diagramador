import { authService } from './authService';
import { Project } from '../types/auth';

const API_BASE_URL = 'https://diagramadoruml.onrender.com/api';

export const projectService = {
  // Crear nuevo proyecto
  create: async (projectData: { nombre: string; descripcion?: string; contenido_diagrama: any }) => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear proyecto');
      }

      return data.project;
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      throw error;
    }
  },

  // Obtener todos los proyectos del usuario
  getAll: async (): Promise<Project[]> => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener proyectos');
      }

      return data.projects;
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
      throw error;
    }
  },

  // Obtener proyecto específico
  getById: async (id: number): Promise<Project> => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener proyecto');
      }

      return data.project;
    } catch (error) {
      console.error('Error al obtener proyecto:', error);
      throw error;
    }
  },

  // Actualizar proyecto existente
  update: async (id: number, projectData: { nombre?: string; descripcion?: string; contenido_diagrama?: any }) => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar proyecto');
      }

      return data.project;
    } catch (error) {
      console.error('Error al actualizar proyecto:', error);
      throw error;
    }
  },

  // Eliminar proyecto
  delete: async (id: number) => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar proyecto');
      }

      return data;
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      throw error;
    }
  },
};