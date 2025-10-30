# HidroHome

Aplicación web para diseñar y simular instalaciones hidráulicas residenciales. Permite armar la red en 2D, obtener una vista 3D simplificada y correr simulaciones hidráulicas mediante EPANET.

## Características principales

- Biblioteca inicial de dispositivos (artefactos sanitarios, conexiones, tuberías, bombas y válvulas) con arrastrar y soltar.
- Lienzo 2D interactivo con snapping básico, edición de propiedades y creación de caños enlazando nodos.
- Motor de simulación encapsulado en un Web Worker usando `epanet-js` (EPANET 2.2 en WASM).
- Resultados hidráulicos (presión, caudal, pérdidas) mostrados en el panel lateral y vinculados con el inspector de elementos.
- Visualización 3D ligera generada con Three.js para una referencia volumétrica de la red.
- Autosave local (IndexedDB) y exportación/importación de proyectos en formato JSON (`.hydrohome.json`).
- Preferencias de unidades con preset argentino por defecto.

## Stack

- **Frontend**: React 19 + TypeScript, Vite, Mantine UI, Zustand.
- **Canvas 2D**: react-konva / Konva.
- **Motor hidráulico**: epanet-js (OWA-EPANET 2.2) ejecutado dentro de un Web Worker.
- **Visualización 3D**: Three.js.
- **Persistencia local**: idb-keyval (IndexedDB) + export/import de archivos.

## Requisitos

- Node.js 20+
- npm 10+

## Puesta en marcha

```bash
npm install
npm run dev
```

El servidor de desarrollo se levanta en `http://localhost:5173`.

### Comandos adicionales

- `npm run build`: compila la aplicación para producción (genera artefactos en `dist/`).
- `npm run preview`: sirve el build de producción de forma local.

## Uso rápido

1. **Agregar elementos**: Arrastra dispositivos desde el panel izquierdo hacia el lienzo.
2. **Conectar tuberías**: Haz clic en un elemento de tipo caño/válvula/bomba en el catálogo para activar la herramienta de conexión, selecciona el nodo origen y luego el destino.
3. **Editar propiedades**: Selecciona un nodo o enlace y ajusta sus valores (demanda, elevación, diámetro, potencia, etc.) en el inspector derecho.
4. **Simular**: Pulsa "Ejecutar simulación"; los resultados se muestran en el panel y dentro del inspector del elemento seleccionado.
5. **Guardar / Recuperar**: Usa los botones de exportar/importar en la cabecera. El autosave guarda en segundo plano mientras haya cambios.

## Formato de proyecto

Los proyectos se guardan como JSON con estructura:

```json
{
  "version": "0.1.0",
  "network": { "...": "..." },
  "preferences": { "unitSystem": "ar" }
}
```

Puedes versionar estos archivos o compartirlos entre equipos para continuar el trabajo.

### Configuración mínima de prueba

Para verificar que el motor de simulación funciona con los elementos básicos, puedes importar el archivo
[`examples/minimal-network.json`](examples/minimal-network.json). Esta red contiene:

- Un **reservorio** con altura de carga inicial de 10 m.
- Un **tanque elevado** con niveles mínimo/máximo válidos y diámetro positivo.
- Una **ducha** como punto de consumo con demanda base configurada.
- Dos tramos de **cañería PVC de 25 mm** que unen el reservorio con el tanque y el tanque con la ducha.

Sigue estos pasos para probarla:

1. Abre la aplicación y ve al menú de importar proyecto.
2. Selecciona el archivo `minimal-network.json` ubicado en la carpeta `examples/`.
3. Ejecuta la simulación; si la red se importó correctamente, EPANET debería correr sin mostrar errores de datos incompletos.

## Limitaciones del MVP

- No hay control de colisiones, snaps ni rejilla inteligente avanzada.
- El cálculo hidráulico no valida entradas; redes incompletas pueden fallar al simular.
- Catálogo inicial acotado; faltan materiales y accesorios específicos.
- Vista 3D es conceptual (no reemplaza modelos BIM).
- No hay colaboración multiusuario ni backend.

## Próximos pasos sugeridos

1. Mejorar herramientas de dibujo (snapping, alineado, mediciones).
2. Añadir catálogos personalizados y librerías de materiales.
3. Incorporar análisis adicionales (transientes, calidad de agua, reportes detallados).
4. Extender preferencias (temas de color, plantillas de proyecto, perfiles de demanda).
5. Investigar integración con archivos EPANET `.inp` externos y exportaciones CAD/BIM.

## Estructura del código

```
src/
  app/                 # Shell principal (App, providers)
  modules/
    catalog/           # Catálogo y drag & drop
    editor/            # Lienzo 2D, inspector, herramientas
    simulation/        # Worker EPANET, hooks, panel de resultados
    storage/           # Autosave e import/export
    viewer3d/          # Vista 3D Three.js
  shared/
    constants/         # Catálogo y presets
    state/             # Store global (Zustand)
    types/             # Modelos de dominio
    utils/             # Utilidades varias
  styles/              # Estilos globales
```

---

Este MVP es una base extensible para continuar evolucionando HidroHome según las necesidades del proyecto.
