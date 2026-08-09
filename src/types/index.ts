export type UserRole = 'Administrador' | 'Residente' | 'Auditor';

export interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: UserRole;
}

export interface Proyecto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  contratista: string;
  montoContratado: number; // Sum of all concepts (cantidad * PU)
  anticipoPorcentaje: number; // Percentage, e.g. 30
  amortizadoAcumulado: number;
  retencionPorcentaje: number; // Percentage, e.g. 5
  ivaPorcentaje: number; // Percentage, e.g. 16
  fechaInicio: string;
  fechaFin: string;
  estado: 'Licitacion' | 'Ejecucion' | 'Finiquitado';
  creadoEn?: string;
}

export interface CategoriaManoObra {
  id: string;
  proyectoId: string;
  categoria: string; // e.g., Albañil, Peón, Cabo, Oficial Fierrero
  sbc: number; // Salario Base de Cotización
  fs: number; // Factor de Salario (e.g. 1.25)
  ips: number; // Importe Prestaciones Seguridad Social
  fasar: number; // Calculated: fs + (ips / sbc)
  sr: number; // Salario Real: sbc * fasar
}

export interface ConfiguracionSobrecosto {
  proyectoId: string;
  indirectosOficinaCentral: number; // Percentage, e.g. 5.5
  indirectosOficinaCampo: number; // Percentage, e.g. 8.2
  financiamiento: number; // Percentage, e.g. 1.5
  utilidad: number; // Percentage, e.g. 10.0
  cargosAdicionales: number; // Percentage, e.g. 0.5 (inspección)
  factorSobrecostoTotal: number; // Calculated: (1 + %Ind) * (1 + %Fin) * (1 + %Util) * (1 + %CargosAdic)
}

export interface InsumoAPU {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: 'Material' | 'Mano de Obra' | 'Maquinaria';
  unidad: string;
  costoUnitario: number;
  rendimiento: number; // Quantity needed per unit of concept
  importe: number; // Calculated: costoUnitario * rendimiento
}

export interface ConceptoObra {
  id: string;
  proyectoId: string;
  partida: string; // e.g. Cimentación, Estructura, Acabados
  codigo: string; // e.g. PRE-01
  descripcion: string;
  unidad: string;
  cantidadPresupuestada: number;
  costoDirecto: number; // Sum of APU items imports
  precioUnitario: number; // costoDirecto * factorSobrecostoTotal
  importe: number; // cantidadPresupuestada * precioUnitario
  apu: {
    materiales: InsumoAPU[];
    manoObra: InsumoAPU[];
    maquinaria: InsumoAPU[];
  };
  programacion: {
    [periodo: string]: number; // Quantity programmed for that period (e.g., "2026-09": 50)
  };
}

export interface EstimacionConceptoAvance {
  conceptoId: string;
  volumenAnterior: number;
  volumenActual: number; // Captured by user
  volumenAcumulado: number;
  saldoVolumen: number;
  importeActual: number;
}

export interface Estimacion {
  id: string;
  proyectoId: string;
  numeroEstimacion: number;
  periodoInicio: string;
  periodoFin: string;
  avances: EstimacionConceptoAvance[];
  montoBruto: number; // Sum of (volumenActual * PU)
  amortizacionAnticipo: number; // project.anticipoPorcentaje% * montoBruto
  retencionGarantia: number; // project.retencionPorcentaje% * montoBruto
  subtotal: number; // montoBruto - amortizacion - retencion
  iva: number; // subtotal * project.ivaPorcentaje%
  liquidoAPagar: number; // subtotal + iva
  estado: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada';
  fechaRegistro: string;
  soporteFotografico: string[]; // Array of base64 strings or image urls
  descripcion?: string; // Optional description or custom name for label identification (e.g. Extraordinaria 1, Bis)
  esFiniquito?: boolean; // True if this estimation represents the project's final contractual closure (Finiquito)
}

export interface Finiquito {
  id: string;
  proyectoId: string;
  montoOriginal: number;
  montoEjecutadoReal: number;
  montoAmortizadoTotal: number;
  montoRetenidoTotal: number;
  montoDevueltoRetenciones: number;
  saldoFinalLiquido: number;
  estado: 'Abierto' | 'Firmado';
  fechaFirma?: string;
  firmanteAuditor?: string;
  firmanteContratista?: string;
  firmanteResidente?: string;
}
