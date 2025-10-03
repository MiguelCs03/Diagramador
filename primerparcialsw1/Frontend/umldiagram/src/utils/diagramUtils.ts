import type { 
  UMLDiagram, 
  UMLEntity, 
  UMLRelation, 
  UMLAttribute
} from '../types/uml';
import { CardinalityUtils } from '../types/uml';
/**
 * Utilidades para la gestión automática de tablas intermedias
 * según las reglas de UML y diseño de bases de datos
 */
export class IntermediateTableManager {
  
  /**
   * Detecta relaciones many-to-many y genera tablas intermedias automáticamente
   */
  static processRelations(diagram: UMLDiagram): UMLDiagram {
    let updatedEntities = [...diagram.entities];
    let updatedRelations = [...diagram.relations];
    
    // Buscar relaciones many-to-many que necesiten tablas intermedias
    const manyToManyRelations = diagram.relations.filter(relation => 
      CardinalityUtils.isManyToMany(relation) && relation.type === 'association'
    );

    for (const relation of manyToManyRelations) {
      const sourceEntity = diagram.entities.find(e => e.id === relation.source);
      const targetEntity = diagram.entities.find(e => e.id === relation.target);
      
      if (!sourceEntity || !targetEntity) continue;

      // Verificar si ya existe una tabla intermedia para esta relación
      const existingIntermediate = updatedEntities.find(e => 
        e.isGenerated && e.generatedFrom?.includes(relation.id)
      );

      if (existingIntermediate) continue;

      // Crear tabla intermedia
      const intermediateEntity = this.createIntermediateTable(
        sourceEntity, 
        targetEntity, 
        relation
      );

      updatedEntities.push(intermediateEntity);

      // Reemplazar la relación many-to-many con dos relaciones one-to-many
      const { sourceToIntermediate, intermediateToTarget } = this.createIntermediateRelations(
        sourceEntity,
        targetEntity,
        intermediateEntity,
        relation
      );

      // Remover la relación original y agregar las nuevas
      updatedRelations = updatedRelations.filter(r => r.id !== relation.id);
      updatedRelations.push(sourceToIntermediate, intermediateToTarget);
    }

    return {
      ...diagram,
      entities: updatedEntities,
      relations: updatedRelations
    };
  }

  /**
   * Crea una tabla intermedia para una relación many-to-many
   */
  private static createIntermediateTable(
    sourceEntity: UMLEntity,
    targetEntity: UMLEntity,
    relation: UMLRelation
  ): UMLEntity {
    const tableName = this.generateIntermediateTableName(sourceEntity.name, targetEntity.name);
    
    const attributes: UMLAttribute[] = [
      {
        id: `attr-${Date.now()}-${sourceEntity.id}`,
        name: `${this.toCamelCase(sourceEntity.name)}Id`,
        type: 'Long',
        visibility: 'private',
        isKey: true
      },
      {
        id: `attr-${Date.now()}-${targetEntity.id}`,
        name: `${this.toCamelCase(targetEntity.name)}Id`,
        type: 'Long',
        visibility: 'private',
        isKey: true
      }
    ];

    // Agregar atributos adicionales si la relación tiene roles o propiedades
    if (relation.label) {
      attributes.push({
        id: `attr-${Date.now()}-label`,
        name: 'relationshipType',
        type: 'String',
        visibility: 'private'
      });
    }

    return {
      id: `intermediate-${Date.now()}`,
      name: tableName,
      type: 'intermediate',
      attributes,
      methods: [],
      isGenerated: true,
      generatedFrom: [relation.id],
      stereotype: '<<intermediate>>'
    };
  }

  /**
   * Crea las relaciones one-to-many hacia y desde la tabla intermedia
   */
  private static createIntermediateRelations(
    sourceEntity: UMLEntity,
    targetEntity: UMLEntity,
    intermediateEntity: UMLEntity,
    originalRelation: UMLRelation
  ) {
    const sourceToIntermediate: UMLRelation = {
      id: `relation-${Date.now()}-source`,
      source: sourceEntity.id,
      target: intermediateEntity.id,
      type: 'association',
      sourceCardinality: CardinalityUtils.parseCardinality('1'),
      targetCardinality: CardinalityUtils.parseCardinality('0..*'),
      sourceRole: originalRelation.sourceRole,
      targetRole: `${this.toCamelCase(targetEntity.name)}Relationships`,
      isNavigable: { source: true, target: true }
    };

    const intermediateToTarget: UMLRelation = {
      id: `relation-${Date.now()}-target`,
      source: intermediateEntity.id,
      target: targetEntity.id,
      type: 'association',
      sourceCardinality: CardinalityUtils.parseCardinality('0..*'),
      targetCardinality: CardinalityUtils.parseCardinality('1'),
      sourceRole: `${this.toCamelCase(sourceEntity.name)}Relationships`,
      targetRole: originalRelation.targetRole,
      isNavigable: { source: true, target: true }
    };

    return { sourceToIntermediate, intermediateToTarget };
  }

  /**
   * Genera un nombre apropiado para la tabla intermedia
   */
  private static generateIntermediateTableName(sourceName: string, targetName: string): string {
    // Ordenar alfabéticamente para consistencia
    const names = [sourceName, targetName].sort();
    return `${names[0]}${names[1]}`;
  }

