import { UMLDiagram } from '../types/uml';

export interface ParseDiagramResult {
  diagram: UMLDiagram;
  meta: {
    engine: string;
    model?: string;
    rawResponse?: string;
  };
}

export async function parseDiagramImage(
  file: File, 
  options: { lang?: string; useLLM?: boolean } = {}
): Promise<ParseDiagramResult> {
  const formData = new FormData();
  formData.append('image', file);
  if (options.lang) formData.append('lang', options.lang);
  if (options.useLLM === false) formData.append('useLLM', 'false');

  // URL del backend (ajustar según entorno)
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const res = await fetch(`${backendUrl}/api/parse/diagram`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to parse image');
  }

  return res.json(); // { diagram, meta }   
}
