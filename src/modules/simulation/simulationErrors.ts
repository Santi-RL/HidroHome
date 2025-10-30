import type { SimulationErrorDetail } from '../../shared/types/simulation';

const createDetail = (
  code: string,
  title: string,
  description: string,
  solution: string,
): SimulationErrorDetail => ({
  code,
  title,
  description,
  solution,
});

const EPANET_ERROR_CODES: Record<number, SimulationErrorDetail> = {
  100: createDetail(
    'EPANET_100',
    'Error al inicializar archivos temporales',
    'EPANET no pudo preparar los archivos auxiliares necesarios para simular.',
    'Cierra otras aplicaciones que puedan estar usando el proyecto, guarda los cambios y vuelve a intentar.',
  ),
  101: createDetail(
    'EPANET_101',
    'Memoria insuficiente durante la simulación',
    'El motor hidráulico no logró reservar memoria para completar el cálculo.',
    'Cierra otras pestañas o aplicaciones pesadas y vuelve a ejecutar la simulación.',
  ),
  109: createDetail(
    'EPANET_109',
    'No se pudo generar el archivo de entrada',
    'El motor no pudo crear el archivo temporal con la red hidráulica.',
    'Vuelve a ejecutar la simulación. Si el error continúa, descarga tu proyecto y reinicia HidroHome.',
  ),
  110: createDetail(
    'EPANET_110',
    'No se pudo crear el reporte de resultados',
    'EPANET no consiguió escribir el archivo de reporte de la simulación.',
    'Comprueba que tengas espacio libre en disco y vuelve a ejecutar la simulación.',
  ),
  200: createDetail(
    'EPANET_200',
    'Datos incompletos en la red hidráulica',
    'EPANET detectó datos inconsistentes en el archivo de entrada (código 200).',
    'Revisa que existan fuentes de agua, que cada nodo esté conectado y que las tuberías tengan dimensiones válidas.',
  ),
  201: createDetail(
    'EPANET_201',
    'Sección del archivo de entrada incompleta',
    'Falta información obligatoria en una de las secciones del modelo.',
    'Abre el panel de propiedades de cada elemento y completa los campos marcados como obligatorios.',
  ),
  202: createDetail(
    'EPANET_202',
    'Identificador de nodo inválido',
    'Hay un nodo con un identificador duplicado o con caracteres no admitidos.',
    'Elimina y vuelve a crear el nodo indicado para regenerar un identificador válido.',
  ),
  203: createDetail(
    'EPANET_203',
    'Identificador de conexión inválido',
    'Se detectó una tubería, bomba o válvula con un identificador duplicado.',
    'Elimina la conexión indicada y vuelve a dibujarla para obtener un identificador nuevo.',
  ),
  204: createDetail(
    'EPANET_204',
    'Nodo referenciado inexistente',
    'Una conexión apunta a un nodo que no forma parte del modelo.',
    'Vuelve a crear la conexión seleccionando nodos válidos en ambos extremos.',
  ),
  205: createDetail(
    'EPANET_205',
    'Datos de nodo fuera de rango',
    'Un nodo tiene elevación, demanda u otro atributo con valores imposibles.',
    'Corrige la elevación y demanda de los nodos resaltados en el editor.',
  ),
  206: createDetail(
    'EPANET_206',
    'Datos de conexión fuera de rango',
    'Una tubería o válvula tiene dimensiones o propiedades fuera de los límites permitidos.',
    'Revisa las propiedades de la conexión para asegurar longitudes, diámetros y rugosidades positivos.',
  ),
  207: createDetail(
    'EPANET_207',
    'Configuración de bomba inválida',
    'Una bomba tiene parámetros incompletos o inconsistentes.',
    'Verifica la potencia o curva de la bomba y vuelve a ejecutar la simulación.',
  ),
  208: createDetail(
    'EPANET_208',
    'Configuración de válvula inválida',
    'Una válvula tiene parámetros incompletos o inconsistentes.',
    'Revisa el tipo de válvula y su ajuste inicial antes de simular nuevamente.',
  ),
  209: createDetail(
    'EPANET_209',
    'Faltan coordenadas de algunos nodos',
    'Hay nodos sin coordenadas en el plano de dibujo.',
    'Mueve cada nodo afectado para asignarle una posición válida.',
  ),
  301: createDetail(
    'EPANET_301',
    'El cálculo hidráulico no convergió',
    'El solucionador hidráulico se detuvo sin encontrar un equilibrio.',
    'Revisa el estado de las válvulas, la dirección de las bombas y las demandas para facilitar la convergencia.',
  ),
  302: createDetail(
    'EPANET_302',
    'Un tanque se vació completamente',
    'Durante la simulación un tanque quedó fuera de rango de operación.',
    'Revisa los niveles mínimos del tanque o agrega válvulas de control para evitar que se vacíe.',
  ),
  303: createDetail(
    'EPANET_303',
    'Demasiados pasos para alcanzar la convergencia',
    'El modelo requiere más iteraciones de las permitidas.',
    'Reduce la complejidad del modelo o ajusta los parámetros de demanda y rugosidad.',
  ),
};

