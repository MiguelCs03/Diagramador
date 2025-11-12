// src/utils/flutterGeneratorCode.ts
import type { UMLEntity, UMLAttribute } from "../types/uml";

/* =========================
   Helpers de formato/nombres
   ========================= */
const dartTypeMap: Record<string, string> = {
    string: "String",
    String: "String", // UML usa capitalizado
    int: "int",
    integer: "int",
    Integer: "int", // UML usa capitalizado
    long: "int",
    Long: "int", // UML usa capitalizado
    float: "double",
    Float: "double", // UML usa capitalizado
    double: "double",
    Double: "double", // UML usa capitalizado
    number: "double",
    boolean: "bool",
    Boolean: "bool", // UML usa capitalizado
    bool: "bool",
    date: "DateTime",
    Date: "DateTime", // UML usa capitalizado
    datetime: "DateTime",
    DateTime: "DateTime", // UML usa capitalizado
    BigDecimal: "double", // UML BigDecimal → Dart double
    UUID: "String", // UML UUID → Dart String
    Text: "String", // UML Text → Dart String
};

function toPascalCase(name: string) {
    // Normalizar caracteres especiales antes de procesar
    const normalized = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "N");
    
    return normalized
        .replace(/[_-]+/g, " ")
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

function toSnakeCase(name: string) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase()
        // Normalizar caracteres especiales (ñ -> n, á -> a, etc.)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "n");
}

function mapDartType(type: string) {
    return dartTypeMap[type.toLowerCase()] ?? "String";
}

function mapToDartType(type: string) {
    return dartTypeMap[type.toLowerCase()] ?? "String";
}

// Normalizar nombre de atributo para que sea válido en Dart
function sanitizeAttributeName(name: string): string {
    return name
        // Normalizar caracteres con acentos
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Reemplazar ñ y Ñ
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "N")
        // Eliminar cualquier carácter que no sea letra, número o guion bajo
        .replace(/[^a-zA-Z0-9_]/g, "")
        // Asegurar que empiece con letra minúscula (camelCase)
        .replace(/^[^a-zA-Z]+/, "")
        .replace(/^./, (char) => char.toLowerCase());
}

/* =========================
   Generadores por archivo
   ========================= */

/** Modelo: lib/models/{name}_model.dart */
export function genModelDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);
    
    // Asegurar que existe un campo id si no está presente
    const hasId = cls.attributes.some(a => a.name.toLowerCase() === 'id');
    const allAttributes = hasId ? cls.attributes : [
        { id: 'generated-id', name: 'id', type: 'Integer', visibility: 'private', isKey: true },
        ...cls.attributes
    ];
    
    const fields = allAttributes
        .map((a) => {
            const sanitizedName = sanitizeAttributeName(a.name);
            return `  final ${mapDartType(a.type)}${a.name === 'id' ? '?' : ''} ${sanitizedName};`;
        })
        .join("\n");

    // Parámetros del constructor con llaves para parámetros nombrados
    const params = allAttributes
        .map((a) => {
            const sanitizedName = sanitizeAttributeName(a.name);
            return a.name === 'id' ? `this.${sanitizedName}` : `required this.${sanitizedName}`;
        })
        .join(", ");

    // Generar fromJson con parámetros nombrados
    const fromJsonFields = allAttributes
        .map((a) => {
            const dartType = mapDartType(a.type);
            const isNullable = a.name === 'id';
            const sanitizedName = sanitizeAttributeName(a.name);
            const jsonKey = a.name; // Mantener el nombre original para la clave JSON
            
            if (dartType === 'int') {
                if (isNullable) {
                    return `      ${sanitizedName}: json['${jsonKey}'] != null ? json['${jsonKey}'] as int : null,`;
                } else {
                    return `      ${sanitizedName}: json['${jsonKey}'] as int? ?? 0,`;
                }
            } else if (dartType === 'double') {
                if (isNullable) {
                    return `      ${sanitizedName}: json['${jsonKey}'] != null ? (json['${jsonKey}'] as num).toDouble() : null,`;
                } else {
                    return `      ${sanitizedName}: json['${jsonKey}'] != null ? (json['${jsonKey}'] as num).toDouble() : 0.0,`;
                }
            } else if (dartType === 'bool') {
                if (isNullable) {
                    return `      ${sanitizedName}: json['${jsonKey}'] != null ? json['${jsonKey}'] as bool : null,`;
                } else {
                    return `      ${sanitizedName}: json['${jsonKey}'] as bool? ?? false,`;
                }
            } else if (dartType === 'DateTime') {
                return `      ${sanitizedName}: json['${jsonKey}'] != null ? DateTime.parse(json['${jsonKey}'] as String) : ${isNullable ? 'null' : 'DateTime.now()'},`;
            } else {
                // String u otros tipos
                if (isNullable) {
                    return `      ${sanitizedName}: json['${jsonKey}'] != null ? json['${jsonKey}'] as String : null,`;
                } else {
                    return `      ${sanitizedName}: json['${jsonKey}'] as String? ?? '',`;
                }
            }
        })
        .join("\n");

    // Generar toJson
    const toJsonFields = allAttributes
        .map((a) => {
            const dartType = mapDartType(a.type);
            const sanitizedName = sanitizeAttributeName(a.name);
            const jsonKey = a.name; // Mantener el nombre original para la clave JSON
            
            if (dartType === 'DateTime') {
                return `      '${jsonKey}': ${sanitizedName} != null ? ${sanitizedName}!.toIso8601String() : null,`;
            } else {
                return `      '${jsonKey}': ${sanitizedName},`;
            }
        })
        .join("\n");

    // Determinar si necesitamos importar dart:convert (solo si hay DateTime)
    const needsConvert = allAttributes.some(a => mapDartType(a.type) === 'DateTime');
    const imports = needsConvert ? "import 'dart:convert';\n\n" : "";

    return `${imports}class ${className} {
${fields}

  const ${className}({${params}});

  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(
${fromJsonFields}
    );
  }

  Map<String, dynamic> toJson() {
    return {
${toJsonFields}
    };
  }
}
`;
}

