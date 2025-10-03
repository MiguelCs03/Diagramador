"use client";

import React, { useState, useCallback, useEffect } from 'react';
import DiagramEditor from './DiagramEditor';
import Sidebar from './Sidebar';
import AIChatBot from './AIChatBot';
import { CollaborationPanel } from './CollaborationPanel';
import HelpButton from './HelpButton';
import { SaveProjectModal } from './SaveProjectModal';
import { Notification } from './Notification';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  UMLDiagram, 
  UMLEntity, 
  UMLRelation, 
  EntityType, 
  RelationType
} from '../types/uml';
import { CardinalityUtils } from '../types/uml';
import { exportAsZip, exportDiagramAsJson } from '../utils/projectExporter';
import { projectService } from '../services/projectService';

// Componente principal que maneja el estado del diagrama
const UMLDiagramApp: React.FC = () => {
  // Estado para controlar si estamos en el cliente (para evitar errores de hidratación)
  const [isClient, setIsClient] = useState(false);

  // Estado del diagrama
  const [diagram, setDiagram] = useState<UMLDiagram>({
    id: 'diagram-1',
  name: 'Nuevo Diagrama UML',
    entities: [],
    relations: [],
    packages: [],
    metadata: {
      created: new Date(),
      modified: new Date(),
      version: '1.0.0'
    }
  });

  // Herramienta seleccionada en la sidebar
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Estado para controlar el panel lateral activo
  const [activePanel, setActivePanel] = useState<'ai' | 'collab' | null>('ai');

  // Estado para el modal de guardar proyecto
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Estado para trackear el proyecto actual (si estamos editando uno existente)
  const [currentProject, setCurrentProject] = useState<{
    id: number;
    nombre: string;
    descripcion?: string;
  } | null>(null);

  // Estado para mostrar si se está auto-guardando
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Hook de WebSocket para colaboración
  const {
    roomState,
    sendDiagramUpdate,
    onDiagramUpdate,
    createRoom,
    joinRoom,
    leaveRoom
  } = useWebSocket();

  // useEffect para detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // useEffect para cargar proyecto desde localStorage (cuando se viene del dashboard)
  useEffect(() => {
    if (isClient) {
      const savedProject = localStorage.getItem('currentProject');
      if (savedProject) {
        try {
          const project = JSON.parse(savedProject);
          console.log('Proyecto desde localStorage:', project);
          
          // Establecer el proyecto actual para auto-guardado
          setCurrentProject({
            id: project.id,
            nombre: project.nombre,
            descripcion: project.descripcion
          });
          
          if (project.contenido_diagrama && Object.keys(project.contenido_diagrama).length > 0) {
            // Si tiene contenido de diagrama, cargarlo
            console.log('Contenido del diagrama:', project.contenido_diagrama);
            
            setDiagram({
              ...project.contenido_diagrama,
              id: project.contenido_diagrama.id || `diagram-${Date.now()}`,
              name: project.nombre,
              metadata: {
                ...project.contenido_diagrama.metadata,
                created: new Date(project.createdAt),
                modified: new Date(project.updatedAt)
              }
            });
            console.log('Proyecto cargado desde dashboard:', project.nombre);
          } else {
            // Si no tiene contenido, crear un diagrama vacío con el nombre del proyecto
            console.log('Proyecto sin contenido, creando diagrama vacío');
            setDiagram({
              id: `diagram-${Date.now()}`,
              name: project.nombre,
              entities: [],
              relations: [],
              metadata: {
                created: new Date(project.createdAt),
                modified: new Date(project.updatedAt),
                version: '1.0.0'
              }
            });
          }
          // Limpiar el localStorage después de cargar
          localStorage.removeItem('currentProject');
        } catch (error) {
          console.error('Error al cargar proyecto desde localStorage:', error);
        }
      }
    }
  }, [isClient]);

  // Configurar callback para recibir actualizaciones de colaboración
  useEffect(() => {
    console.log('[Colaboración] useEffect configurando onDiagramUpdate');
    onDiagramUpdate((receivedDiagram: UMLDiagram) => {
      console.log('[Colaboración][RX] Diagrama recibido por WebSocket:', receivedDiagram);
      setDiagram({
        ...receivedDiagram,
        metadata: {
          created: receivedDiagram.metadata?.created || new Date(),
          modified: new Date(),
          version: receivedDiagram.metadata?.version || '1.0.0',
          author: receivedDiagram.metadata?.author
        }
      });
    });
  }, [onDiagramUpdate]);

  // Auto-guardado cuando el diagrama cambia (solo si estamos editando un proyecto existente)
  useEffect(() => {
    if (currentProject && isClient) {
      // Debounce el auto-guardado para evitar demasiadas llamadas
      const timeoutId = setTimeout(async () => {
        try {
          setIsAutoSaving(true);
          console.log('Auto-guardando proyecto:', currentProject.nombre);
          await projectService.update(currentProject.id, {
            nombre: currentProject.nombre,
            descripcion: currentProject.descripcion,
            contenido_diagrama: diagram
          });
          console.log('Proyecto auto-guardado exitosamente');
        } catch (error) {
          console.error('Error en auto-guardado:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 2000); // Auto-guardar después de 2 segundos de inactividad

      return () => clearTimeout(timeoutId);
    }
  }, [diagram, currentProject, isClient]);

  // Manejar actualización del diagrama
  const handleUpdateDiagram = useCallback((updatedDiagram: UMLDiagram) => {
    const newDiagram = {
      ...updatedDiagram,
      metadata: {
        ...updatedDiagram.metadata,
        created: updatedDiagram.metadata?.created || new Date(),
        version: updatedDiagram.metadata?.version || '1.0.0',
        modified: new Date()
      }
    };
    
    setDiagram(newDiagram);
    
    // Enviar actualización a colaboradores si estamos en una sala
    if (roomState.roomCode) {
      console.log('[Colaboración][TX] Enviando actualización de diagrama a la sala', roomState.roomCode);
      sendDiagramUpdate(newDiagram);
    }
  }, [roomState.roomCode, sendDiagramUpdate]);

  // Crear una nueva entidad
  const handleCreateEntity = useCallback((_type: EntityType) => {
    // Siempre crear como clase estándar
    const baseName = 'Clase';
    const existing = diagram.entities.filter(e => e.name.startsWith(baseName));
    const nextIndex = existing.length + 1;
    const newEntity: UMLEntity = {
      id: `entity-${Date.now()}`,
      name: `${baseName}${nextIndex}`,
      type: 'class',
      attributes: [],
      methods: []
    };

    const updatedDiagram: UMLDiagram = {
      ...diagram,
      entities: [...diagram.entities, newEntity],
      metadata: {
        ...diagram.metadata,
        created: diagram.metadata?.created || new Date(),
        version: diagram.metadata?.version || '1.0.0',
        modified: new Date()
      }
    };

    setDiagram(updatedDiagram);
  }, [diagram]);

  // Crear una nueva relación
  const handleCreateRelation = useCallback((type: RelationType) => {
    // Esta función se activa cuando se selecciona un tipo de relación
    // La creación real se maneja en el DiagramEditor cuando se conectan nodos
    console.log(`Selected relation type: ${type}`);
  }, []);

  // Generar código Spring Boot
  const handleGenerateCode = useCallback(() => {
    console.log('Generating Spring Boot code...', diagram);
    
    // Crear estructura de archivos para el backend
    const entities = diagram.entities.filter(e => !e.isGenerated);
    const intermediateEntities = diagram.entities.filter(e => e.isGenerated);
    
    const codeStructure = {
      entities: entities.map(entity => ({
        name: entity.name,
        className: `${entity.name}.java`,
        attributes: entity.attributes,
        methods: entity.methods || [],
        type: entity.type
      })),
      intermediateEntities: intermediateEntities.map(entity => ({
        name: entity.name,
        className: `${entity.name}.java`,
        attributes: entity.attributes,
        generatedFrom: entity.generatedFrom
      })),
      relations: diagram.relations.map(relation => ({
        id: relation.id,
        source: relation.source,
        target: relation.target,
        type: relation.type,
        sourceCardinality: relation.sourceCardinality.label,
        targetCardinality: relation.targetCardinality.label,
        isManyToMany: CardinalityUtils.isManyToMany(relation),
        isOneToMany: CardinalityUtils.isOneToMany(relation),
        isOneToOne: CardinalityUtils.isOneToOne(relation)
      }))
    };

    console.log('Code structure:', codeStructure);
    
    // Aquí se implementaría la generación real del código
  alert(`Generando código para:\n- ${entities.length} entidades\n- ${intermediateEntities.length} tablas intermedias\n- ${diagram.relations.length} relaciones\n\nLa generación de código se implementará en la integración con el backend.`);
  }, [diagram]);

  // Manejar diagrama generado por IA
  const handleAIGeneratedDiagram = useCallback((newDiagram: UMLDiagram) => {
    const updatedDiagram = {
      ...newDiagram,
      metadata: {
        created: newDiagram.metadata?.created || new Date(),
        modified: new Date(),
        version: newDiagram.metadata?.version || '1.0.0',
        author: newDiagram.metadata?.author
      }
    };
    
    setDiagram(updatedDiagram);
    
    // Enviar actualización a colaboradores si estamos en una sala
    if (roomState.roomCode) {
      sendDiagramUpdate(updatedDiagram);
    }
  }, [roomState.roomCode, sendDiagramUpdate]);

  // Exportar diagrama como JSON
  const handleExportDiagram = useCallback(() => {
    exportDiagramAsJson(diagram);
  }, [diagram]);

  // Exportar proyecto Spring Boot
  const handleExportSpringBoot = useCallback(async () => {
    try {
      const projectName = prompt('Nombre del proyecto:', diagram.name.replace(/\s+/g, '-').toLowerCase()) || 'uml-generated-project';
      const packageName = prompt('Nombre del paquete:', 'com.example.demo') || 'com.example.demo';
      await exportAsZip(diagram, projectName, packageName);
    } catch (error) {
      console.error('Error exporting Spring Boot project:', error);
      alert('Error al exportar el proyecto Spring Boot. Verifica que jszip esté instalado.');
    }
  }, [diagram]);

  // Manejar guardado de proyecto
  const handleSaveProject = useCallback(() => {
    // Si ya tenemos un proyecto, este botón funciona como "Guardar como..."
    // Limpiar currentProject temporalmente para forzar crear nuevo
    if (currentProject) {
      setCurrentProject(null);
    }
    setShowSaveModal(true);
  }, [currentProject]);

  // Manejar éxito del guardado
  const handleSaveSuccess = useCallback((project: any) => {
    // Establecer el proyecto actual para futuras actualizaciones automáticas
    setCurrentProject({
      id: project.id,
      nombre: project.nombre,
      descripcion: project.descripcion
    });
    
    setNotification({
      message: `Proyecto "${project.nombre}" guardado exitosamente`,
      type: 'success'
    });
  }, []);

  // Cerrar notificación
  const handleCloseNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Importar diagrama
  const handleImportDiagram = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedDiagram = JSON.parse(e.target?.result as string);
            setDiagram({
              ...importedDiagram,
              metadata: {
                ...importedDiagram.metadata,
                modified: new Date()
              }
            });
            alert('¡Diagrama importado exitosamente!');
          } catch (error) {
            alert('Error al importar el diagrama. Verifica el formato del archivo.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  // Limpiar herramienta seleccionada
  const handleClearTool = useCallback(() => {
    setSelectedTool(null);
  }, []);

  // Abrir chatbot desde botón de ayuda
  const handleOpenHelp = useCallback(() => {
    console.log('handleOpenHelp called, current activePanel:', activePanel);
    setActivePanel('ai');
    console.log('Setting activePanel to ai');
  }, [activePanel]);

  // Si no estamos en el cliente, no renderizamos nada para evitar problemas de hidratación
  if (!isClient) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Indicador de estado del proyecto */}
      {currentProject && (
        <div className="absolute top-4 left-4 z-50 bg-white rounded-lg shadow-lg px-4 py-2 border">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                {currentProject.nombre}
              </span>
            </div>
            {isAutoSaving && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600">Guardando...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar izquierda */}
      <Sidebar
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
        onCreateEntity={handleCreateEntity}
        onCreateRelation={handleCreateRelation}
        onGenerateCode={handleGenerateCode}
        onExportDiagram={handleExportDiagram}
        onImportDiagram={handleImportDiagram}
      />


      {/* Editor central */}
      <div className="flex-1 flex flex-col">
        <DiagramEditor
          diagram={diagram}
          onUpdateDiagram={handleUpdateDiagram}
          selectedTool={selectedTool}
          onClearTool={handleClearTool}
        />
        {/* Botones principales */}
        <div className="p-4 flex justify-center gap-4 border-t bg-gray-50">
          <button
            onClick={handleSaveProject}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all"
          >
            💾 {currentProject ? 'Guardar como...' : 'Guardar Proyecto'}
          </button>
          <button
            onClick={handleExportSpringBoot}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            🚀 Exportar Backend Spring Boot
          </button>
        </div>
      </div>

      {/* Panel derecho con pestañas para IA, Voz y Colaboración */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Pestañas */}
        <div className="flex border-b">
          <button
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activePanel === 'ai' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            💬 IA/Voz
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'collab' ? null : 'collab')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activePanel === 'collab' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            🤝 Sala
            {roomState.roomCode && (
              <span className="ml-1 px-1 bg-purple-600 text-white text-xs rounded">
                {roomState.clientCount}
              </span>
            )}
          </button>
        </div>

        {/* Contenido del panel activo */}
        <div className="flex-1 min-h-0">
          {activePanel === 'ai' && (
            <AIChatBot
              onDiagramGenerated={handleAIGeneratedDiagram}
              currentDiagram={diagram}
              isEmbedded={true}
            />
          )}
          {activePanel === 'collab' && (
            <CollaborationPanel 
              roomState={roomState}
              createRoom={(d?: UMLDiagram) => {
                console.log('[Colaboración][UI] Crear sala solicitado');
                createRoom(d);
              }}
              joinRoom={(code: string) => {
                console.log('[Colaboración][UI] Unirse a sala solicitado:', code);
                joinRoom(code);
              }}
              leaveRoom={() => {
                console.log('[Colaboración][UI] Salir de sala solicitado');
                leaveRoom();
              }}
            />
          )}
        </div>
      </div>

      {/* Botón de ayuda flotante */}
      <HelpButton />

      {/* Modal para guardar proyecto */}
      <SaveProjectModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        diagramData={diagram}
        onSaveSuccess={handleSaveSuccess}
        currentProject={currentProject}
      />

      {/* Notificaciones */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={handleCloseNotification}
        />
      )}
    </div>
  );
}

export default UMLDiagramApp;