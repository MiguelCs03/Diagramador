import type { UMLDiagram, UMLEntity, UMLRelation, UMLAttribute } from '../types/uml';

interface GeneratedFile {
  filename: string;
  content: string;
  type: 'entity' | 'repository' | 'service' | 'controller' | 'dto';
}

export class SpringBootCodeGenerator {
  private diagram: UMLDiagram;
  private packageName: string;

  constructor(diagram: UMLDiagram, packageName = 'com.example.demo') {
    this.diagram = diagram;
    this.packageName = packageName;
  }

  generateAll(): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Filter only class entities (exclude intermediate tables)
    const classEntities = this.diagram.entities.filter(entity => 
      entity.type === 'class' || entity.type === 'abstract'
    );

    // Generate files for each class entity
    classEntities.forEach((entity) => {
      files.push(this.generateEntity(entity));
      files.push(this.generateRepository(entity));
      files.push(this.generateService(entity));
      files.push(this.generateController(entity));
      files.push(this.generateDTO(entity));
    });

    return files;
  }

  private generateEntity(entity: UMLEntity): GeneratedFile {
    const className = this.capitalize(entity.name);
    const relations = this.getRelationsForEntity(entity.id);

    // Determine id field: use user's 'id' attribute if present; otherwise generate Long id
  const idAttr = entity.attributes.find((a) => a.name.toLowerCase() === 'id');
  const useCustomId = !!idAttr;
  const idJavaType = this.getEntityIdJavaType(entity);

  // Track required imports
    const needLocalDate = entity.attributes.some(a => a.type === 'Date');
    const needLocalDateTime = entity.attributes.some(a => a.type === 'DateTime');
    const needBigDecimal = entity.attributes.some(a => a.type === 'BigDecimal');
    const needUUID = (useCustomId && idJavaType === 'UUID') || entity.attributes.some(a => a.type === 'UUID');

    // Relationship fields impact imports
  const relationStrings: string[] = [];
  const relationFieldNames = new Set<string>();
    let usesSet = false;
    // Precompute attribute-based relation field names to avoid duplicates
    const attrRelationNames = new Set(
      entity.attributes
        .filter(a => a.name.toLowerCase() !== 'id')
        .map(a => {
          const rel = this.diagram.entities.find(e => e.name.toLowerCase() === a.type.toLowerCase());
          return rel ? a.name : '';
        })
        .filter(Boolean)
    );

    relations.forEach((relation) => {
      const relatedEntity = this.diagram.entities.find(
        (ent) => ent.id === (relation.source === entity.id ? relation.target : relation.source)
      );
      if (relatedEntity && relatedEntity.type !== 'intermediate') {
        const relStr = this.buildRelationshipField(entity, relatedEntity, relation, attrRelationNames);
        if (relStr.includes('Set<')) usesSet = true;
        relationStrings.push(relStr);
      }
    });

    // Build imports dynamically
    const importLines: string[] = [
      'import jakarta.persistence.*;',
      'import io.swagger.v3.oas.annotations.media.Schema;',
      'import lombok.Data;',
    ];
    if (usesSet) {
      importLines.push('import java.util.Set;', 'import java.util.HashSet;');
    }
    if (needLocalDate) importLines.push('import java.time.LocalDate;');
    if (needLocalDateTime) importLines.push('import java.time.LocalDateTime;');
    if (needBigDecimal) importLines.push('import java.math.BigDecimal;');
    if (needUUID) importLines.push('import java.util.UUID;');

  let content = `package ${this.packageName}.entity;\n\n${importLines.join('\n')}\n\n@Data\n@Entity\n@Table(name = "${this.safeSqlName(this.toSnakeCase(entity.name))}")\npublic class ${className} {\n`;

    // Id field
    content += `\n    @Id\n`;
    if (!useCustomId && idJavaType === 'Long') {
      content += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
    } else if (useCustomId && (idJavaType === 'Long' || idJavaType === 'Integer')) {
      content += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
    }
    content += `    @Schema(description = "Primary key")\n    private ${idJavaType} id;\n`;

    // Generate attributes
    entity.attributes.filter(attr => attr.name.toLowerCase() !== 'id').forEach((attr) => {
      const related = this.diagram.entities.find(e => e.name.toLowerCase() === attr.type.toLowerCase());
      if (related && related.type !== 'intermediate') {
        // Attribute references another entity: generate ManyToOne instead of scalar field
        const fieldName = attr.name;
        const joinCol = `${this.toSnakeCase(fieldName)}_id`;
        relationFieldNames.add(fieldName);
        content += `
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${joinCol}")
    private ${this.capitalize(related.name)} ${fieldName};
`;
      } else {
        const javaType = this.mapDataType(attr.type);
        const example = this.sampleValueForType(attr.type, this.capitalize(entity.name), attr.name);
        const columnAnnotation = attr.isKey && attr.name !== 'id' 
          ? `@Column(name = "${this.toSnakeCase(attr.name)}", unique = true)`
          : `@Column(name = "${this.toSnakeCase(attr.name)}")`;
        
        content += `
    ${columnAnnotation}
    @Schema(description = "${attr.name} field", example = "${example}")
    private ${javaType} ${attr.name};
`;
      }
    });

    // Append relationship fields
    // Add relation fields from edges, avoiding duplicates by field name
    relationStrings.forEach(str => {
      content += str;
    });

  // Ensure id accessor methods are present even if Lombok isn't processed
  content += `
  public ${idJavaType} getId() { return this.id; }
  public void setId(${idJavaType} id) { this.id = id; }
}`;

    return {
      filename: `${className}.java`,
      content,
      type: 'entity',
    };
  }

  private buildRelationshipField(entity: UMLEntity, relatedEntity: UMLEntity, relation: UMLRelation, attrRelationNames?: Set<string>): string {
    const relatedClassName = this.capitalize(relatedEntity.name);
    const isSource = relation.source === entity.id;
    const sourceCard = relation.sourceCardinality;
    const targetCard = relation.targetCardinality;

    const isOneToMany = sourceCard.max === 1 && (targetCard.max === 'unlimited' || (typeof targetCard.max === 'number' && targetCard.max > 1));
    const isManyToOne = (sourceCard.max === 'unlimited' || (typeof sourceCard.max === 'number' && sourceCard.max > 1)) && targetCard.max === 1;
    const isManyToMany = (sourceCard.max === 'unlimited' || (typeof sourceCard.max === 'number' && sourceCard.max > 1)) && (targetCard.max === 'unlimited' || (typeof targetCard.max === 'number' && targetCard.max > 1));
    const isOneToOne = sourceCard.max === 1 && targetCard.max === 1;

    if (relation.type === 'inheritance' && !isSource) {
      // Note: Inheritance (extends) would require modifying class signature; omitted for simplicity here
      return '';
    }

    if (relation.type === 'composition' || relation.type === 'aggregation' || relation.type === 'association') {
      // define field names
      const toManyName = `${this.toLowerCamelCase(relatedEntity.name)}Set`;
      const toOneName = this.toLowerCamelCase(relatedEntity.name);
      // Skip if attribute already defined a field with same to-one name
      if (attrRelationNames && (isManyToOne || isOneToOne) && attrRelationNames.has(toOneName)) {
        return '';
      }
      if (isManyToMany) {
        return `\n    @ManyToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    @JoinTable(\n        name = "${this.safeSqlName(this.toSnakeCase(entity.name))}_${this.safeSqlName(this.toSnakeCase(relatedEntity.name))}",\n        joinColumns = @JoinColumn(name = "${this.safeSqlName(this.toSnakeCase(entity.name))}_id"),\n        inverseJoinColumns = @JoinColumn(name = "${this.safeSqlName(this.toSnakeCase(relatedEntity.name))}_id")\n    )\n    private Set<${relatedClassName}> ${toManyName} = new HashSet<>();\n`;
      } else if (isOneToMany && isSource) {
        return `\n    @OneToMany(mappedBy = "${this.toLowerCamelCase(entity.name)}", cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    private Set<${relatedClassName}> ${toManyName} = new HashSet<>();\n`;
      } else if (isManyToOne && !isSource) {
        return `\n    @ManyToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = "${this.safeSqlName(this.toSnakeCase(relatedEntity.name))}_id")\n    private ${relatedClassName} ${toOneName};\n`;
      } else if (isOneToOne) {
        return `\n    @OneToOne(fetch = FetchType.LAZY)\n    @JoinColumn(name = "${this.safeSqlName(this.toSnakeCase(relatedEntity.name))}_id")\n    private ${relatedClassName} ${toOneName};\n`;
      }
    }
    return '';
  }

  private getEntityIdJavaType(entity: UMLEntity): string {
    const idAttr = entity.attributes.find(a => a.name.toLowerCase() === 'id');
    return idAttr ? this.mapDataType(idAttr.type) : 'Long';
  }

  private generateRepository(entity: UMLEntity): GeneratedFile {
    const className = this.capitalize(entity.name);
  const idType = this.getEntityIdJavaType(entity);

    const content = `package ${this.packageName}.repository;

import ${this.packageName}.entity.${className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
  public interface ${className}Repository extends JpaRepository<${className}, ${idType}> {
    
    // Custom query methods based on attributes
${entity.attributes.filter(attr => attr.type === 'String').map(attr => 
    `    List<${className}> findBy${this.capitalize(attr.name)}ContainingIgnoreCase(String ${attr.name});`
).join('\n')}
${entity.attributes.filter(attr => attr.isKey && attr.name !== 'id').map(attr => 
    `    Optional<${className}> findBy${this.capitalize(attr.name)}(${this.mapDataType(attr.type)} ${attr.name});`
).join('\n')}
    
  @Query("select e from ${className} e where e.id = :id")
  Optional<${className}> findByIdWithDetails(@Param("id") ${idType} id);
}`;

    return {
      filename: `${className}Repository.java`,
      content,
      type: 'repository',
    };
  }

  private generateService(entity: UMLEntity): GeneratedFile {
    const className = this.capitalize(entity.name);
    const lowerClassName = this.toLowerCamelCase(className);
  const idType = this.getEntityIdJavaType(entity);

    const content = `package ${this.packageName}.service;

import ${this.packageName}.entity.${className};
import ${this.packageName}.repository.${className}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ${className}Service {
    
    @Autowired
    private ${className}Repository ${lowerClassName}Repository;
    
    @Transactional(readOnly = true)
    public List<${className}> findAll() {
        return ${lowerClassName}Repository.findAll();
    }
    
    @Transactional(readOnly = true)
  public Optional<${className}> findById(${idType} id) {
        return ${lowerClassName}Repository.findById(id);
    }
    
  public Optional<${className}> findByIdWithDetails(${idType} id) {
        return ${lowerClassName}Repository.findByIdWithDetails(id);
    }
    
    public ${className} save(${className} ${lowerClassName}) {
        return ${lowerClassName}Repository.save(${lowerClassName});
    }
    
  public ${className} update(${idType} id, ${className} ${lowerClassName}) {
        ${lowerClassName}.setId(id);
        return ${lowerClassName}Repository.save(${lowerClassName});
    }
    
  public void deleteById(${idType} id) {
        ${lowerClassName}Repository.deleteById(id);
    }
    
  public boolean existsById(${idType} id) {
        return ${lowerClassName}Repository.existsById(id);
    }
${entity.attributes.filter(attr => attr.type === 'String').map(attr => `
    @Transactional(readOnly = true)
    public List<${className}> searchBy${this.capitalize(attr.name)}(String ${attr.name}) {
        return ${lowerClassName}Repository.findBy${this.capitalize(attr.name)}ContainingIgnoreCase(${attr.name});
    }`
).join('')}
}`;

    return {
      filename: `${className}Service.java`,
      content,
      type: 'service',
    };
  }

  private generateController(entity: UMLEntity): GeneratedFile {
    const className = this.capitalize(entity.name);
    const lowerClassName = this.toLowerCamelCase(className);
  const pluralName = lowerClassName + 's';
    const idType = this.getEntityIdJavaType(entity);

    const content = `package ${this.packageName}.controller;

import ${this.packageName}.entity.${className};
import ${this.packageName}.service.${className}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/${pluralName}")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.OPTIONS})
@Tag(name = "${className}", description = "${className} API")
public class ${className}Controller {
    
    @Autowired
    private ${className}Service ${lowerClassName}Service;
    
  @GetMapping
  @Operation(summary = "List ${className}s", description = "Get all ${className} records")
    public ResponseEntity<List<${className}>> getAll${className}s() {
        try {
            List<${className}> ${pluralName} = ${lowerClassName}Service.findAll();
            return ResponseEntity.ok(${pluralName});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
  @GetMapping("/{id}")
  @Operation(summary = "Get ${className} by ID")
  public ResponseEntity<${className}> get${className}ById(@PathVariable ${idType} id) {
        try {
            Optional<${className}> ${lowerClassName} = ${lowerClassName}Service.findByIdWithDetails(id);
            return ${lowerClassName}
                .map(entity -> ResponseEntity.ok(entity))
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
  @PostMapping
  @Operation(
    summary = "Create ${className}",
    requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
      required = true,
      description = "${className} payload",
      content = @Content(
        schema = @Schema(implementation = ${className}.class),
        examples = {
          @ExampleObject(
            name = "Ejemplo",
            value = "${this.escapeJson(this.buildEntityExampleJson(entity))}"
          )
        }
      )
    )
  )
    public ResponseEntity<${className}> create${className}(@Valid @RequestBody ${className} ${lowerClassName}) {
        try {
            ${className} saved${className} = ${lowerClassName}Service.save(${lowerClassName});
            return ResponseEntity.status(HttpStatus.CREATED).body(saved${className});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
  @PutMapping("/{id}")
  @Operation(summary = "Update ${className}")
  public ResponseEntity<${className}> update${className}(@PathVariable ${idType} id, @Valid @RequestBody ${className} ${lowerClassName}) {
        try {
            if (!${lowerClassName}Service.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            ${className} updated${className} = ${lowerClassName}Service.update(id, ${lowerClassName});
            return ResponseEntity.ok(updated${className});
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
  @DeleteMapping("/{id}")
  @Operation(summary = "Delete ${className}")
  public ResponseEntity<Void> delete${className}(@PathVariable ${idType} id) {
        try {
            if (!${lowerClassName}Service.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            ${lowerClassName}Service.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
${entity.attributes.filter(attr => attr.type === 'String').map(attr => `
  @GetMapping(value = "/search", params = "${attr.name}")
  @Operation(summary = "Search ${className} by ${attr.name}")
  public ResponseEntity<List<${className}>> searchBy${this.capitalize(attr.name)}(@RequestParam String ${attr.name}) {
    try {
      List<${className}> results = ${lowerClassName}Service.searchBy${this.capitalize(attr.name)}(${attr.name});
      return ResponseEntity.ok(results);
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }`
).join('')}
}`;

    return {
      filename: `${className}Controller.java`,
      content,
      type: 'controller',
    };
  }

  private generateDTO(entity: UMLEntity): GeneratedFile {
    const className = this.capitalize(entity.name);
    const dtoClassName = `${className}DTO`;
    const idType = this.getEntityIdJavaType(entity);

    let content = `package ${this.packageName}.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;

@Data
public class ${dtoClassName} {
    private ${idType} id;
`;

    // Generate attributes (skip 'id' to avoid duplicates)
    entity.attributes
      .filter(attr => attr.name.toLowerCase() !== 'id')
      .forEach((attr) => {
        const related = this.diagram.entities.find(e => e.name.toLowerCase() === attr.type.toLowerCase());
        if (related && related.type !== 'intermediate') {
          // For relations in DTO, expose foreign key as <name>Id
          content += `    private ${this.getEntityIdJavaType(related)} ${attr.name}Id;\n`;
        } else {
          const javaType = this.mapDataType(attr.type);
          content += `    private ${javaType} ${attr.name};\n`;
        }
      });

    content += `
}`;

    return {
      filename: `${dtoClassName}.java`,
      content,
      type: 'dto',
    };
  }

  private getRelationsForEntity(entityId: string): UMLRelation[] {
    return this.diagram.relations.filter(
      (relation) => relation.source === entityId || relation.target === entityId
    );
  }

  private mapDataType(dataType: string): string {
    switch (dataType) {
      case 'String':
      case 'Text':
        return 'String';
      case 'Integer':
        return 'Integer';
      case 'Long':
        return 'Long';
      case 'Double':
        return 'Double';
      case 'Float':
        return 'Float';
      case 'Boolean':
        return 'Boolean';
      case 'Date':
        return 'LocalDate';
      case 'DateTime':
        return 'LocalDateTime';
      case 'BigDecimal':
        return 'BigDecimal';
      case 'UUID':
        return 'UUID';
      default:
        return 'String';
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toLowerCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  // Avoid SQL reserved keywords by pluralizing simple cases (order->orders, user->users, role->roles)
  private safeSqlName(name: string): string {
    const reserved = new Set(['order', 'user', 'role']);
    if (reserved.has(name)) {
      return name + 's';
    }
    return name;
  }

  // Example values for Swagger schema examples
  private sampleValueForType(type: string, entityName: string, attrName: string): string {
    switch (type) {
      case 'String':
      case 'Text':
        return `${entityName}_${attrName}`;
      case 'Integer':
        return '123';
      case 'Long':
        return '1';
      case 'Double':
        return '99.99';
      case 'Float':
        return '12.5';
      case 'Boolean':
        return 'true';
      case 'Date':
        return '2025-01-01';
      case 'DateTime':
        return '2025-01-01T10:00:00';
      case 'BigDecimal':
        return '1000.00';
      case 'UUID':
        return '123e4567-e89b-12d3-a456-426614174000';
      default:
        return `${entityName}_${attrName}`;
    }
  }

  // Build a minimal JSON example for the given entity attributes
  private buildEntityExampleJson(entity: UMLEntity): string {
    const entries = entity.attributes
      .filter(a => a.name.toLowerCase() !== 'id')
      .map(a => {
        const related = this.diagram.entities.find(e => e.name.toLowerCase() === a.type.toLowerCase());
        if (related && related.type !== 'intermediate') {
          // For relations, show only foreign key id reference
          return `"${a.name}Id": 1`;
        }
        const val = this.sampleValueForType(a.type, this.capitalize(entity.name), a.name);
        const needsQuotes = !(['Integer','Long','Double','Float','Boolean','BigDecimal'].includes(a.type));
        return needsQuotes ? `"${a.name}": "${val}"` : `"${a.name}": ${val}`;
      });
    return `{${entries.join(', ')}}`;
  }

  // Escape JSON to be used inside Java annotation string literal
  private escapeJson(json: string): string {
    return json
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '')
      .replace(/\r/g, '');
  }
}

export function generateSpringBootCode(diagram: UMLDiagram, packageName?: string): GeneratedFile[] {
  const generator = new SpringBootCodeGenerator(diagram, packageName);
  return generator.generateAll();
}