/** Listado (con datos y navegación): lib/screens/{name}/{name}_list_screen.dart */
export function genListScreenDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);
    const snake = toSnakeCase(cls.name);
    const title = `Listado de ${className}s`;

    return `import 'package:flutter/material.dart';
import '../../models/${snake}_model.dart';
import '../../services/${snake}_service.dart';
import '${snake}_detail_screen.dart';
import '${snake}_form_screen.dart';

class ${className}ListScreen extends StatefulWidget {
  const ${className}ListScreen({super.key});

  @override
  State<${className}ListScreen> createState() => _${className}ListScreenState();
}

class _${className}ListScreenState extends State<${className}ListScreen> {
  List<${className}> items = [];
  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  Future<void> _loadItems() async {
    try {
      setState(() {
        isLoading = true;
        errorMessage = null;
      });
      
      final data = await ${className}Service.getAll();
      setState(() {
        items = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = e.toString();
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${title}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadItems,
            tooltip: 'Recargar',
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        onPressed: _createItem,
        child: Icon(Icons.add),
        tooltip: 'Crear ${className}',
      ),
    );
  }

  Widget _buildBody() {
    if (isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Cargando ${className.toLowerCase()}s...'),
          ],
        ),
      );
    }

    if (errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            SizedBox(height: 16),
            Text(
              'Error al cargar datos',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.red),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadItems,
              child: Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No hay ${className.toLowerCase()}s registrados',
                style: TextStyle(fontSize: 18, color: Colors.grey)),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _createItem,
              child: Text('Crear el primero'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(8.0),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          margin: EdgeInsets.symmetric(vertical: 4.0),
          child: ListTile(
            leading: CircleAvatar(
              child: Text('\${index + 1}'),
            ),
            title: Text('${cls.attributes.length > 0 ? cls.attributes[0].name : "Item"}: \${item.${cls.attributes.length > 0 ? sanitizeAttributeName(cls.attributes[0].name) : "id"}}'),
            subtitle: Text('${cls.attributes.length > 1 ? cls.attributes[1].name : "Info"}: \${item.${cls.attributes.length > 1 ? sanitizeAttributeName(cls.attributes[1].name) : cls.attributes.length > 0 ? sanitizeAttributeName(cls.attributes[0].name) : "id"}}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(Icons.edit, color: Colors.blue),
                  onPressed: () => _editItem(item, index),
                ),
                IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _deleteItem(item, index),
                ),
              ],
            ),
            onTap: () => _viewDetail(item),
          ),
        );
      },
    );
  }

  void _viewDetail(${className} item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ${className}DetailScreen(item: item),
      ),
    );
  }

  void _createItem() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ${className}FormScreen(
          onSaved: (newItem) async {
            try {
              await ${className}Service.create(newItem);
              _loadItems(); // Recargar lista
              return true;
            } catch (e) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Error al crear: \$e')),
              );
              return false;
            }
          },
        ),
      ),
    );
  }

  void _editItem(${className} item, int index) async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ${className}FormScreen(
          initialItem: item,
          onSaved: (updatedItem) async {
            try {
              // Asumiendo que el primer atributo es el ID o hay un campo id
              final id = item.id ?? 1; // El modelo debe tener un campo id
              await ${className}Service.update(id, updatedItem);
              _loadItems(); // Recargar lista
              return true;
            } catch (e) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Error al actualizar: \$e')),
              );
              return false;
            }
          },
        ),
      ),
    );
  }

  void _deleteItem(${className} item, int index) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Confirmar eliminación'),
          content: Text('¿Está seguro de que desea eliminar este ${className.toLowerCase()}?'),
          actions: [
            TextButton(
              child: Text('Cancelar'),
              onPressed: () => Navigator.of(context).pop(),
            ),
            TextButton(
              child: Text('Eliminar'),
              onPressed: () async {
                Navigator.of(context).pop();
                try {
                  final id = item.id ?? 1; // El modelo debe tener un campo id
                  final success = await ${className}Service.delete(id);
                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${className} eliminado correctamente')),
                    );
                    _loadItems(); // Recargar lista
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error al eliminar ${className.toLowerCase()}')),
                    );
                  }
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: \$e')),
                  );
                }
              },
            ),
          ],
        );
      },
    );
  }
}
`;
}

