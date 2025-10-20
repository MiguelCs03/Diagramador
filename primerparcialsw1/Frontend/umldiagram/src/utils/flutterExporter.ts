// src/utils/flutterExporter.ts
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { UMLDiagram, UMLEntity } from "@/types/uml";
import {
  FlutterGen,
  genDetailScreenDart,
  genFormScreenDart,
  genListScreenDart,
  genModelDart,
} from "./flutterGeneratorCode";

/* =========================
   Archivos base del proyecto Flutter
   ========================= */
function basePubspecYaml(): string {
  return `name: uml_flutter_ui
description: UI generada automáticamente desde un diagrama UML (CRUD estático)
publish_to: "none"
version: 0.1.0

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
`;
}

function baseMainDart(): string {
  return `import 'package:flutter/material.dart';

void main() {
  runApp(const GeneratedApp());
}

class GeneratedApp extends StatelessWidget {
  const GeneratedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UI Generada',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      home: const _HomeGenerated(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class _HomeGenerated extends StatelessWidget {
  const _HomeGenerated({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      appBar: AppBar(title: Text('Proyecto Flutter generado')),
      body: Center(
        child: Text(
          'Las pantallas CRUD por clase están en lib/screens/',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
`;
}

/* =========================
   Exportar clase → archivos Flutter
   ========================= */
function exportClassScreens(zip: JSZip, cls: UMLEntity) {
  const snake = FlutterGen.toSnakeCase(cls.name);
  const models = zip.folder("lib")!.folder("models")!;
  const screenFolder = zip.folder("lib")!.folder("screens")!.folder(snake)!;

  models.file(`${snake}_model.dart`, genModelDart(cls));
  screenFolder.file(`${snake}_list_screen.dart`, genListScreenDart(cls));
  screenFolder.file(`${snake}_form_screen.dart`, genFormScreenDart(cls));
  screenFolder.file(`${snake}_detail_screen.dart`, genDetailScreenDart(cls));
}

/* =========================
   Exportador principal
   ========================= */
export interface FlutterExportOptions {
  zipName?: string; // nombre del ZIP resultante
}

/**
 * Genera un proyecto Flutter completo en memoria
 * y descarga un ZIP con las pantallas CRUD de cada clase UML.
 */
export async function exportFlutterProject(
  diagram: UMLDiagram,
  options: FlutterExportOptions = {}
) {
  const zip = new JSZip();
  const outName = options.zipName ?? "flutter_ui";

  // Crear estructura base
  const lib = zip.folder("lib")!;
  lib.folder("models");
  lib.folder("screens");

  zip.file("pubspec.yaml", basePubspecYaml());
  lib.file("main.dart", baseMainDart());

  // Generar archivos por clase UML
  (diagram.entities ?? []).forEach((cls) => exportClassScreens(zip, cls));

  // Generar ZIP y descargarlo
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${outName}.zip`);

  // Retornar resumen (útil si querés mostrar en consola o UI)
  return {
    zipName: `${outName}.zip`,
    classes: (diagram.entities ?? []).map((c) => c.name),
  };
}
