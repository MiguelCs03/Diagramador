import type { UMLDiagram, UMLEntity, UMLRelation, DataType, Visibility, RelationType, EntityType } from '../types/uml';
import { CardinalityUtils } from '../types/uml';

// GROQ API Configuration
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// OpenAI API Configuration (comentado para revertir fácil)
// const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
// const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface DiagramGenerationRequest {
  description: string;
  businessContext?: string;
  additionalRequirements?: string;
}

export interface DiagramGenerationResponse {
  success: boolean;
  diagram?: UMLDiagram;
  error?: string;
  explanation?: string;
}

export interface DiagramModificationRequest {
  command: string;
  currentDiagram: UMLDiagram;
  context?: string;
}

export interface DiagramModificationResponse {
  success: boolean;
  updatedDiagram?: UMLDiagram;
  message?: string;
  error?: string;
  action?: 'add' | 'modify' | 'delete' | 'explain';
}

export interface VoiceCommandRequest {
  command: string;
  currentDiagram?: UMLDiagram;
  context?: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  updatedDiagram?: UMLDiagram;
  message?: string;
  error?: string;
  action?: 'create' | 'modify' | 'delete' | 'explain';
}

export class AIService {
  // Función simple para detectar la intención del usuario (KISS principle)
  static detectUserIntent(message: string, hasCurrentDiagram: boolean): 'create' | 'modify' | 'chat' {
    console.log('🔍 [DETECT INTENT] Analizando mensaje:', message);
    console.log('📊 [DETECT INTENT] ¿Tiene diagrama actual?:', hasCurrentDiagram);
    
    const lowerMessage = message.toLowerCase();
    
    // Palabras clave para modificación
    const modifyKeywords = [
      'añade', 'agrega', 'añadir', 'agregar', 'add',
      'modifica', 'modificar', 'modify', 'cambiar', 'change',
      'elimina', 'eliminar', 'delete', 'remove', 'quitar',
      'actualiza', 'actualizar', 'update', 'relación', 'relacion'
    ];
    
    // Palabras clave para creación completa
    const createKeywords = [
      'crea', 'crear', 'create', 'generar', 'generate',
      'diseña', 'diseñar', 'design', 'sistema', 'diagrama'
    ];
    
    // Si no hay diagrama actual, siempre crear
    if (!hasCurrentDiagram) {
      console.log('🆕 [DETECT INTENT] No hay diagrama actual → Intención: CREATE');
      return 'create';
    }
    
    // Buscar palabras clave de modificación
    const hasModifyKeyword = modifyKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log('🔍 [DETECT INTENT] ¿Contiene palabra de modificación?:', hasModifyKeyword);
    console.log('🔍 [DETECT INTENT] Palabras encontradas:', modifyKeywords.filter(k => lowerMessage.includes(k)));
    
    if (hasModifyKeyword) {
      console.log('✏️ [DETECT INTENT] Intención detectada: MODIFY');
      return 'modify';
    }
    
    // Buscar palabras clave de creación completa
    const hasCreateKeyword = createKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log('🔍 [DETECT INTENT] ¿Contiene palabra de creación?:', hasCreateKeyword);
    
    if (hasCreateKeyword) {
      console.log('🆕 [DETECT INTENT] Intención detectada: CREATE');
      return 'create';
    }
    
    // Si no es claro, defaultear a chat conversacional
    console.log('💬 [DETECT INTENT] Intención por defecto: CHAT');
    return 'chat';
  }