/** Formulario (crear/editar): lib/screens/{name}/{name}_form_screen.dart */
export function genFormScreenDart(cls: UMLEntity): string {
  const className = toPascalCase(cls.name);
  const snake = toSnakeCase(cls.name);
  const title = className;
    
    const controllerDeclarations = cls.attributes
        .filter((attr: UMLAttribute) => attr.name !== 'id')
        .map((a: UMLAttribute) => {
            const sanitizedName = sanitizeAttributeName(a.name);
            return `  final ${sanitizedName}Controller = TextEditingController();`;
        })
        .join('\n');
    
    const disposeControllers = cls.attributes
        .filter((attr: UMLAttribute) => attr.name !== 'id')
        .map((a: UMLAttribute) => {
            const sanitizedName = sanitizeAttributeName(a.name);
            return `    ${sanitizedName}Controller.dispose();`;
        })
        .join('\n');
    
    const initControllers = cls.attributes
        .filter((attr: UMLAttribute) => attr.name !== 'id')
        .map((a: UMLAttribute) => {
            const dartType = mapToDartType(a.type);
            const sanitizedName = sanitizeAttributeName(a.name);
            if (dartType === 'DateTime') {
                return `    ${sanitizedName}Controller.text = widget.initialItem?.${sanitizedName}?.toIso8601String() ?? '';`;
            } else {
                return `    ${sanitizedName}Controller.text = widget.initialItem?.${sanitizedName}?.toString() ?? '';`;
            }
        })
        .join('\n');
    
    const formFields = cls.attributes
        .filter((attr: UMLAttribute) => attr.name !== 'id')
        .map((attr: UMLAttribute) => {
            const dartType = mapToDartType(attr.type);
            const sanitizedName = sanitizeAttributeName(attr.name);
            
            if (dartType === 'bool') {
                return `
            // ${attr.name} (Boolean)
            Row(
              children: [
                Text('${attr.name}:'),
                SizedBox(width: 16),
                Switch(
                  value: ${sanitizedName}Value,
                  onChanged: (value) {
                    setState(() {
                      ${sanitizedName}Value = value;
                    });
                  },
                ),
              ],
            ),`;
            } else if (dartType === 'DateTime') {
                return `
            TextFormField(
              controller: ${sanitizedName}Controller,
              decoration: InputDecoration(
                labelText: '${attr.name} (YYYY-MM-DD)',
                border: OutlineInputBorder(),
                hintText: '2025-01-01',
              ),
              keyboardType: TextInputType.datetime,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Por favor ingrese ${attr.name}';
                }
                if (DateTime.tryParse(value) == null) {
                  return 'Formato de fecha inválido (YYYY-MM-DD)';
                }
                return null;
              },
            ),`;
            } else {
                return `
            TextFormField(
              controller: ${sanitizedName}Controller,
              decoration: InputDecoration(
                labelText: '${attr.name}',
                border: OutlineInputBorder(),
              ),
              keyboardType: ${dartType === 'int' || dartType === 'double' ? 'TextInputType.number' : 'TextInputType.text'},
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Por favor ingrese ${attr.name}';
                }
                return null;
              },
            ),`;
            }
        })
        .join('\n            SizedBox(height: 16),');
    
    const booleanDeclarations = cls.attributes
        .filter((attr: UMLAttribute) => mapToDartType(attr.type) === 'bool')
        .map((attr: UMLAttribute) => {
            const sanitizedName = sanitizeAttributeName(attr.name);
            return `  bool ${sanitizedName}Value = false;`;
        })
        .join('\n');
    
    const booleanInits = cls.attributes
        .filter((attr: UMLAttribute) => mapToDartType(attr.type) === 'bool')
        .map((attr: UMLAttribute) => {
            const sanitizedName = sanitizeAttributeName(attr.name);
            return `    ${sanitizedName}Value = widget.initialItem?.${sanitizedName} ?? false;`;
        })
        .join('\n');
    
    const createObject = cls.attributes
        .map((attr: UMLAttribute) => {
            const sanitizedName = sanitizeAttributeName(attr.name);
            if (attr.name === 'id') {
                return `id: widget.initialItem?.id`;
            } else if (mapToDartType(attr.type) === 'bool') {
                return `${sanitizedName}: ${sanitizedName}Value`;
            } else {
                const dartType = mapToDartType(attr.type);
                if (dartType === 'int') {
                    return `${sanitizedName}: int.tryParse(${sanitizedName}Controller.text) ?? 0`;
                } else if (dartType === 'double') {
                    return `${sanitizedName}: double.tryParse(${sanitizedName}Controller.text) ?? 0.0`;
                } else if (dartType === 'DateTime') {
                    return `${sanitizedName}: DateTime.tryParse(${sanitizedName}Controller.text) ?? DateTime.now()`;
                } else {
                    return `${sanitizedName}: ${sanitizedName}Controller.text`;
                }
            }
        })
        .join(',\n        ');

    return `import 'package:flutter/material.dart';
import '../../models/${snake}_model.dart';

class ${className}FormScreen extends StatefulWidget {
  final ${className}? initialItem;
  final Future<bool> Function(${className}) onSaved;

  const ${className}FormScreen({
    super.key,
    this.initialItem,
    required this.onSaved,
  });

  @override
  State<${className}FormScreen> createState() => _${className}FormScreenState();
}

class _${className}FormScreenState extends State<${className}FormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  
${controllerDeclarations}
${booleanDeclarations}

  @override
  void initState() {
    super.initState();
    if (widget.initialItem != null) {
${initControllers}
${booleanInits}
    }
  }

  @override
  void dispose() {
${disposeControllers}
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.initialItem == null ? 'Crear ${title}' : 'Editar ${title}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    ${formFields}
                    SizedBox(height: 32),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _saveItem,
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: Text(
                              widget.initialItem == null ? 'Crear' : 'Actualizar',
                              style: TextStyle(fontSize: 16),
                            ),
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              padding: EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: Text(
                              'Cancelar',
                              style: TextStyle(fontSize: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Future<void> _saveItem() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final item = ${className}(
        ${createObject}
      );

      final success = await widget.onSaved(item);
      
      if (mounted && success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.initialItem == null 
              ? '${title} creado exitosamente' 
              : '${title} actualizado exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al guardar: \$e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}
`;
}

