export interface HelpTopic {
  id: string;
  title: string;
  keywords: string[]; // palabras clave para detección simple
  answer: string; // respuesta en Markdown
}

const topics: HelpTopic[] = [
  {
    id: 'crear-clase',
    title: 'Crear una clase',
    keywords: ['crear clase', 'nueva clase', 'agregar clase', 'insertar clase', 'añadir clase', 'crear entidad'],
    answer:
      'Para crear una clase:\n\n1. En la barra lateral, selecciona la herramienta "Clase".\n2. Haz clic en el lienzo donde quieras ubicarla.\n3. Se creará una entidad con nombre automático (Clase1, Clase2, ...).',
  },
  {
    id: 'editar-nombre',
    title: 'Editar el nombre de una clase',
    keywords: ['editar nombre', 'cambiar nombre', 'renombrar clase', 'renombrar entidad'],
    answer:
      'Para editar el nombre:\n\n- Haz doble clic en el nombre de la clase o usa el botón ✎ en el encabezado.\n- Escribe el nuevo nombre y presiona Enter o haz clic fuera para guardar.',
  },
  {
    id: 'atributos',
    title: 'Agregar y editar atributos',
    keywords: ['atributos', 'agregar atributo', 'editar atributo', 'quitar atributo'],
    answer:
      'Para gestionar atributos:\n\n- Haz clic en el botón + en la sección "Atributos" para agregar uno nuevo.\n- Usa el icono de edición para modificar un atributo.\n- Usa el icono de eliminar para quitarlo.\n\nNota: Por simplicidad, esta app trabaja solo con atributos (no métodos).',
  },
  {
    id: 'eliminar',
    title: 'Eliminar clases y relaciones',
    keywords: ['eliminar clase', 'borrar clase', 'eliminar relación', 'borrar relación', 'quitar relación'],
    answer:
      'Para eliminar:\n\n- Clases: usa el botón rojo ✕ en el encabezado de la clase.\n- Relaciones: haz clic en la relación y presiona el botón ✕ del borde.',
  },
  {
    id: 'relaciones',
    title: 'Crear y editar relaciones',
    keywords: ['crear relación', 'agregar relación', 'editar relación', 'cardinalidad', 'navegabilidad'],
    answer:
      'Para crear una relación:\n\n1. Selecciona una herramienta de relación en la barra lateral (por ejemplo, Asociación).\n2. Arrastra desde el manejador (handle) de una clase hacia otra.\n\nPara editar cardinalidades:\n\n- Haz clic sobre la relación y usa los selectores en los extremos para cambiar la cardinalidad (1, 0..1, 1..*, 0..*, *).',
  },
  {
    id: 'muchos-a-muchos',
    title: 'Materializar relación muchos-a-muchos',
    keywords: ['muchos a muchos', 'm:n', 'intermedia', 'tabla intermedia', 'relación intermedia'],
    answer:
      'Cuando una asociación es muchos-a-muchos (por cardinalidades), la app te ofrece crear automáticamente una tabla intermedia.\n\n- Se creará una entidad intermedia con nombre unido por guion bajo, por ejemplo: `Usuario_Materia`.\n- Se reemplaza la relación original por dos relaciones 1..* hacia/desde la intermedia.',
  },
  {
    id: 'exportar',
    title: 'Exportar Backend Spring Boot',
    keywords: ['exportar', 'spring boot', 'generar backend', 'descargar proyecto'],
    answer:
      'Para exportar el backend:\n\n- Haz clic en el botón "Exportar Backend Spring Boot".\n- Se descargará un ZIP con el proyecto Java (entidades, repositorios, etc.).',
  },
  {
    id: 'colaboracion',
    title: 'Colaboración en tiempo real',
    keywords: ['colaboración', 'tiempo real', 'sala', 'websocket', 'compartir diagrama'],
    answer:
      'Para colaborar:\n\n1. Inicia el servidor WebSocket (`node websocket-server.js`).\n2. En la app, crea o únete a una sala con un código.\n3. Los cambios se sincronizan en tiempo real entre los participantes.',
  },
  {
    id: 'voz',
    title: 'Comandos por voz',
    keywords: ['voz', 'micrófono', 'hablar', 'comandos de voz'],
    answer:
      'Para usar voz:\n\n- Abre el panel de Voz y pulsa el botón de micrófono.\n- Di comandos como "Crea una clase Cliente" o "Agrega relación entre Cliente y Pedido".\n\nRevisa los permisos del navegador para habilitar el micrófono.',
  },
  {
    id: 'ia',
    title: 'Asistente IA (crear/modificar diagramas)',
    keywords: ['ia', 'asistente', 'generar diagrama', 'modificar diagrama', 'ayuda ia'],
    answer:
      'El asistente IA puede:\n\n- Crear diagramas completos (ej.: "Sistema de biblioteca con 8 clases").\n- Modificar el diagrama actual (ej.: "Añade la clase Autor").\n- Sugerir mejoras.\n\nConsejo: Sé específico sobre cuántas clases necesitas.',
  },
  {
    id: 'atajos',
    title: 'Sugerencias y atajos',
    keywords: ['atajos', 'tips', 'sugerencias', 'cómo empezar', 'guía rápida', 'manual'],
    answer:
      'Guía rápida:\n\n- Solo se crean entidades tipo Clase.\n- Edita nombres con doble clic o ✎.\n- Cardinalidades editables en la relación.\n- Las M:N pueden materializarse a tabla intermedia.\n- Botón ✕ para eliminar.\n- Exporta a Spring Boot desde el botón correspondiente.',
  },
];

// Detección simple basada en palabras clave. Devuelve una respuesta en markdown si matchea.
export function getHelpResponse(query: string): string | null {
  if (!query) return null;
  const q = query.toLowerCase();

  // Si el usuario pide explícitamente "guía" o "manual", devolver índice
  if (/(gu[ií]a|manual|ayuda|cómo empezar|como empezar)/i.test(q)) {
    const index = topics
      .map((t) => `- ${t.title}`)
      .join('\n');
    return `📘 Manual de uso (temas):\n\n${index}\n\nEscribe por ejemplo: "¿Cómo ${topics[0].title.toLowerCase()}?"`;
  }

  // Buscar por palabras clave
  const match = topics.find((t) => t.keywords.some((k) => q.includes(k)) || q.includes(t.title.toLowerCase()));
  return match ? `## ${match.title}\n\n${match.answer}` : null;
}

export default { getHelpResponse };
