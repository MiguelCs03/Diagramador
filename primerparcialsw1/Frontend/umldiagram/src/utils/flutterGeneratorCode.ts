// src/utils/flutterGeneratorCode.ts
import type { UMLEntity, UMLAttribute } from "../types/uml";

/* =========================
   Helpers de formato/nombres
   ========================= */
const dartTypeMap: Record<string, string> = {
    string: "String",
    int: "int",
    integer: "int",
    float: "double",
    double: "double",
    number: "double",
    boolean: "bool",
    bool: "bool",
    date: "DateTime",
    datetime: "DateTime",
};

function toPascalCase(name: string) {
    return name
        .replace(/[_-]+/g, " ")
        .split(" ")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

function toSnakeCase(name: string) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}

function mapDartType(type: string) {
    return dartTypeMap[type.toLowerCase()] ?? "String";
}

/* =========================
   Generadores por archivo
   ========================= */

/** Modelo: lib/models/{name}_model.dart */
export function genModelDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);
    const fields = cls.attributes
        .map((a) => `  ${mapDartType(a.type)} ${a.name};`)
        .join("\n");

    const params = cls.attributes.map((a) => `required this.${a.name}`).join(", ");

    return `class ${className} {
${fields}

  ${className}({${params}});
}
`;
}

/** Listado (estático): lib/screens/{name}/{name}_list_screen.dart */
export function genListScreenDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);
    const folder = toSnakeCase(cls.name);
    const title = `Listado de ${className}s`;

    return `import 'package:flutter/material.dart';

class ${className}ListScreen extends StatelessWidget {
  const ${className}ListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${title}')),
      body: const Center(
        child: Text('Aquí se mostrará la lista de ${className}s'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: null, // Navegación no implementada (placeholder)
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;
}

/** Formulario (estático, solo visual): lib/screens/{name}/{name}_form_screen.dart */
export function genFormScreenDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);
    const fieldsUI = cls.attributes
        .map((a) => textFieldFromAttribute(a))
        .join("\n            const SizedBox(height: 12),\n");

    return `import 'package:flutter/material.dart';

class ${className}FormScreen extends StatelessWidget {
  const ${className}FormScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Formulario de ${className}')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            children: [
${indent(fieldsUI, 14)}
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: null, // Sin funcionalidad (placeholder)
                child: const Text('Guardar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
}

/** Detalle (estático): lib/screens/{name}/{name}_detail_screen.dart */
export function genDetailScreenDart(cls: UMLEntity): string {
    const className = toPascalCase(cls.name);

    // Generate rows without `const` so we can include dynamic values safely.
    const rows = cls.attributes
        .map(
            (a) => `Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${a.name}'),
            Text('${mapDartType(a.type)}'),
          ],
        ),`
        )
        .join("\n            Divider(),\n            ");

    return `import 'package:flutter/material.dart';

class ${className}DetailScreen extends StatelessWidget {
  const ${className}DetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle de ${className}')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ${rows}
          ],
        ),
      ),
    );
  }
}
`;
}

/* Utilidades internas*/

function textFieldFromAttribute(attr: UMLAttribute): string {
    const label = `${attr.name} (${mapDartType(attr.type)})`;
    const keyboard = keyboardTypeFrom(attr.type);

    // Campo visual sin lógica (placeholder)
    // Add a trailing comma after the widget so it can be used safely inside
    // a `children: [ ... ]` list in the generated Dart code.
    return `TextField(
              decoration: const InputDecoration(
                labelText: '${label}',
                border: OutlineInputBorder(),
              ),
              keyboardType: ${keyboard},
              enabled: true,
            ),`;
}

function keyboardTypeFrom(type: string): string {
    const t = type.toLowerCase();
    if (["int", "integer", "float", "double", "number"].includes(t)) {
        return "TextInputType.number";
    }
    if (["date", "datetime"].includes(t)) {
        return "TextInputType.datetime";
    }
    return "TextInputType.text";
}

// Pequeña utilidad para indentar bloques multilínea
function indent(text: string, spaces: number) {
    const pad = " ".repeat(spaces);
    return text
        .split("\n")
        .map((l) => (l.trim().length ? pad + l : l))
        .join("\n");
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
