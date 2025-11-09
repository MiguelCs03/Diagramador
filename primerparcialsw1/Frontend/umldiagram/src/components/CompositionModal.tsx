"use client";
import React, { useState } from 'react';
import type { UMLEntity } from '../types/uml';

interface CompositionModalProps {
  entities: UMLEntity[];
  onConfirm: (sourceId: string, targetId: string) => void;
  onCancel: () => void;
}

const CompositionModal: React.FC<CompositionModalProps> = ({
  entities,
  onConfirm,
  onCancel,
}) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const handleConfirm = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      onConfirm(sourceId, targetId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Crear Relación de Composición</h2>
        
        <div className="space-y-4">
          {/* Tabla de origen (el "todo" - donde va el rombo) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tabla de Origen (el "Todo" - con rombo ◆)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una tabla...</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de destino (la "parte") */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tabla de Destino (la "Parte")
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una tabla...</option>
              {entities
                .filter((entity) => entity.id !== sourceId)
                .map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Ejemplo visual */}
          {sourceId && targetId && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
              <p className="font-medium mb-1">Resultado:</p>
              <p>
                <span className="font-semibold">{entities.find(e => e.id === sourceId)?.name}</span>
                {' '}◆────▶{' '}
                <span className="font-semibold">{entities.find(e => e.id === targetId)?.name}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                (El rombo está en "{entities.find(e => e.id === sourceId)?.name}")
              </p>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!sourceId || !targetId || sourceId === targetId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Crear Composición
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompositionModal;
