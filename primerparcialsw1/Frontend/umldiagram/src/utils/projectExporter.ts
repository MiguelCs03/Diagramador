import type { UMLDiagram } from '../types/uml';
import { generateSpringBootCode } from './codeGenerator';

interface ExportFile {
  path: string;
  content: string;
}

export class ProjectExporter {
  private diagram: UMLDiagram;
  private projectName: string;
  private packageName: string;
  private dbName: string;
  private dbUsername: string;
  private dbPassword: string;

  constructor(diagram: UMLDiagram, projectName = 'uml-generated-project', packageName = 'com.example.demo', dbName = 'my_database', dbUsername = 'postgres', dbPassword = 'postgres') {
    this.diagram = diagram;
    this.projectName = projectName;
    this.packageName = packageName;
    this.dbName = dbName;
    this.dbUsername = dbUsername;
    this.dbPassword = dbPassword;
  }

  exportCompleteProject(): ExportFile[] {
    const files: ExportFile[] = [];

    // Generate Spring Boot code
    const generatedCode = generateSpringBootCode(this.diagram, this.packageName);

    // Add generated Java files
    generatedCode.forEach((file) => {
      const packagePath = this.packageName.replace(/\./g, '/');
      let subPath = '';

      switch (file.type) {
        case 'entity':
          subPath = 'entity';
          break;
        case 'repository':
          subPath = 'repository';
          break;
        case 'service':
          subPath = 'service';
          break;
        case 'controller':
          subPath = 'controller';
          break;
        case 'dto':
          subPath = 'dto';
          break;
      }

      files.push({
        path: `src/main/java/${packagePath}/${subPath}/${file.filename}`,
        content: file.content,
      });
    });

    // Add configuration files
    files.push(...this.generateConfigurationFiles());

    // Add main application class
    files.push(this.generateMainApplication());

    // Add build files
    files.push(this.generatePomXml());

    // Add README
    files.push(this.generateReadme());

    // Add Docker files
    files.push(this.generateDockerfile());
    files.push(this.generateDockerCompose());

    return files;
  }

  private generateConfigurationFiles(): ExportFile[] {
    return [
      {
        path: 'src/main/resources/application.properties',
        content: `# Application
spring.application.name=${this.projectName}
server.port=8080
server.servlet.context-path=/api

# PostgreSQL datasource
spring.datasource.url=jdbc:postgresql://localhost:5432/${this.dbName}
spring.datasource.username=${this.dbUsername}
spring.datasource.password=${this.dbPassword}

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true

# SQL init scripts disabled (data.sql won't auto-run)
spring.sql.init.mode=never

# CORS (allow all by default)
cors.allowed-origins=*
cors.allowed-methods=*
cors.allowed-headers=*

# Logging
logging.level.org.springframework.web=INFO
logging.level.org.hibernate.SQL=DEBUG
logging.level.${this.packageName}=DEBUG
`
      },
      {
        path: 'src/main/resources/data.sql',
        content: `-- Sample data for generated entities
-- This file is executed automatically when the application starts

${this.diagram.entities
  .filter(entity => entity.type === 'class')
  .map(entity => {
    const table = this.toSnakeCase(entity.name);
    const cols = entity.attributes
      .filter(a => a.name.toLowerCase() !== 'id')
      .map(a => this.toSnakeCase(a.name)).join(', ');
    const vals = entity.attributes
      .filter(a => a.name.toLowerCase() !== 'id')
      .map(a => this.sampleSqlValue(a.type, entity.name, a.name)).join(', ');
    return cols.length ? `INSERT INTO ${table} (${cols}) VALUES (${vals});` : `-- INSERT INTO ${table} (...) VALUES (...);`;
  })
  .join('\n')}

-- Example inserts will be adjusted based on your diagram fields
`
      },
    ];
  }

  private generateMainApplication(): ExportFile {
    const className = this.toPascalCase(this.projectName) + 'Application';

    return {
      path: `src/main/java/${this.packageName.replace(/\./g, '/')}/${className}.java`,
      content: `package ${this.packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableTransactionManagement
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("*")
            .allowCredentials(false);
            }
        };
    }
}
`,
    };
  }

