"use client";

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import type {
  UMLDiagram,
  UMLEntity,
  UMLRelation,
  EntityType,
  RelationType,
} from '../types/uml';
import { CardinalityUtils } from '../types/uml';
import UMLClassNode from './UMLClassNode';
import UMLRelationEdge from './UMLRelationEdge';

// Tipos de nodos y bordes personalizados
const nodeTypes = {
  umlClass: UMLClassNode,
};

const edgeTypes = {
  umlRelation: UMLRelationEdge,
};

// Props para el editor
interface DiagramEditorProps {
  diagram: UMLDiagram;
  onUpdateDiagram: (diagram: UMLDiagram) => void;
  selectedTool?: string | null;
  onClearTool?: () => void;
}

// Componente interno que usa hooks de React Flow
const DiagramEditorInner: React.FC<DiagramEditorProps> = ({
  diagram,
  onUpdateDiagram,
  selectedTool,
  onClearTool,
}) => {
  const { project } = useReactFlow();

  // Estado local para nodos y bordes
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Convertir entidades UML a nodos de React Flow
  const convertEntitiesToNodes = useCallback(
    (entities: UMLEntity[]): Node[] => {
      return entities.map((entity, index) => ({
        id: entity.id,
        type: 'umlClass',
        position:
          entity.position || {
            x: 100 + ((index % 3) * 250),
            y: 100 + Math.floor(index / 3) * 200,
          },
        data: {
          entity,
          onUpdateEntity: (updatedEntity: UMLEntity) => {
            const updatedEntities = diagram.entities.map((e) =>
              e.id === updatedEntity.id ? updatedEntity : e
            );
            onUpdateDiagram({ ...diagram, entities: updatedEntities });
          },
          onDeleteEntity: () => {
            // Eliminar entidad y relaciones asociadas
            const remainingEntities = diagram.entities.filter(e => e.id !== entity.id);
            const remainingRelations = diagram.relations.filter(r => r.source !== entity.id && r.target !== entity.id);
            onUpdateDiagram({ ...diagram, entities: remainingEntities, relations: remainingRelations });
          }
        },
      }));
    },
    [diagram, onUpdateDiagram]
  );

  // Convertir relaciones UML a bordes de React Flow
  const convertRelationsToEdges = useCallback(
    (relations: UMLRelation[]): Edge[] => {
      return relations.map((relation) => ({
        id: relation.id,
        source: relation.source,
        target: relation.target,
        type: 'umlRelation',
        data: {
          relation,
          onUpdateRelation: (updatedRelation: UMLRelation) => {
            let updatedRelations = diagram.relations.map((r) =>
              r.id === updatedRelation.id ? updatedRelation : r
            );
            let updatedEntities = [...diagram.entities];

            // Si se convierte en muchos-a-muchos (asociación), ofrecer materializar tabla intermedia
            const shouldMaterialize =
              updatedRelation.type === 'association' &&
              CardinalityUtils.isManyToMany(updatedRelation);

            if (shouldMaterialize) {
              const alreadyMaterialized = updatedEntities.some(
                (e) => e.isGenerated && e.generatedFrom?.includes(updatedRelation.id)
              );

              if (!alreadyMaterialized) {
                const confirmMat = typeof window !== 'undefined'
                  ? window.confirm('La relación es muchos-a-muchos. ¿Deseas crear una tabla intermedia automáticamente?')
                  : true;

                if (confirmMat) {
                  const sourceEntity = updatedEntities.find((e) => e.id === updatedRelation.source);
                  const targetEntity = updatedEntities.find((e) => e.id === updatedRelation.target);

                  if (sourceEntity && targetEntity) {
                    const intermediateEntity: UMLEntity = {
                      id: `intermediate-${Date.now()}`,
                      name: `${sourceEntity.name}_${targetEntity.name}`,
                      type: 'intermediate',
                      attributes: [
                        {
                          id: `attr-${Date.now()}-1`,
                          name: `${sourceEntity.name.toLowerCase()}Id`,
                          type: 'Long',
                          visibility: 'private',
                          isKey: true,
                        },
                        {
                          id: `attr-${Date.now()}-2`,
                          name: `${targetEntity.name.toLowerCase()}Id`,
                          type: 'Long',
                          visibility: 'private',
                          isKey: true,
                        },
                      ],
                      methods: [],
                      isGenerated: true,
                      generatedFrom: [updatedRelation.id],
                    };

                    updatedEntities = [...updatedEntities, intermediateEntity];

                    const sourceToIntermediate: UMLRelation = {
                      id: `relation-${Date.now()}-1`,
                      source: updatedRelation.source,
                      target: intermediateEntity.id,
                      type: 'association',
                      sourceCardinality: CardinalityUtils.parseCardinality('1'),
                      targetCardinality: CardinalityUtils.parseCardinality('0..*'),
                      isNavigable: { source: true, target: true },
                    };

                    const intermediateToTarget: UMLRelation = {
                      id: `relation-${Date.now()}-2`,
                      source: intermediateEntity.id,
                      target: updatedRelation.target,
                      type: 'association',
                      sourceCardinality: CardinalityUtils.parseCardinality('0..*'),
                      targetCardinality: CardinalityUtils.parseCardinality('1'),
                      isNavigable: { source: true, target: true },
                    };

                    // Remover la relación original ya materializada
                    updatedRelations = updatedRelations.filter((r) => r.id !== updatedRelation.id);
                    updatedRelations.push(sourceToIntermediate, intermediateToTarget);
                  }
                }
              }
            }

            onUpdateDiagram({ ...diagram, entities: updatedEntities, relations: updatedRelations });
          },
          onDeleteRelation: () => {
            const remainingRelations = diagram.relations.filter(r => r.id !== relation.id);
            onUpdateDiagram({ ...diagram, relations: remainingRelations });
          }
        },
      }));
    },
    [diagram, onUpdateDiagram]
  );

  // Actualizar nodos y bordes cuando cambie el diagrama
  useEffect(() => {
    setNodes(convertEntitiesToNodes(diagram.entities));
    setEdges(convertRelationsToEdges(diagram.relations));
  }, [diagram.entities, diagram.relations, convertEntitiesToNodes, convertRelationsToEdges]);

  // Cambios en nodos (solo estado local para arrastre fluido)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Cambios en bordes (solo estado local)
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Al soltar un nodo, persistir posición y propagar
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      const updatedEntities = diagram.entities.map((entity) =>
        entity.id === node.id
          ? { ...entity, position: { x: node.position.x, y: node.position.y } }
          : entity
      );
      const updatedDiagram: UMLDiagram = {
        ...diagram,
        entities: updatedEntities,
        metadata: {
          created: diagram.metadata?.created || new Date(),
          modified: new Date(),
          version: diagram.metadata?.version || '1.0.0',
          author: diagram.metadata?.author,
        },
      };
      onUpdateDiagram(updatedDiagram);
    },
    [diagram, onUpdateDiagram]
  );

  // Crear nueva entidad
  const createEntity = useCallback(
    (type: EntityType, position: { x: number; y: number }) => {
      const newEntity: UMLEntity = {
        id: `entity-${Date.now()}`,
        name: `New${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        attributes: [],
        methods: [],
        position,
      };

      const newNode: Node = {
        id: newEntity.id,
        type: 'umlClass',
        position,
        data: {
          entity: newEntity,
          onUpdateEntity: (updatedEntity: UMLEntity) => {
            const updatedEntities = diagram.entities.map((e) =>
              e.id === updatedEntity.id ? updatedEntity : e
            );
            onUpdateDiagram({ ...diagram, entities: updatedEntities });
          },
        },
      };

      const updatedEntities = [...diagram.entities, newEntity];
      onUpdateDiagram({ ...diagram, entities: updatedEntities });
      setNodes((nds) => [...nds, newNode]);
    },
    [diagram, onUpdateDiagram]
  );

  // Crear nueva relación
  const createRelation = useCallback(
    (
      type: RelationType,
      sourceId: string,
      targetId: string,
      sourceCardinality = '1',
      targetCardinality = '1'
    ) => {
      const sourceCardinalityInfo = CardinalityUtils.parseCardinality(
        sourceCardinality as any
      );
      const targetCardinalityInfo = CardinalityUtils.parseCardinality(
        targetCardinality as any
      );

      const newRelation: UMLRelation = {
        id: `relation-${Date.now()}`,
        source: sourceId,
        target: targetId,
        type,
        sourceCardinality: sourceCardinalityInfo,
        targetCardinality: targetCardinalityInfo,
        isNavigable: {
          source: type !== 'dependency',
          target: true,
        },
      };

      let updatedEntities = [...diagram.entities];
      let updatedRelations = [...diagram.relations, newRelation];

      if (CardinalityUtils.isManyToMany(newRelation) && type === 'association') {
        const sourceEntity = diagram.entities.find((e) => e.id === sourceId);
        const targetEntity = diagram.entities.find((e) => e.id === targetId);

        if (sourceEntity && targetEntity) {
          const intermediateEntity: UMLEntity = {
            id: `intermediate-${Date.now()}`,
            name: `${sourceEntity.name}_${targetEntity.name}`,
            type: 'intermediate',
            attributes: [
              {
                id: `attr-${Date.now()}-1`,
                name: `${sourceEntity.name.toLowerCase()}Id`,
                type: 'Long',
                visibility: 'private',
                isKey: true,
              },
              {
                id: `attr-${Date.now()}-2`,
                name: `${targetEntity.name.toLowerCase()}Id`,
                type: 'Long',
                visibility: 'private',
                isKey: true,
              },
            ],
            methods: [],
            isGenerated: true,
            generatedFrom: [newRelation.id],
          };

          updatedEntities.push(intermediateEntity);

          const sourceToIntermediate: UMLRelation = {
            id: `relation-${Date.now()}-1`,
            source: sourceId,
            target: intermediateEntity.id,
            type: 'association',
            sourceCardinality: CardinalityUtils.parseCardinality('1'),
            targetCardinality: CardinalityUtils.parseCardinality('0..*'),
            isNavigable: { source: true, target: true },
          };

          const intermediateToTarget: UMLRelation = {
            id: `relation-${Date.now()}-2`,
            source: intermediateEntity.id,
            target: targetId,
            type: 'association',
            sourceCardinality: CardinalityUtils.parseCardinality('0..*'),
            targetCardinality: CardinalityUtils.parseCardinality('1'),
            isNavigable: { source: true, target: true },
          };

          updatedRelations = updatedRelations.filter((r) => r.id !== newRelation.id);
          updatedRelations.push(sourceToIntermediate, intermediateToTarget);
        }
      }

      onUpdateDiagram({ ...diagram, entities: updatedEntities, relations: updatedRelations });
    },
    [diagram, onUpdateDiagram]
  );

  // Manejar conexiones entre nodos
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && selectedTool?.startsWith('relation-')) {
        const relationType = selectedTool.replace('relation-', '') as RelationType;
        createRelation(relationType, connection.source, connection.target, '1', '1');
        if (onClearTool) onClearTool();
      }
    },
    [createRelation, selectedTool, onClearTool]
  );

  // Manejar click en el panel
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (selectedTool?.startsWith('entity-')) {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const position = project({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });

        const entityType = selectedTool.replace('entity-', '') as EntityType;
        createEntity(entityType, position);
        if (onClearTool) onClearTool();
      }
    },
    [selectedTool, project, createEntity, onClearTool]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        key={`${diagram.id}-${diagram.entities.length}-${diagram.relations.length}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        fitView
        attributionPosition="bottom-left"
        className={selectedTool ? 'cursor-crosshair' : 'cursor-default'}
        nodesDraggable
        snapToGrid
        snapGrid={[10, 10]}
      >
        <Background color="#f1f5f9" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const entity = node.data?.entity as UMLEntity;
            switch (entity?.type) {
              case 'interface':
                return '#22c55e';
              case 'abstract':
                return '#a855f7';
              case 'enum':
                return '#f97316';
              case 'intermediate':
                return '#6b7280';
              default:
                return '#3b82f6';
            }
          }}
        />
      </ReactFlow>

      {/* Barra de estado */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-between items-center text-sm text-gray-600">
        <div>Entidades: {diagram.entities.length} | Relaciones: {diagram.relations.length}</div>
        {selectedTool && (
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 font-medium">Herramienta Activa:</span>
            <span className="capitalize">{selectedTool.replace('-', ' ')}</span>
            <button onClick={onClearTool} className="text-red-600 hover:text-red-800 ml-2">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal que envuelve el componente interno con el proveedor
const DiagramEditor: React.FC<DiagramEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DiagramEditorInner {...props} />
    </ReactFlowProvider>
  );
};

export default DiagramEditor;