const buildRangeDetail = (code: number, originalMessage: string): SimulationErrorDetail => {
  if (code >= 100 && code < 200) {
    return createDetail(
      `EPANET_${code}`,
      'Error de sistema al preparar la simulación',
      `EPANET devolvió el código ${code} al acceder a los archivos necesarios (${originalMessage}).`,
      'Reintenta la simulación y, si continúa fallando, descarga el proyecto y vuelve a abrir HidroHome.',
    );
  }
  if (code >= 200 && code < 300) {
    return createDetail(
      `EPANET_${code}`,
      'Datos inválidos en el modelo hidráulico',
      `El motor detectó un dato inconsistente (código ${code}).`,
      'Revisa que cada nodo y conexión tenga parámetros dentro de los rangos admitidos.',
    );
  }
  if (code >= 300 && code < 400) {
    return createDetail(
      `EPANET_${code}`,
      'Fallo durante el cálculo hidráulico',
      `EPANET interrumpió el cálculo hidráulico (código ${code}).`,
      'Verifica los estados de válvulas y bombas, y considera ajustar rugosidades o demandas.',
    );
  }
  if (code >= 400 && code < 500) {
    return createDetail(
      `EPANET_${code}`,
      'Fallo durante el cálculo de calidad de agua',
      `EPANET detuvo la simulación de calidad de agua (código ${code}).`,
      'Revisa las fuentes de calidad, patrones y parámetros de reacción definidos en el proyecto.',
    );
  }
  return createDetail(
    `EPANET_${code}`,
    'Error desconocido del motor de simulación',
    `El motor devolvió el código ${code}. Mensaje original: ${originalMessage}`,
    'Reintenta la simulación y, si persiste, exporta el proyecto para solicitar asistencia.',
  );
};

export const mapWorkerErrorToDetails = (message: string): SimulationErrorDetail[] => {
  const details: SimulationErrorDetail[] = [];
  const normalizedMessage = message.trim();

  const codeMatch = normalizedMessage.match(/(?:error|code|código)\s*(\d{2,3})/i);
  if (codeMatch) {
    const code = Number(codeMatch[1]);
    const knownDetail = EPANET_ERROR_CODES[code];
    if (knownDetail) {
      details.push(knownDetail);
    } else {
      details.push(buildRangeDetail(code, normalizedMessage));
    }
  }

  if (normalizedMessage.toLowerCase().includes('hydraulic')) {
    details.push(
      createDetail(
        'HYDRAULIC_SOLVER',
        'El solucionador hidráulico se detuvo',
        normalizedMessage,
        'Revisa la topología del sistema y asegúrate de que existan caminos válidos desde las fuentes a los consumos.',
      ),
    );
  }

  if (normalizedMessage.toLowerCase().includes('quality')) {
    details.push(
      createDetail(
        'QUALITY_SOLVER',
        'El cálculo de calidad de agua falló',
        normalizedMessage,
        'Comprueba las fuentes de calidad y patrones antes de ejecutar nuevamente.',
      ),
    );
  }

  if (details.length === 0) {
    details.push(
      createDetail(
        'EPANET_GENERIC',
        'No se pudo completar la simulación',
        normalizedMessage || 'El motor de simulación devolvió un error no especificado.',
        'Vuelve a intentar y revisa la configuración de la red hidráulica.',
      ),
    );
  }

  return details;
};