/** Pantalla de detalle: lib/screens/{name}/{name}_detail_screen.dart */
export function genDetailScreenDart(cls: UMLEntity): string {
  const className = toPascalCase(cls.name);
  const snake = toSnakeCase(cls.name);
  const title = className;
    
  const detailFields = cls.attributes
    .map((attr: UMLAttribute) => {
      const dartType = mapToDartType(attr.type);
      const sanitizedName = sanitizeAttributeName(attr.name);
      let displayValue;
      if (dartType === 'bool') {
        displayValue = `item.${sanitizedName} != null ? (item.${sanitizedName}! ? 'Sí' : 'No') : 'N/A'`;
      } else if (dartType === 'DateTime') {
        displayValue = `item.${sanitizedName} != null ? item.${sanitizedName}!.toIso8601String().split('T')[0] : 'N/A'`;
      } else {
        displayValue = `item.${sanitizedName} != null ? item.${sanitizedName}.toString() : 'N/A'`;
      }
      return `
      _buildDetailRow('${attr.name}', ${displayValue}),`;
    })
    .join('');

    return `import 'package:flutter/material.dart';
import '../../models/${snake}_model.dart';
import '${snake}_form_screen.dart';

class ${className}DetailScreen extends StatelessWidget {
  final ${className} item;

  const ${className}DetailScreen({
    super.key,
    required this.item,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Detalle de ${title}'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: Icon(Icons.edit),
            onPressed: () => _editItem(context),
            tooltip: 'Editar',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16.0),
        child: Card(
          elevation: 4,
          child: Padding(
            padding: EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Información de ${title}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                SizedBox(height: 20),
                ${detailFields}
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              '\$label:',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _editItem(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ${className}FormScreen(
          initialItem: item,
          onSaved: (updatedItem) async {
            // Navigate back to the list screen
            Navigator.popUntil(context, (route) => route.isFirst);
            return true;
          },
        ),
      ),
    );
  }
}
`;
}

/* Exports de conveniencia*/

export const FlutterGen = {
    genModelDart,
    genListScreenDart,
    genFormScreenDart,
    genDetailScreenDart,
    toPascalCase,
    toSnakeCase,
    mapDartType,
};