  static async generateDiagram(request: DiagramGenerationRequest): Promise<DiagramGenerationResponse> {
    console.log('🚀 [AI Service] Iniciando generación de diagrama:', request);
    
    if (!GROQ_API_KEY) {
      console.error('❌ [AI Service] GROQ_API_KEY no está configurada');
      return {
        success: false,
        error: 'La clave de API de Groq no está configurada. Por favor, configura la variable de entorno.'
      };
    }

    try {
      const prompt = this.createPrompt(request);
      console.log('📝 [AI Service] Prompt generado:', prompt);
      
      // Nuevo prompt en español, más tolerante y con ejemplos
      const systemPrompt = `Eres un asistente experto en UML. Tu tarea es crear diagramas de clases/tablas en español según la descripción del usuario.

Responde SIEMPRE con clases y atributos en español, usando nombres intuitivos y realistas.

Si el usuario no indica el número de clases/tablas, elige automáticamente una cantidad razonable (por ejemplo, entre 6 y 8) según el contexto del sistema descrito.

Ejemplo de entrada válida:
- "Crea un diagrama de ventas"
- "Agrega la clase Producto con atributos nombre, precio y stock"
- "Sistema de biblioteca con clases Libro, Autor y Usuario"

No requieres formato especial, solo entiende la intención y genera el diagrama en JSON.

Formato de respuesta:
{
  "entities": [
    {
      "id": "unique_id",
      "name": "NombreClase",
      "type": "class",
      "position": {"x": 100, "y": 100},
      "attributes": [
        {"name": "nombre", "type": "String", "visibility": "public"},
        {"name": "precio", "type": "Double", "visibility": "private"}
      ]
    }
  ],
  "relations": [
    {"id": "rel1", "sourceId": "id1", "targetId": "id2", "type": "association", "sourceCardinality": "1", "targetCardinality": "*"}
  ]
}

No incluyas explicaciones ni texto adicional, solo el JSON.`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          model: "llama-3.1-8b-instant", // Modelo actualizado de Groq
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 1,
          stream: false
        })
      });
        
      // OpenAI fetch (comentado)
      // const response = await fetch(OPENAI_API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${OPENAI_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     messages: [
      //       { role: "system", content: systemPrompt },
      //       { role: "user", content: prompt }
      //     ],
      //     model: "gpt-3.5-turbo",
      //     temperature: 0.7,
      //     max_tokens: 4000,
      //     top_p: 1,
      //     stream: false
      //   })
      // });

      if (!response.ok) {
        console.error('❌ [AI Service] OpenAI API error:', response.status, response.statusText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 [AI Service] Respuesta de OpenAI:', data);
      
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('❌ [AI Service] No content received from OpenAI API');
        throw new Error('No content received from OpenAI API');
      }

      console.log('🤖 [AI Service] Contenido de IA:', content);

      // Parse the JSON response
      const parsedResponse = this.parseAIResponse(content);
      console.log('📊 [AI Service] Respuesta parseada:', parsedResponse);
      
      if (!parsedResponse) {
        console.error('❌ [AI Service] Failed to parse OpenAI response as valid JSON');
        throw new Error('Failed to parse OpenAI response as valid JSON');
      }

      // Convert to UML diagram format
      const diagram = this.convertToUMLDiagram(parsedResponse);
      console.log('✅ [AI Service] Diagrama convertido:', diagram);

      return {
        success: true,
        diagram,
        explanation: `Generated UML diagram with ${diagram.entities.length} entities and ${diagram.relations.length} relations.`
      };

    } catch (error) {
      console.error('❌ [AI Service] Error generating diagram:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Nueva función para modificaciones incrementales (YAGNI - solo lo que necesitamos)
  static async modifyDiagram(request: DiagramModificationRequest): Promise<DiagramModificationResponse> {
    console.log('🔧 [MODIFY DIAGRAM] Iniciando modificación de diagrama');
    console.log('📝 [MODIFY DIAGRAM] Comando recibido:', request.command);
    console.log('📊 [MODIFY DIAGRAM] Diagrama actual:', {
      entidades: request.currentDiagram.entities.map(e => e.name),
      relaciones: request.currentDiagram.relations.length
    });

    try {
      const systemPrompt = `Eres un asistente para modificar diagramas UML. Modifica diagramas existentes según los comandos del usuario.

ENTIDADES DEL DIAGRAMA ACTUAL: ${request.currentDiagram.entities.map(e => e.name).join(', ')}

Tu tarea es entender el comando del usuario y proporcionar SOLO las modificaciones específicas necesarias.

IMPORTANTE: Responde SOLO con JSON válido en este formato:
{
  "action": "add|modify|delete",
  "message": "Descripción breve de lo realizado",
  "changes": {
    "newEntities": [
      {
        "id": "unique_id",
        "name": "ClassName",
        "type": "class",
        "attributes": [{"name": "attr", "type": "String", "visibility": "private"}],
        "methods": [{"name": "method", "returnType": "void", "parameters": [], "visibility": "public"}],
        "position": {"x": 100, "y": 100}
      }
    ],
    "modifiedEntities": [
      {
        "id": "existing_entity_id",
        "changes": {
          "newAttributes": [{"name": "attr", "type": "String", "visibility": "private"}],
          "newMethods": [{"name": "method", "returnType": "void", "parameters": [], "visibility": "public"}],
          "deletedAttributes": ["attribute_name_to_delete"],
          "deletedMethods": ["method_name_to_delete"]
        }
      }
    ],
    "newRelations": [
      {
        "id": "unique_relation_id",
        "sourceId": "source_entity_id_or_name",
        "targetId": "target_entity_id_or_name",
        "type": "association|inheritance|generalization|composition|aggregation|dependency|implementation",
        "sourceCardinality": "1",
        "targetCardinality": "*"
      }
    ],
    "deletedEntities": ["entity_name_to_delete"],
    "deletedRelations": ["relation_id_to_delete", "entre Cliente y Factura"]
  }
}

TIPOS DE RELACIONES (elige el correcto según el comando):
1. ASOCIACIÓN (association): relación simple entre clases
   - Palabras clave: "asociación", "relación", "relaciona", "conecta", "vincula", "tiene", "posee"
   - Ejemplo: "Cliente tiene Direccion" → type: "association"

2. HERENCIA/GENERALIZACIÓN (inheritance o generalization): relación de herencia (flecha vacía)
   - Palabras clave: "herencia", "generalización", "hereda de", "extiende", "es un tipo de", "es hijo de", "especialización"
   - Ejemplo: "Empleado hereda de Persona" → type: "inheritance", sourceId: "Empleado", targetId: "Persona"
   - IMPORTANTE: sourceId es la clase HIJA, targetId es la clase PADRE

3. COMPOSICIÓN (composition): relación fuerte contenedor-contenido (rombo LLENO)
   - Palabras clave: "composición", "compuesto por", "contiene", "se compone de", "está formado por"
   - Ejemplo: "Edificio compuesto por Aulas" → type: "composition", sourceId: "Edificio" (contenedor), targetId: "Aula" (contenido)
   - IMPORTANTE: El rombo lleno va en el CONTENEDOR (sourceId), NO en el contenido

4. AGREGACIÓN (aggregation): relación débil contenedor-contenido (rombo VACÍO)
   - Palabras clave: "agregación", "agrega", "incluye", "puede tener"
   - Ejemplo: "Departamento agrega Empleados" → type: "aggregation", sourceId: "Departamento", targetId: "Empleado"
   - IMPORTANTE: El rombo vacío va en el CONTENEDOR (sourceId)

5. DEPENDENCIA (dependency): relación de uso temporal (flecha punteada)
   - Palabras clave: "depende de", "usa", "utiliza temporalmente"
   - Ejemplo: "Controlador usa Servicio" → type: "dependency"

6. IMPLEMENTACIÓN (implementation): implementa interfaz (flecha punteada vacía)
   - Palabras clave: "implementa", "realiza"
   - Ejemplo: "ClaseImpl implementa Interface" → type: "implementation"

CARDINALIDADES (acepta múltiples formatos):
- "1" o "1..1" → exactamente uno
- "*" o "0..*" o "muchos" → cero o muchos
- "0..1" o "opcional" → cero o uno
- "1..*" o "uno o más" → uno o muchos
- Ejemplos naturales que DEBES reconocer:
  * "uno a uno", "1 a 1" → sourceCardinality: "1", targetCardinality: "1"
  * "uno a muchos", "1 a *", "1 a varios" → sourceCardinality: "1", targetCardinality: "*"
  * "muchos a muchos", "* a *" → sourceCardinality: "*", targetCardinality: "*"
  * "cardinalidad 1 en Cliente y * en Factura" → sourceCardinality: "1", targetCardinality: "*"

EJEMPLOS DE COMANDOS QUE DEBES ENTENDER:

1. Asociación simple:
   "Agrega una relación de asociación entre Cliente y Direccion con cardinalidad 1 a 1"
   → {"newRelations": [{"type": "association", "sourceId": "Cliente", "targetId": "Direccion", "sourceCardinality": "1", "targetCardinality": "1"}]}

2. Composición (rombo en contenedor):
   "Edificio está compuesto por Aulas con cardinalidad 1 a muchos"
   → {"newRelations": [{"type": "composition", "sourceId": "Edificio", "targetId": "Aula", "sourceCardinality": "1", "targetCardinality": "*"}]}
   
   "Aula pertenece a Edificio (composición)"
   → {"newRelations": [{"type": "composition", "sourceId": "Edificio", "targetId": "Aula", "sourceCardinality": "1", "targetCardinality": "*"}]}

3. Herencia:
   "Empleado hereda de Persona"
   → {"newRelations": [{"type": "inheritance", "sourceId": "Empleado", "targetId": "Persona"}]}
   
   "Agrega generalización de Persona a Cliente"
   → {"newRelations": [{"type": "inheritance", "sourceId": "Cliente", "targetId": "Persona"}]}

4. Cardinalidad variada:
   "Usuario tiene muchas Facturas (1 a *)"
   → {"newRelations": [{"type": "association", "sourceId": "Usuario", "targetId": "Factura", "sourceCardinality": "1", "targetCardinality": "*"}]}

Para comandos ADD: crear nuevas entidades/relaciones
Para comandos MODIFY: actualizar entidades existentes
Para comandos DELETE: eliminar entidades/relaciones/atributos/métodos específicos

IMPORTANTE para eliminar elementos específicos:
- Para eliminar atributo: usar "deletedAttributes" en modifiedEntities con el nombre del atributo
- Para eliminar método: usar "deletedMethods" en modifiedEntities con el nombre del método  
- Para eliminar relación: usar "deletedRelations" con el ID de la relación o descripción "entre EntityA y EntityB"
- Para eliminar entidad completa: usar "deletedEntities"

Mantén las modificaciones mínimas y enfocadas solo a lo que pidió el usuario.`;

    console.log('🚀 [MODIFY DIAGRAM] Enviando request a GROQ API...');
    console.log('🔑 [MODIFY DIAGRAM] API Key configurada:', GROQ_API_KEY ? 'SÍ (primeros 10 chars: ' + GROQ_API_KEY.substring(0, 10) + '...)' : 'NO');

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.command }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 1500,
        stream: false
      })
    });
    
    console.log('📡 [MODIFY DIAGRAM] Response status:', response.status, response.statusText);
    console.log('📡 [MODIFY DIAGRAM] Response status:', response.status, response.statusText);
    
    // OpenAI fetch (comentado)
    // const response = await fetch(OPENAI_API_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     messages: [
    //       { role: "system", content: systemPrompt },
    //       { role: "user", content: request.command }
    //     ],
    //     model: "gpt-3.5-turbo",
    //     temperature: 0.3,
    //     max_tokens: 1500,
    //     stream: false
    //   })
    // });

      if (!response.ok) {
        console.error('❌ [MODIFY DIAGRAM] Error en respuesta de API:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ [MODIFY DIAGRAM] Error details:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      console.log('✅ [MODIFY DIAGRAM] Respuesta OK, parseando JSON...');
      const data = await response.json();
      console.log('📦 [MODIFY DIAGRAM] Respuesta completa de API:', JSON.stringify(data, null, 2));
      
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('❌ [MODIFY DIAGRAM] No content received from API');
        console.error('❌ [MODIFY DIAGRAM] Data received:', data);
        throw new Error('No content received from OpenAI API');
      }

      console.log('🤖 [MODIFY DIAGRAM] Contenido de IA recibido:', content);
      console.log('🔍 [MODIFY DIAGRAM] Parseando respuesta de IA...');

      const parsedResponse = this.parseAIResponse(content);
      
      if (!parsedResponse) {
        console.error('❌ [MODIFY DIAGRAM] Failed to parse AI response');
        console.error('❌ [MODIFY DIAGRAM] Content que falló:', content);
        throw new Error('Failed to parse OpenAI response');
      }

      console.log('✅ [MODIFY DIAGRAM] Respuesta parseada exitosamente:', JSON.stringify(parsedResponse, null, 2));
      console.log('🔄 [MODIFY DIAGRAM] Aplicando modificaciones al diagrama...');

      const updatedDiagram = this.applyModificationsToDiagram(request.currentDiagram, parsedResponse.changes);

      console.log('✅ [MODIFY DIAGRAM] Modificaciones aplicadas exitosamente');
      console.log('📊 [MODIFY DIAGRAM] Diagrama actualizado:', {
        entidades: updatedDiagram.entities.length,
        relaciones: updatedDiagram.relations.length
      });

      return {
        success: true,
        updatedDiagram,
        message: parsedResponse.message || 'Diagrama modificado correctamente',
        action: parsedResponse.action || 'modify'
      };

    } catch (error) {
      console.error('❌ [MODIFY DIAGRAM] Error crítico en modificación:', error);
      console.error('❌ [MODIFY DIAGRAM] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private static applyModificationsToDiagram(diagram: UMLDiagram, changes: any): UMLDiagram {
    console.log('🔧 [APPLY CHANGES] Iniciando aplicación de cambios');
    console.log('📦 [APPLY CHANGES] Cambios recibidos:', JSON.stringify(changes, null, 2));
    
    const updated = JSON.parse(JSON.stringify(diagram)); // Deep clone

    // Agregar nuevas entidades
    if (changes.newEntities) {
      console.log('➕ [APPLY CHANGES] Agregando nuevas entidades:', changes.newEntities.length);
      for (const entity of changes.newEntities) {
        const umlEntity = this.convertEntityToUML(entity);
        console.log('✅ [APPLY CHANGES] Entidad convertida:', umlEntity.name);
        updated.entities.push(umlEntity);
      }
    }

    // Modificar entidades existentes
    if (changes.modifiedEntities) {
      for (const modification of changes.modifiedEntities) {
        const entityIndex = updated.entities.findIndex((e: UMLEntity) => 
          e.id === modification.id || e.name === modification.id
        );
        
        if (entityIndex >= 0) {
          const entity = updated.entities[entityIndex];
          
          // Agregar nuevos atributos
          if (modification.changes.newAttributes) {
            const newAttrs = modification.changes.newAttributes.map((attr: any, index: number) => ({
              id: `attr-${entity.id}-${entity.attributes.length + index}`,
              name: attr.name,
              type: this.mapDataType(attr.type),
              visibility: this.mapVisibility(attr.visibility),
              isKey: attr.isKey || false,
              defaultValue: attr.defaultValue
            }));
            entity.attributes.push(...newAttrs);
          }
          
          // Agregar nuevos métodos
          if (modification.changes.newMethods) {
            const newMethods = modification.changes.newMethods.map((method: any, index: number) => ({
              id: `method-${entity.id}-${entity.methods.length + index}`,
              name: method.name,
              returnType: this.mapDataType(method.returnType),
              visibility: this.mapVisibility(method.visibility),
              parameters: method.parameters || [],
              isStatic: method.isStatic || false,
              isAbstract: method.isAbstract || false
            }));
            entity.methods.push(...newMethods);
          }
          
          // Eliminar atributos específicos
          if (modification.changes.deletedAttributes) {
            entity.attributes = entity.attributes.filter((attr: any) => 
              !modification.changes.deletedAttributes.includes(attr.name)
            );
          }
          
          // Eliminar métodos específicos
          if (modification.changes.deletedMethods) {
            entity.methods = entity.methods.filter((method: any) => 
              !modification.changes.deletedMethods.includes(method.name)
            );
          }
        }
      }
    }

    // Agregar nuevas relaciones
    if (changes.newRelations) {
      console.log('🔗 [APPLY CHANGES] Agregando nuevas relaciones:', changes.newRelations.length);
      for (const relation of changes.newRelations) {
        console.log('🔍 [APPLY CHANGES] Procesando relación:', relation);
        
        // Resolver nombres a IDs si es necesario
        const sourceId = this.resolveEntityId(updated, relation.sourceId);
        const targetId = this.resolveEntityId(updated, relation.targetId);
        
        console.log('🔍 [APPLY CHANGES] sourceId resuelto:', relation.sourceId, '→', sourceId);
        console.log('🔍 [APPLY CHANGES] targetId resuelto:', relation.targetId, '→', targetId);
        
        if (sourceId && targetId) {
          const umlRelation: UMLRelation = {
            id: relation.id || `relation-${Date.now()}-${Math.random()}`,
            source: sourceId,
            target: targetId,
            type: this.mapRelationType(relation.type),
            sourceCardinality: CardinalityUtils.parseCardinality(relation.sourceCardinality || '1'),
            targetCardinality: CardinalityUtils.parseCardinality(relation.targetCardinality || '1'),
            label: relation.label
          };
          console.log('✅ [APPLY CHANGES] Relación creada:', umlRelation);
          updated.relations.push(umlRelation);
        } else {
          console.warn('⚠️ [APPLY CHANGES] No se pudo resolver IDs para relación:', relation);
          console.warn('⚠️ [APPLY CHANGES] Entidades disponibles:', updated.entities.map((e: UMLEntity) => e.name));
        }
      }
    }

    // Eliminar entidades
    if (changes.deletedEntities) {
      console.log('🗑️ [APPLY CHANGES] Eliminando entidades:', changes.deletedEntities);
      updated.entities = updated.entities.filter((e: UMLEntity) => 
        !changes.deletedEntities.includes(e.name) && !changes.deletedEntities.includes(e.id)
      );
    }

    // Eliminar relaciones
    if (changes.deletedRelations) {
      console.log('🗑️ [APPLY CHANGES] Eliminando relaciones:', changes.deletedRelations);
      updated.relations = updated.relations.filter((r: UMLRelation) => {
        // Verificar eliminación por ID
        if (changes.deletedRelations.includes(r.id)) {
          return false;
        }
        
        // Verificar eliminación por descripción (ej: "entre Cliente y Factura")
        for (const deletionDesc of changes.deletedRelations) {
          if (typeof deletionDesc === 'string' && deletionDesc.includes('entre')) {
            const matches = deletionDesc.match(/entre\s+(\w+)\s+y\s+(\w+)/i);
            if (matches) {
              const [, entity1, entity2] = matches;
              const sourceEntity = updated.entities.find((e: UMLEntity) => e.name === entity1 || e.id === entity1);
              const targetEntity = updated.entities.find((e: UMLEntity) => e.name === entity2 || e.id === entity2);
              
              if (sourceEntity && targetEntity) {
                if ((r.source === sourceEntity.id && r.target === targetEntity.id) ||
                    (r.source === targetEntity.id && r.target === sourceEntity.id)) {
                  return false;
                }
              }
            }
          }
        }
        
        return true;
      });
    }

    // Actualizar metadata
    updated.metadata.modified = new Date();

    return updated;
  }

  private static resolveEntityId(diagram: UMLDiagram, nameOrId: string): string | null {
    console.log('🔍 [RESOLVE ID] Buscando entidad:', nameOrId);
    console.log('🔍 [RESOLVE ID] Entidades disponibles:', diagram.entities.map((e: UMLEntity) => ({id: e.id, name: e.name})));
    
    // Búsqueda exacta primero
    let entity = diagram.entities.find((e: UMLEntity) => e.id === nameOrId || e.name === nameOrId);
    
    // Si no encuentra, intentar case-insensitive
    if (!entity) {
      const lowerName = nameOrId.toLowerCase();
      entity = diagram.entities.find((e: UMLEntity) => 
        e.id.toLowerCase() === lowerName || e.name.toLowerCase() === lowerName
      );
      if (entity) {
        console.log('✅ [RESOLVE ID] Encontrado con case-insensitive:', entity.name);
      }
    }
    
    if (entity) {
      console.log('✅ [RESOLVE ID] Resuelto:', nameOrId, '→', entity.id);
    } else {
      console.error('❌ [RESOLVE ID] No encontrado:', nameOrId);
    }
    
    return entity ? entity.id : null;
  }

  private static createPrompt(request: DiagramGenerationRequest): string {
  let prompt = `Genera un diagrama UML de clases para: ${request.description}`;
    
    if (request.businessContext) {
  prompt += `\n\nContexto de negocio: ${request.businessContext}`;
    }
    
    if (request.additionalRequirements) {
  prompt += `\n\nRequisitos adicionales: ${request.additionalRequirements}`;
    }

    // Detectar si el usuario especifica número de entidades
    const numberMatch = request.description.match(/(\d+)\s*(tabla|clase|entidad|entity|table|class)/i);
    if (numberMatch) {
      const count = numberMatch[1];
  prompt += `\n\nIMPORTANTE: Crea exactamente ${count} entidades como solicitó el usuario.`;
    }

  prompt += `\n\nGenera un diagrama completo y coherente con:
- Tantas entidades como se necesiten para modelar el sistema (no limites a 5)
- Relaciones correctas entre entidades (herencia, composición, asociación, etc.)
- Atributos realistas con tipos de datos apropiados
- Métodos clave por clase
- Modificadores de visibilidad adecuados
- Posicionamiento lógico de entidades
- Incluye las clases y relaciones de soporte necesarias`;
    
  // Hard constraint: Only class entities
  prompt += `\n\nCRÍTICO: Todas las entidades DEBEN ser de tipo 'class'. No produzcas entidades de tipo interface, abstract o enum.`;

    return prompt;
  }

  private static parseAIResponse(content: string): any {
    console.log('🔍 [PARSE AI] Iniciando parseo de respuesta IA');
    console.log('📝 [PARSE AI] Contenido a parsear (primeros 500 chars):', content.substring(0, 500));
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        console.log('✅ [PARSE AI] JSON encontrado con regex');
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ [PARSE AI] JSON parseado exitosamente:', parsed);
        return parsed;
      }
      
      console.log('⚠️ [PARSE AI] No se encontró JSON con regex, intentando parsear contenido completo');
      // If no JSON block found, try to parse the entire content
      const parsed = JSON.parse(content.trim());
      console.log('✅ [PARSE AI] Contenido completo parseado exitosamente:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ [PARSE AI] Error al parsear respuesta de IA:', error);
      console.error('❌ [PARSE AI] Contenido que falló:', content);
      return null;
    }
  }

  private static convertToUMLDiagram(aiResponse: any): UMLDiagram {
    const entities: UMLEntity[] = [];
    const relations: UMLRelation[] = [];

    // Convert entities
    if (aiResponse.entities && Array.isArray(aiResponse.entities)) {
      for (const entity of aiResponse.entities) {
        const umlEntity: UMLEntity = {
          id: entity.id || `entity-${Date.now()}-${Math.random()}`,
          name: entity.name || 'UnnamedClass',
          type: this.mapEntityType(entity.type),
          attributes: [],
          methods: []
        };

        // Convert attributes
        if (entity.attributes && Array.isArray(entity.attributes)) {
          umlEntity.attributes = entity.attributes.map((attr: any, index: number) => ({
            id: `attr-${umlEntity.id}-${index}`,
            name: attr.name || 'attribute',
            type: this.mapDataType(attr.type),
            visibility: this.mapVisibility(attr.visibility),
            isKey: attr.isKey || false,
            defaultValue: attr.defaultValue
          }));
        }

        // Convert methods
        if (entity.methods && Array.isArray(entity.methods)) {
          umlEntity.methods = entity.methods.map((method: any, index: number) => ({
            id: `method-${umlEntity.id}-${index}`,
            name: method.name || 'method',
            returnType: this.mapDataType(method.returnType),
            visibility: this.mapVisibility(method.visibility),
            parameters: method.parameters ? method.parameters.map((param: any, paramIndex: number) => ({
              id: `param-${umlEntity.id}-${index}-${paramIndex}`,
              name: param.name || 'param',
              type: this.mapDataType(param.type)
            })) : [],
            isStatic: method.isStatic || false,
            isAbstract: method.isAbstract || false
          }));
        }

        entities.push(umlEntity);
      }
    }

    // Convert relations
    if (aiResponse.relations && Array.isArray(aiResponse.relations)) {
      for (const relation of aiResponse.relations) {
        const umlRelation: UMLRelation = {
          id: relation.id || `relation-${Date.now()}-${Math.random()}`,
          source: relation.sourceId,
          target: relation.targetId,
          type: this.mapRelationType(relation.type),
          sourceCardinality: CardinalityUtils.parseCardinality(relation.sourceCardinality || '1'),
          targetCardinality: CardinalityUtils.parseCardinality(relation.targetCardinality || '1'),
          label: relation.label
        };

        relations.push(umlRelation);
      }
    }

    return {
      id: `diagram-${Date.now()}`,
      name: aiResponse.name || 'Generated UML Diagram',
      entities,
      relations,
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0'
      }
    };
  }

  private static mapEntityType(type: string): EntityType {
    // Constraint: we only allow 'class' entities in the editor.
    // No matter what the AI proposes, coerce to 'class'.
    return 'class';
  }

  private static mapDataType(type: string): DataType {
    if (!type) return 'String';
    
    const typeMap: { [key: string]: DataType } = {
      'string': 'String',
      'str': 'String',
      'text': 'String',
      'int': 'Integer',
      'integer': 'Integer',
      'number': 'Integer',
      'long': 'Long',
      'double': 'Double',
      'float': 'Double',
      'boolean': 'Boolean',
      'bool': 'Boolean',
      'date': 'Date',
      'datetime': 'DateTime',
      'timestamp': 'DateTime'
    };

    const lowerType = type.toLowerCase();
    return typeMap[lowerType] || type as DataType;
  }

  private static mapVisibility(visibility: string): Visibility {
    switch (visibility?.toLowerCase()) {
      case 'public': return 'public';
      case 'private': return 'private';
      case 'protected': return 'protected';
      case 'package': return 'package';
      default: return 'private';
    }
  }

  private static mapRelationType(type: string): RelationType {
    switch (type?.toLowerCase()) {
      case 'inheritance': return 'inheritance';
      case 'generalization': return 'inheritance'; // Sinónimo de inheritance
      case 'composition': return 'composition';
      case 'aggregation': return 'aggregation';
      case 'association': return 'association';
      case 'dependency': return 'dependency';
      case 'implementation': return 'implementation';
      default: return 'association';
    }
  }

  // Chat functionality for conversational AI
  static async sendMessage(message: string, context?: UMLDiagram): Promise<{success: boolean, response?: string, error?: string}> {
    try {
  let systemPrompt = `Eres un asistente experto en diagramas UML. Ayuda a los usuarios a entender, modificar y mejorar sus diagramas UML.
      
Puedes:
- Explicar conceptos y relaciones UML
- Sugerir mejoras a diagramas existentes
- Responder preguntas sobre la estructura del diagrama
- Proveer buenas prácticas de diseño UML
- Ayudar con modificaciones específicas de entidades o relaciones

Sé útil, conciso y técnicamente preciso. Si el usuario te pide generar un nuevo diagrama, recuérdale usar la función de generación de diagramas.`;

      if (context) {
        systemPrompt += `\n\nCurrent diagram context:
- Name: ${context.name}
- Entities: ${context.entities.length} (${context.entities.map(e => e.name).join(', ')})
- Relations: ${context.relations.length}`;
      }

  const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: message
            }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
  throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
  throw new Error('No response received from OpenAI API');
      }

      return {
        success: true,
        response: content
      };

    } catch (error) {
  console.error('Error sending message to OpenAI:', error);
      return {
        success: false,
  error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Method to suggest improvements for existing diagrams
  static async suggestImprovements(diagram: UMLDiagram): Promise<string[]> {
    try {
      const diagramSummary = `
Diagram: ${diagram.name}
Entities: ${diagram.entities.map(e => `${e.name} (${e.type})`).join(', ')}
Relations: ${diagram.relations.map(r => `${r.source} -> ${r.target} (${r.type})`).join(', ')}
      `;

  const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Eres un revisor experto de diagramas UML. Analiza el diagrama UML proporcionado y sugiere mejoras específicas. Enfócate en:
- Patrones de diseño aplicables
- Relaciones o entidades faltantes
- Mejor organización de entidades
- Mejoras de normalización
- Optimización para generación de código

Proporciona 3-5 sugerencias específicas y accionables. Devuelve solo un arreglo JSON de strings, sin formato adicional.

Formato de respuesta de ejemplo:
["Considera agregar una clase BaseEntity con atributos comunes como id y timestamps", "La relación User-Order debería ser bidireccional", "Agrega un enum PaymentStatus para mejorar el estado de los pedidos"]`
            },
            {
              role: "user",
              content: `Please analyze this UML diagram and suggest improvements: ${diagramSummary}`
            }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
  throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
  throw new Error('No response received from OpenAI API');
      }

      // Try to parse as JSON array
      try {
        const suggestions = JSON.parse(content.trim());
        return Array.isArray(suggestions) ? suggestions : [content];
      } catch {
        // If not valid JSON, return as single suggestion
        return [content];
      }

    } catch (error) {
      console.error('Error getting suggestions:', error);
      return ['No se pudieron obtener sugerencias en este momento.'];
    }
  }

  // Nuevo método principal para comandos de voz
  static async processVoiceCommand(request: VoiceCommandRequest): Promise<VoiceCommandResponse> {
    try {
      const systemPrompt = this.createVoiceSystemPrompt(request.currentDiagram);
      const userPrompt = this.createVoiceUserPrompt(request);

  const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          max_tokens: 2000,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      return this.parseVoiceResponse(content, request.currentDiagram);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private static createVoiceSystemPrompt(currentDiagram?: UMLDiagram): string {
    const diagramContext = currentDiagram ?
      `\n\nDiagrama actual: ${currentDiagram.entities.map(e => e.name).join(', ')}` :
      '\n\nNo hay diagrama actualmente.';

    return `Eres un asistente de diagramas UML conversacional. Responde comandos de voz para:
- AGREGAR entidades: "agrega la clase Usuario" 
- MODIFICAR entidades: "añade atributo email a Usuario"
- CREAR relaciones: "Usuario tiene muchos Productos"
- ELIMINAR elementos: "elimina la clase Producto"
- EXPLICAR: "explica la relación entre Usuario y Producto"

FORMATO DE RESPUESTA: Responde SOLO con JSON válido:
{
  "action": "create|modify|delete|explain",
  "message": "descripción de lo que hiciste",
  "changes": {
    "entities": [{"id":"", "name":"", "type":"class", "attributes":[{"name":"", "type":"String", "visibility":"private"}], "methods":[]}],
    "relations": [{"id":"", "source":"", "target":"", "type":"association", "sourceCardinality":"1", "targetCardinality":"*"}],
    "deletions": {"entities": [], "relations": []}
  }
}${diagramContext}`;
  }

  private static createVoiceUserPrompt(request: VoiceCommandRequest): string {
    let prompt = `Comando: "${request.command}"`;

    if (request.context) {
      prompt += `\nContexto adicional: ${request.context}`;
    }

    return prompt;
  }

  private static parseVoiceResponse(content: string, currentDiagram?: UMLDiagram): VoiceCommandResponse {
    try {
      const response = JSON.parse(content.trim());

      if (!response.action) {
        throw new Error('Respuesta inválida');
      }

      let updatedDiagram = currentDiagram ? { ...currentDiagram } : this.createEmptyDiagram();

      if (response.changes) {
        updatedDiagram = this.applyChangesToDiagram(updatedDiagram, response.changes);
      }

      return {
        success: true,
        updatedDiagram,
        message: response.message || 'Comando procesado',
        action: response.action
      };

    } catch (error) {
      return {
        success: false,
        error: 'Error al procesar la respuesta de IA'
      };
    }
  }

  private static createEmptyDiagram(): UMLDiagram {
    return {
      id: `diagram-${Date.now()}`,
      name: 'Nuevo Diagrama',
      entities: [],
      relations: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0'
      }
    };
  }

  private static applyChangesToDiagram(diagram: UMLDiagram, changes: any): UMLDiagram {
    const updated = { ...diagram };

    // Agregar/modificar entidades
    if (changes.entities) {
      for (const entity of changes.entities) {
        const existingIndex = updated.entities.findIndex(e => e.name === entity.name);
        const umlEntity = this.convertEntityToUML(entity);

        if (existingIndex >= 0) {
          updated.entities[existingIndex] = { ...updated.entities[existingIndex], ...umlEntity };
        } else {
          updated.entities.push(umlEntity);
        }
      }
    }

    // Agregar relaciones
    if (changes.relations) {
      for (const relation of changes.relations) {
        const umlRelation = this.convertRelationToUML(relation);
        updated.relations.push(umlRelation);
      }
    }

    // Eliminar elementos
    if (changes.deletions) {
      if (changes.deletions.entities) {
        updated.entities = updated.entities.filter(e =>
          !changes.deletions.entities.includes(e.name)
        );
      }
      if (changes.deletions.relations) {
        updated.relations = updated.relations.filter(r =>
          !changes.deletions.relations.includes(r.id)
        );
      }
    }

    // Asegurar que metadata existe antes de modificar
    if (updated.metadata) {
      updated.metadata.modified = new Date();
    } else {
      updated.metadata = {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0'
      };
    }

    return updated;
  }

  private static convertEntityToUML(entity: any): UMLEntity {
    return {
      id: entity.id || `entity-${Date.now()}-${Math.random()}`,
      name: entity.name,
      type: this.mapEntityType(entity.type),
      attributes: (entity.attributes || []).map((attr: any, index: number) => ({
        id: `attr-${entity.id || Date.now()}-${index}`,
        name: attr.name,
        type: this.mapDataType(attr.type),
        visibility: this.mapVisibility(attr.visibility),
        isKey: attr.isKey || false,
        defaultValue: attr.defaultValue
      })),
      methods: (entity.methods || []).map((method: any, index: number) => ({
        id: `method-${entity.id || Date.now()}-${index}`,
        name: method.name,
        returnType: this.mapDataType(method.returnType),
        visibility: this.mapVisibility(method.visibility),
        parameters: method.parameters || [],
        isStatic: method.isStatic || false,
        isAbstract: method.isAbstract || false
      }))
    };
  }

  private static convertRelationToUML(relation: any): UMLRelation {
    return {
      id: relation.id || `relation-${Date.now()}-${Math.random()}`,
      source: relation.source,
      target: relation.target,
      type: this.mapRelationType(relation.type),
      sourceCardinality: CardinalityUtils.parseCardinality(relation.sourceCardinality || '1'),
      targetCardinality: CardinalityUtils.parseCardinality(relation.targetCardinality || '1'),
      label: relation.label
    };
  }
}