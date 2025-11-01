"use client";
import React, { useRef, useState } from 'react';
import { parseDiagramImage } from '../services/ocrService';
import type { UMLDiagram } from '../types/uml';

interface ImportImageProps {
  onImport: (diagram: UMLDiagram) => void;
}

const ImportImage: React.FC<ImportImageProps> = ({ onImport }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      setLoading(true);
      const json = await parseDiagramImage(file, { lang: 'es' });
      if (json && json.diagram) {
        onImport(json.diagram);
      } else {
        setError('No se obtuvo diagrama del servidor');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar imagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex items-center space-x-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} />
        {loading && <span className="text-sm text-gray-500">Analizando...</span>}
      </div>
      {preview && (
        <div className="mt-2">
          <img src={preview} alt="preview" className="max-w-xs max-h-48 border" />
        </div>
      )}
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
};

export default ImportImage;
