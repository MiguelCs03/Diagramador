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

// Configuración de API para diferentes plataformas
function baseApiConfigDart(): string {
  return `import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) {
      // Para web (Flutter web)
      return 'http://localhost:8080/api';
    } else if (Platform.isAndroid) {
      // Para emulador Android, usar 10.0.2.2
      return 'http://10.0.2.2:8080/api';
    } else if (Platform.isIOS) {
      // Para simulador iOS, usar localhost
      return 'http://localhost:8080/api';
    } else {
      // Para desktop o cualquier otro
      return 'http://localhost:8080/api';
    }
  }

  // Configuración manual para dispositivos físicos
  static const String physicalDeviceIP = '192.168.1.100'; // Cambia por la IP de tu PC

  static String get baseUrlForPhysicalDevice {
    return 'http://$physicalDeviceIP:8080/api';
  }
}
`;
}

// Servicio base para manejo de HTTP
function baseApiServiceDart(): string {
  return `import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class ApiService {
  static const Map<String, String> _headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Future<http.Response> get(String endpoint) async {
    final url = Uri.parse('\${ApiConfig.baseUrl}/\$endpoint');
    try {
      final response = await http.get(url, headers: _headers);
      return response;
    } catch (e) {
      if (e is SocketException) {
        throw Exception('Error de conexión: Verifica que el backend esté ejecutándose en \${ApiConfig.baseUrl}');
      }
      throw Exception('Error de red: \$e');
    }
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> data) async {
    final url = Uri.parse('\${ApiConfig.baseUrl}/\$endpoint');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: json.encode(data),
      );
      return response;
    } catch (e) {
      if (e is SocketException) {
        throw Exception('Error de conexión: Verifica que el backend esté ejecutándose en \${ApiConfig.baseUrl}');
      }
      throw Exception('Error de red: \$e');
    }
  }

  static Future<http.Response> put(String endpoint, Map<String, dynamic> data) async {
    final url = Uri.parse('\${ApiConfig.baseUrl}/\$endpoint');
    try {
      final response = await http.put(
        url,
        headers: _headers,
        body: json.encode(data),
      );
      return response;
    } catch (e) {
      if (e is SocketException) {
        throw Exception('Error de conexión: Verifica que el backend esté ejecutándose en \${ApiConfig.baseUrl}');
      }
      throw Exception('Error de red: \$e');
    }
  }

  static Future<http.Response> delete(String endpoint) async {
    final url = Uri.parse('\${ApiConfig.baseUrl}/\$endpoint');
    try {
      final response = await http.delete(url, headers: _headers);
      return response;
    } catch (e) {
      if (e is SocketException) {
        throw Exception('Error de conexión: Verifica que el backend esté ejecutándose en \${ApiConfig.baseUrl}');
      }
      throw Exception('Error de red: \$e');
    }
  }

  static Map<String, dynamic> parseResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return json.decode(response.body);
    } else {
      throw Exception('Error HTTP \${response.statusCode}: \${response.body}');
    }
  }

  static List<Map<String, dynamic>> parseListResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return [];
      final List<dynamic> data = json.decode(response.body);
      return data.cast<Map<String, dynamic>>();
    } else {
      throw Exception('Error HTTP \${response.statusCode}: \${response.body}');
    }
  }
}
`;
}

function basePubspecYaml(): string {
  return `name: uml_flutter_ui
description: UI generada automáticamente desde un diagrama UML (CRUD conectado a API)
publish_to: "none"
version: 0.1.0

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  provider: ^6.1.1

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true
`;
}