  private generatePomXml(): ExportFile {
    return {
      path: 'pom.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>${this.packageName}</groupId>
    <artifactId>${this.projectName}</artifactId>
    <version>1.0.0</version>
    <name>${this.toPascalCase(this.projectName)}</name>
    <description>Generated Spring Boot project from UML Class Diagram</description>
    
    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>
    
    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
    <!-- Database: PostgreSQL -->
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>

    <!-- Lombok -->
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>
        
        <!-- Development Tools -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        
        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        
        <!-- Optional: API Documentation -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.2.0</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.springframework.boot</groupId>
                            <artifactId>spring-boot-devtools</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`,
    };
  }

  private generateDockerfile(): ExportFile {
    return {
      path: 'Dockerfile',
      content: `FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies
RUN chmod +x mvnw \
  && ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Build application
RUN ./mvnw clean package -DskipTests

# Run application
EXPOSE 8080
CMD ["java", "-jar", "target/${this.projectName}-1.0.0.jar"]
`,
    };
  }

  private generateDockerCompose(): ExportFile {
    return {
      path: 'docker-compose.yml',
      content: `version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/${this.dbName}
      - SPRING_DATASOURCE_USERNAME=${this.dbUsername}
      - SPRING_DATASOURCE_PASSWORD=${this.dbPassword}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ${this.dbName}
      POSTGRES_USER: ${this.dbUsername}
      POSTGRES_PASSWORD: ${this.dbPassword}
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pg_data:
`,
    };
  }

  private generateReadme(): ExportFile {
    const classEntities = this.diagram.entities.filter(entity => entity.type === 'class');
    
    return {
      path: 'README.md',
      content: `# ${this.toPascalCase(this.projectName)}

This Spring Boot project was automatically generated from a UML Class Diagram using the **UML Diagram Tool**.

## 📋 Project Overview

- **Entities**: ${classEntities.length} classes with JPA annotations
- **Repositories**: Spring Data JPA repositories for data access
- **Services**: Business logic layer with CRUD operations and transactions
- **Controllers**: REST API endpoints with error handling
- **DTOs**: Data Transfer Objects for API communication
- **Relations**: ${this.diagram.relations.length} relationships between entities

## 🏗️ Generated Classes

${classEntities
  .map(entity => {
    const attributes = entity.attributes.map(attr => `${attr.name} (${attr.type})`).join(', ');
    const relations = this.diagram.relations.filter(rel => rel.source === entity.id || rel.target === entity.id);
    
    return `### ${entity.name}
**Attributes**: ${attributes || 'None'}
**Relations**: ${relations.length} relationships
**API Endpoints**:
- \`GET /api/${entity.name.toLowerCase()}s\` - Get all ${entity.name}s
- \`GET /api/${entity.name.toLowerCase()}s/{id}\` - Get ${entity.name} by ID
- \`POST /api/${entity.name.toLowerCase()}s\` - Create new ${entity.name}
- \`PUT /api/${entity.name.toLowerCase()}s/{id}\` - Update ${entity.name}
- \`DELETE /api/${entity.name.toLowerCase()}s/{id}\` - Delete ${entity.name}
${entity.attributes.filter(attr => attr.type === 'String').length > 0 ? 
`- \`GET /api/${entity.name.toLowerCase()}s/search?{attribute}={value}\` - Search by attribute` : ''}
`;
  })
  .join('\n')}

## 🚀 Quick Start

### Prerequisites
- **Java 17** or higher
- **Maven 3.6** or higher
- **Git** (optional)

### Running the Application

1. **Clone or extract the project**:
   \`\`\`bash
   cd ${this.projectName}
   \`\`\`

2. **Run with Maven**:
   \`\`\`bash
   ./mvnw spring-boot:run
   \`\`\`

3. **Or build and run the JAR**:
   \`\`\`bash
   ./mvnw clean package
   java -jar target/${this.projectName}-1.0.0.jar
   \`\`\`

### Using Docker

1. **Build and run with Docker**:
   \`\`\`bash
   docker build -t ${this.projectName} .
   docker run -p 8080:8080 ${this.projectName}
   \`\`\`

2. **Or use Docker Compose**:
   \`\`\`bash
   docker-compose up
   \`\`\`

## 🌐 Access Points

Once the application is running:

- **API Base URL**: http://localhost:8080/api
- **API Documentation (Swagger UI)**: http://localhost:8080/api/swagger-ui/index.html

## 📊 Database Schema

The application uses **H2 in-memory database** for development. The schema is automatically generated from your UML entities.

### Generated Tables:
${classEntities
  .map(entity => `- \`${this.toSnakeCase(entity.name)}\` - ${entity.attributes.length} columns`)
  .join('\n')}

## 🔧 Customization

### Database Configuration (PostgreSQL)

This project is preconfigured for PostgreSQL. Update \`src/main/resources/application.properties\` if needed:

\`\`\`properties
spring.datasource.url=jdbc:postgresql://localhost:5432/${this.dbName}
spring.datasource.username=${this.dbUsername}
spring.datasource.password=${this.dbPassword}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
\`\`\`

### Adding Business Logic

1. **Custom Queries**: Add to Repository interfaces
2. **Business Rules**: Implement in Service classes
3. **Validation**: Add annotations to Entity fields
4. **Custom Endpoints**: Extend Controller classes

## 📝 API Examples

### Creating a new entity:
\`\`\`bash
curl -X POST http://localhost:8080/api/entities \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Example"}'
\`\`\`

### Getting all entities:
\`\`\`bash
curl http://localhost:8080/api/entities
\`\`\`

## 🏷️ Generated by UML Diagram Tool

This project structure and code were automatically generated from your UML class diagram design.

**Generation Details**:
- **Generated on**: ${new Date().toISOString().split('T')[0]}
- **Entities**: ${classEntities.length}
- **Relations**: ${this.diagram.relations.length}
- **Package**: \`${this.packageName}\`

---

For more information about the UML Diagram Tool, visit our documentation.
`,
    };
  }

