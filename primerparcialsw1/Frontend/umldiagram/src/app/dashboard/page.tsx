'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { UserHeader } from '../../components/UserHeader';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../contexts/AuthContext';
import { Project } from '../../types/auth';
import { Notification } from '../../components/Notification';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  // Cargar proyectos del usuario
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const userProjects = await projectService.getAll();
        setProjects(userProjects);
      } catch (error: any) {
        setError(error.message || 'Error al cargar proyectos');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Abrir proyecto en el editor
  const handleOpenProject = (project: Project) => {
    // Guardamos el proyecto en localStorage para que el editor lo cargue
    localStorage.setItem('currentProject', JSON.stringify(project));
    router.push('/');
  };

  // Eliminar proyecto
  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${projectName}"?`)) {
      return;
    }

    try {
      await projectService.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      setNotification({
        message: `Proyecto "${projectName}" eliminado exitosamente`,
        type: 'success'
      });
    } catch (error: any) {
      setNotification({
        message: error.message || 'Error al eliminar proyecto',
        type: 'error'
      });
    }
  };

  // Crear nuevo proyecto
  const handleNewProject = () => {
    // Limpiar cualquier proyecto guardado en localStorage
    localStorage.removeItem('currentProject');
    router.push('/');
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header del dashboard */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Mis Proyectos UML
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Bienvenido de vuelta, {user?.nombre}
                </p>
              </div>
              <button
                onClick={handleNewProject}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-lg font-semibold hover:bg-indigo-700 transition-all"
              >
                ➕ Nuevo Proyecto
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && projects.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes proyectos aún
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando tu primer diagrama UML
              </p>
              <button
                onClick={handleNewProject}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow font-semibold hover:bg-indigo-700 transition-all"
              >
                Crear mi primer proyecto
              </button>
            </div>
          )}

          {/* Grid de proyectos */}
          {!loading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                  {/* Preview del diagrama (placeholder por ahora) */}
                  <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-lg flex items-center justify-center relative">
                    <div className="text-indigo-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    {/* Badge con número de entidades */}
                    {(() => {
                      const entityCount = project.contenido_diagrama?.entities?.length || 0;
                      console.log(`Proyecto ${project.nombre} tiene ${entityCount} entidades:`, project.contenido_diagrama);
                      return entityCount > 0 ? (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                          {entityCount} clases
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Información del proyecto */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
                      {project.nombre}
                    </h3>
                    {project.descripcion && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {project.descripcion}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mb-4">
                      <p>Creado: {formatDate(project.createdAt)}</p>
                      <p>Modificado: {formatDate(project.updatedAt)}</p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenProject(project)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id, project.nombre)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}