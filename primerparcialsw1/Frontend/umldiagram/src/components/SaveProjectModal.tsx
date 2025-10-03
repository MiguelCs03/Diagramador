'use client';
import React, { useState, useEffect } from 'react';
import { projectService } from '../services/projectService';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagramData: any; // Contenido del diagrama actual
  onSaveSuccess?: (project: any) => void;
  currentProject?: {
    id: number;
    nombre: string;
    descripcion?: string;
  } | null; // Proyecto actual si estamos actualizando
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  onClose,
  diagramData,
  onSaveSuccess,
  currentProject
}) => {
  const [formData, setFormData] = useState({
    nombre: currentProject?.nombre || '',
    descripcion: currentProject?.descripcion || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Actualizar formData cuando cambie currentProject
  useEffect(() => {
    setFormData({
      nombre: currentProject?.nombre || '',
      descripcion: currentProject?.descripcion || '',
    });
  }, [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.nombre.trim()) {
      setError('El nombre del proyecto es requerido');
      setLoading(false);
      return;
    }

    try {
      let savedProject;
      
      if (currentProject) {
        // Actualizar proyecto existente
        savedProject = await projectService.update(currentProject.id, {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          contenido_diagrama: diagramData
        });
      } else {
        // Crear nuevo proyecto
        savedProject = await projectService.create({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          contenido_diagrama: diagramData
        });
      }

      onSaveSuccess?.(savedProject);
      setFormData({ nombre: '', descripcion: '' });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error al guardar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentProject ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Mi diagrama UML"
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              value={formData.descripcion}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe tu proyecto..."
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : (currentProject ? 'Actualizar Proyecto' : 'Guardar Proyecto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};