export interface SimulationErrorDetail {
  /**
   * Codigo de error o identificador interno.
   */
  code?: string;
  /**
   * Descripcion corta para mostrar como titulo.
   */
  title: string;
  /**
   * Mensaje principal para explicar el problema.
   */
  description: string;
  /**
   * Accion concreta para que la persona usuaria pueda resolverlo.
   */
  solution: string;
}