function baseMainDart(entityNames: string[] = []): string {
  // Sidebar Drawer items
  const drawerItems = entityNames.map((name) => {
    const pascal = FlutterGen.toPascalCase(name);
    const snake = FlutterGen.toSnakeCase(name);
    return `ListTile(
      leading: Icon(Icons.table_chart),
      title: Text('${pascal}'),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => ${pascal}ListScreen()),
        );
      },
    ),`;
  }).join('\n              ');

  return `import 'package:flutter/material.dart';
${entityNames.map(name => `import 'screens/${FlutterGen.toSnakeCase(name)}/${FlutterGen.toSnakeCase(name)}_list_screen.dart';`).join('\n')}

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
      home: _HomeGenerated(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class _HomeGenerated extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Proyecto Flutter generado')),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: <Widget>[
            DrawerHeader(
              decoration: BoxDecoration(color: Colors.blue),
              child: Text('Tablas UML', style: TextStyle(color: Colors.white, fontSize: 24)),
            ),
${drawerItems}
          ],
        ),
      ),
      body: Center(
        child: Text(
          'Selecciona una tabla en el menú lateral para ver su CRUD.',
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

// Generar servicio API específico para cada entidad
function generateEntityServiceDart(cls: UMLEntity): string {
  const className = FlutterGen.toPascalCase(cls.name);
  const snake = FlutterGen.toSnakeCase(cls.name);
  const endpoint = `${cls.name.toLowerCase()}s`; // Plural para endpoint REST

  return `import 'dart:convert';
import '../services/api_service.dart';
import '../models/${snake}_model.dart';

class ${className}Service {
  static const String endpoint = '${endpoint}';

  static Future<List<${className}>> getAll() async {
    try {
      final response = await ApiService.get(endpoint);
      final List<Map<String, dynamic>> data = ApiService.parseListResponse(response);
      return data.map((json) => ${className}.fromJson(json)).toList();
    } catch (e) {
      print('Error al obtener ${endpoint}: \$e');
      rethrow;
    }
  }

  static Future<${className}?> getById(int id) async {
    try {
      final response = await ApiService.get('\$endpoint/\$id');
      final Map<String, dynamic> data = ApiService.parseResponse(response);
      return ${className}.fromJson(data);
    } catch (e) {
      print('Error al obtener ${cls.name.toLowerCase()} \$id: \$e');
      return null;
    }
  }

  static Future<${className}> create(${className} ${cls.name.toLowerCase()}) async {
    try {
      final response = await ApiService.post(endpoint, ${cls.name.toLowerCase()}.toJson());
      final Map<String, dynamic> data = ApiService.parseResponse(response);
      return ${className}.fromJson(data);
    } catch (e) {
      print('Error al crear ${cls.name.toLowerCase()}: \$e');
      rethrow;
    }
  }

  static Future<${className}> update(int id, ${className} ${cls.name.toLowerCase()}) async {
    try {
      final response = await ApiService.put('\$endpoint/\$id', ${cls.name.toLowerCase()}.toJson());
      final Map<String, dynamic> data = ApiService.parseResponse(response);
      return ${className}.fromJson(data);
    } catch (e) {
      print('Error al actualizar ${cls.name.toLowerCase()}: \$e');
      rethrow;
    }
  }

  static Future<bool> delete(int id) async {
    try {
      await ApiService.delete('\$endpoint/\$id');
      return true;
    } catch (e) {
      print('Error al eliminar ${cls.name.toLowerCase()}: \$e');
      return false;
    }
  }
}
`;
}

function exportClassScreens(zip: JSZip, cls: UMLEntity) {
  const snake = FlutterGen.toSnakeCase(cls.name);
  const models = zip.folder("lib")!.folder("models")!;
  const screenFolder = zip.folder("lib")!.folder("screens")!.folder(snake)!;
  const services = zip.folder("lib")!.folder("services")!;

  models.file(`${snake}_model.dart`, genModelDart(cls));
  services.file(`${snake}_service.dart`, generateEntityServiceDart(cls));
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
  lib.folder("services");

  // Archivos base del proyecto
  zip.file("pubspec.yaml", basePubspecYaml());
  lib.file("main.dart", baseMainDart((diagram.entities ?? []).map(e => e.name)));
  
  // Archivos de configuración y servicios
  lib.folder("services")!.file("api_config.dart", baseApiConfigDart());
  lib.folder("services")!.file("api_service.dart", baseApiServiceDart());

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