  /**
   * Convierte a camelCase
   */
  private static toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Limpia tablas intermedias huérfanas (que ya no tienen relaciones asociadas)
   */
  static cleanOrphanedIntermediateTables(diagram: UMLDiagram): UMLDiagram {
    const activeRelationIds = new Set(diagram.relations.map(r => r.id));
    
    const cleanedEntities = diagram.entities.filter(entity => {
      if (!entity.isGenerated || !entity.generatedFrom) return true;
      
      // Mantener la tabla intermedia solo si alguna de sus relaciones generadoras aún existe
      return entity.generatedFrom.some(relationId => activeRelationIds.has(relationId));
    });

    return {
      ...diagram,
      entities: cleanedEntities
    };
  }

  /**
   * Valida que las relaciones many-to-many tengan sus tablas intermedias correspondientes
   */
  static validateIntermediateTables(diagram: UMLDiagram): string[] {
    const issues: string[] = [];
    
    const manyToManyRelations = diagram.relations.filter(relation => 
      CardinalityUtils.isManyToMany(relation) && relation.type === 'association'
    );

    for (const relation of manyToManyRelations) {
      const hasIntermediateTable = diagram.entities.some(entity => 
        entity.isGenerated && entity.generatedFrom?.includes(relation.id)
      );

      if (!hasIntermediateTable) {
        const sourceEntity = diagram.entities.find(e => e.id === relation.source);
        const targetEntity = diagram.entities.find(e => e.id === relation.target);
        
        issues.push(
          `Many-to-many relationship between ${sourceEntity?.name} and ${targetEntity?.name} needs an intermediate table`
        );
      }
    }

    return issues;
  }
}

/**
 * Validador de diagramas UML
 */
export class UMLDiagramValidator {
  
  /**
   * Valida todo el diagrama y retorna una lista de issues
   */
  static validateDiagram(diagram: UMLDiagram): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validar entidades
    this.validateEntities(diagram.entities, errors, warnings, suggestions);
    
    // Validar relaciones
    this.validateRelations(diagram, errors, warnings, suggestions);
    
    // Validar tablas intermedias
    const intermediateIssues = IntermediateTableManager.validateIntermediateTables(diagram);
    warnings.push(...intermediateIssues);

    return { errors, warnings, suggestions };
  }

  /**
   * Valida las entidades del diagrama
   */
  private static validateEntities(
    entities: UMLEntity[], 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ) {
    const entityNames = new Set<string>();

    for (const entity of entities) {
      // Verificar nombres duplicados
      if (entityNames.has(entity.name)) {
        errors.push(`Duplicate entity name: ${entity.name}`);
      }
      entityNames.add(entity.name);

      // Verificar que las entidades tengan al menos un atributo
      if (!entity.isGenerated && entity.attributes.length === 0) {
        warnings.push(`Entity ${entity.name} has no attributes`);
      }

      // Verificar que haya al least una clave primaria
      const hasKey = entity.attributes.some(attr => attr.isKey);
      if (!entity.isGenerated && !hasKey && entity.type !== 'interface') {
        suggestions.push(`Consider adding a primary key to ${entity.name}`);
      }

      // Validar nombres de atributos
      const attributeNames = new Set<string>();
      for (const attribute of entity.attributes) {
        if (attributeNames.has(attribute.name)) {
          errors.push(`Duplicate attribute name in ${entity.name}: ${attribute.name}`);
        }
        attributeNames.add(attribute.name);

        // Sugerir convenciones de nomenclatura
        if (attribute.name.includes(' ') || attribute.name.includes('-')) {
          suggestions.push(`Use camelCase for attribute ${attribute.name} in ${entity.name}`);
        }
      }
    }
  }

  /**
   * Valida las relaciones del diagrama
   */
  private static validateRelations(
    diagram: UMLDiagram, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ) {
    const entityIds = new Set(diagram.entities.map(e => e.id));

    for (const relation of diagram.relations) {
      // Verificar que las entidades existan
      if (!entityIds.has(relation.source)) {
        errors.push(`Relation ${relation.id} references non-existent source entity`);
      }
      if (!entityIds.has(relation.target)) {
        errors.push(`Relation ${relation.id} references non-existent target entity`);
      }

      // Verificar relaciones circulares de herencia
      if (relation.type === 'inheritance') {
        if (this.hasCircularInheritance(diagram, relation.source, relation.target)) {
          errors.push(`Circular inheritance detected involving ${relation.source} and ${relation.target}`);
        }
      }

      // Sugerir optimizaciones
      if (CardinalityUtils.isManyToMany(relation) && relation.type === 'composition') {
        warnings.push(`Many-to-many composition relationship may not be semantically correct`);
      }
    }
  }

  /**
   * Detecta herencia circular
   */
  private static hasCircularInheritance(
    diagram: UMLDiagram, 
    sourceId: string, 
    targetId: string, 
    visited = new Set<string>()
  ): boolean {
    if (visited.has(targetId)) {
      return targetId === sourceId;
    }

    visited.add(targetId);

    const inheritanceRelations = diagram.relations.filter(r => 
      r.type === 'inheritance' && r.source === targetId
    );

    for (const relation of inheritanceRelations) {
      if (this.hasCircularInheritance(diagram, sourceId, relation.target, new Set(visited))) {
        return true;
      }
    }

    return false;
  }
}