  // Helpers for SQL sample values
  private sampleSqlValue(type: string, entityName: string, attrName: string): string {
    switch (type) {
      case 'String':
      case 'Text':
        return `'${this.escapeSql(`${entityName}_${attrName}`)}'`;
      case 'Integer':
      case 'Long':
        return '1';
      case 'Double':
      case 'Float':
      case 'BigDecimal':
        return '10.0';
      case 'Boolean':
        return 'TRUE';
      case 'Date':
        return `'2025-01-01'`;
      case 'DateTime':
        return `'2025-01-01T10:00:00'`;
      case 'UUID':
        return `'123e4567-e89b-12d3-a456-426614174000'`;
      default:
        return `'${this.escapeSql(`${entityName}_${attrName}`)}'`;
    }
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  private toPascalCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

export async function exportAsZip(diagram: UMLDiagram, projectName?: string, packageName?: string): Promise<void> {
  // Ask for PostgreSQL DB configuration before exporting
  const dbName = typeof window !== 'undefined' ? (window.prompt('Nombre exacto de la base de datos (PostgreSQL):', 'mi_basedatos') || 'mi_basedatos') : 'mi_basedatos';
  const dbUsername = typeof window !== 'undefined' ? (window.prompt('Usuario de PostgreSQL:', 'postgres') || 'postgres') : 'postgres';
  const dbPassword = typeof window !== 'undefined' ? (window.prompt('Password de PostgreSQL:', 'postgres') || 'postgres') : 'postgres';

  const exporter = new ProjectExporter(diagram, projectName, packageName, dbName, dbUsername, dbPassword);
  const files = exporter.exportCompleteProject();

  // Dynamic import of JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'uml-generated-project'}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDiagramAsJson(diagram: UMLDiagram): void {
  const dataStr = JSON.stringify(diagram, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${diagram.name || 'uml-diagram'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}