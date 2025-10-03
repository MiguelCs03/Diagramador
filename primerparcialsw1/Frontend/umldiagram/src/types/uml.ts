// Tipos de datos disponibles para atributos
export type DataType = 
  | 'String' 
  | 'Integer' 
  | 'Long' 
  | 'Double' 
  | 'Float' 
  | 'Boolean' 
  | 'Date' 
  | 'DateTime' 
  | 'BigDecimal'
  | 'UUID'
  | 'Text';

// Visibilidad de atributos y métodos
export type Visibility = 'public' | 'private' | 'protected' | 'package';

// Atributo UML extendido
export interface UMLAttribute {
  id: string;
  name: string;
  type: DataType;
  visibility: Visibility;
  isStatic?: boolean;
  isReadonly?: boolean;
  defaultValue?: string;
  isKey?: boolean; // Para identificar llaves primarias
}

// Método UML
export interface UMLMethod {
  id: string;
  name: string;
  returnType: DataType | 'void';
  visibility: Visibility;
  isStatic?: boolean;
  isAbstract?: boolean;
  parameters: UMLParameter[];
}

// Parámetro de método
export interface UMLParameter {
  id: string;
  name: string;
  type: DataType;
}

// Tipos de relaciones UML
export type RelationType = 
  | 'association'    // Asociación simple
  | 'aggregation'    // Agregación (diamante vacío)
  | 'composition'    // Composición (diamante lleno)
  | 'inheritance'    // Herencia (flecha vacía)
  | 'implementation' // Implementación (flecha punteada)
  | 'dependency';    // Dependencia (flecha punteada simple)

// Cardinalidades específicas
export type Cardinality = 
  | '1'       // Exactamente uno
  | '0..1'    // Cero o uno
  | '1..*'    // Uno o más
  | '0..*'    // Cero o más
  | '*'       // Muchos (equivalente a 0..*)
  | '1..1'    // Uno a uno (equivalente a '1')
  | 'n';      // Número específico (para casos especiales)

// Información de cardinalidad en cada extremo de la relación
export interface CardinalityInfo {
  min: number;
  max: number | 'unlimited';
  label: Cardinality;
}

// Relación UML extendida
export interface UMLRelation {
  id: string;
  source: string; // id de la entidad origen
  target: string; // id de la entidad destino
  type: RelationType;
  sourceCardinality: CardinalityInfo;
  targetCardinality: CardinalityInfo;
  sourceRole?: string; // Nombre del rol en el extremo origen
  targetRole?: string; // Nombre del rol en el extremo destino
  label?: string; // Etiqueta opcional para la relación
  isNavigable?: {
    source: boolean; // Si se puede navegar desde source a target
    target: boolean; // Si se puede navegar desde target a source
  };
}

// Tipos de entidades UML
export type EntityType = 'class' | 'interface' | 'abstract' | 'enum' | 'intermediate';

// Entidad UML extendida
export interface UMLEntity {
  id: string;
  name: string;
  type: EntityType;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  // Posición en el lienzo (para colaboración en tiempo real)
  position?: { x: number; y: number };
  isAbstract?: boolean;
  package?: string; // Para organización en paquetes
  stereotype?: string; // Estereotipos UML (<<entity>>, <<controller>>, etc.)
  // Para tablas intermedias generadas automáticamente
  isGenerated?: boolean;
  generatedFrom?: string[]; // IDs de las relaciones que generaron esta tabla
}

// Diagrama UML completo
export interface UMLDiagram {
  id: string;
  name: string;
  entities: UMLEntity[];
  relations: UMLRelation[];
  packages?: string[]; // Lista de paquetes en el diagrama
  metadata?: {
    created: Date;
    modified: Date;
    version: string;
    author?: string;
  };
}

// Configuración para la generación automática de código
export interface CodeGenerationConfig {
  packageName: string;
  basePackage: string;
  generateJPA: boolean;
  generateDTOs: boolean;
  generateCRUD: boolean;
  generateValidation: boolean;
  databaseType: 'mysql' | 'postgresql' | 'h2' | 'oracle';
}

// Utilidades para trabajar con cardinalidades
export const CardinalityUtils = {
  isManyToMany: (relation: UMLRelation): boolean => {
    const sourceIsMany = relation.sourceCardinality.max === 'unlimited' || relation.sourceCardinality.max > 1;
    const targetIsMany = relation.targetCardinality.max === 'unlimited' || relation.targetCardinality.max > 1;
    return sourceIsMany && targetIsMany;
  },
  
  isOneToMany: (relation: UMLRelation): boolean => {
    const sourceIsOne = relation.sourceCardinality.max === 1;
    const targetIsMany = relation.targetCardinality.max === 'unlimited' || relation.targetCardinality.max > 1;
    return sourceIsOne && targetIsMany;
  },
  
  isManyToOne: (relation: UMLRelation): boolean => {
    const sourceIsMany = relation.sourceCardinality.max === 'unlimited' || relation.sourceCardinality.max > 1;
    const targetIsOne = relation.targetCardinality.max === 1;
    return sourceIsMany && targetIsOne;
  },
  
  isOneToOne: (relation: UMLRelation): boolean => {
    return relation.sourceCardinality.max === 1 && relation.targetCardinality.max === 1;
  },
  
  parseCardinality: (cardinality: Cardinality): CardinalityInfo => {
    switch (cardinality) {
      case '1':
      case '1..1':
        return { min: 1, max: 1, label: cardinality };
      case '0..1':
        return { min: 0, max: 1, label: cardinality };
      case '1..*':
        return { min: 1, max: 'unlimited', label: cardinality };
      case '0..*':
      case '*':
        return { min: 0, max: 'unlimited', label: cardinality };
      case 'n':
        return { min: 1, max: 'unlimited', label: cardinality };
      default:
        return { min: 0, max: 'unlimited', label: '*' };
    }
  }
};
