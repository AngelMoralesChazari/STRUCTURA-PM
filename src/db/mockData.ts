import type { Proyecto, CategoriaManoObra, ConfiguracionSobrecosto, ConceptoObra, Estimacion, Finiquito } from '../types';

export const mockProyectos: Proyecto[] = [
  {
    id: 'proj-001',
    codigo: 'PE-2026-001',
    nombre: 'Construcción de Puente Vehicular "Río Seco"',
    descripcion: 'Construcción de superestructura de concreto y subestructura cimentada sobre pilotes para puente vehicular de dos carriles.',
    ubicacion: 'Carretera Federal Km 45+200, Veracruz, México',
    contratista: 'Cimentaciones y Puentes de México S.A. de C.V.',
    montoContratado: 4578500.00, // Calculated from concepts
    anticipoPorcentaje: 30, // 30% advance
    amortizadoAcumulado: 412065.00,
    retencionPorcentaje: 5, // 5% guarantee fund
    ivaPorcentaje: 16,
    fechaInicio: '2026-08-01',
    fechaFin: '2027-02-28',
    estado: 'Ejecucion',
    creadoEn: '2026-08-01T10:00:00Z'
  },
  {
    id: 'proj-002',
    codigo: 'PE-2026-002',
    nombre: 'Pavimentación de Calle Principal "Juárez"',
    descripcion: 'Pavimentación con concreto hidráulico, guarniciones y banquetas de la calle principal en la cabecera municipal.',
    ubicacion: 'Centro Histórico, Querétaro, México',
    contratista: 'Pavimentos y Urbanizaciones del Bajío',
    montoContratado: 1250000.00,
    anticipoPorcentaje: 20,
    amortizadoAcumulado: 250000.00,
    retencionPorcentaje: 5,
    ivaPorcentaje: 16,
    fechaInicio: '2026-05-10',
    fechaFin: '2026-07-25',
    estado: 'Finiquitado',
    creadoEn: '2026-05-10T08:00:00Z'
  }
];

export const mockTabuladores: { [proyectoId: string]: CategoriaManoObra[] } = {
  'proj-001': [
    {
      id: 'mo-01',
      proyectoId: 'proj-001',
      categoria: 'Peón de Construcción',
      sbc: 280.00,
      fs: 1.282,
      ips: 98.50,
      fasar: 1.6338, // 1.282 + (98.50 / 280)
      sr: 457.46
    },
    {
      id: 'mo-02',
      proyectoId: 'proj-001',
      categoria: 'Albañil Oficial',
      sbc: 450.00,
      fs: 1.282,
      ips: 110.00,
      fasar: 1.5264, // 1.282 + (110 / 450)
      sr: 686.90
    },
    {
      id: 'mo-03',
      proyectoId: 'proj-001',
      categoria: 'Oficial Fierrero / Carpintero',
      sbc: 460.00,
      fs: 1.282,
      ips: 112.00,
      fasar: 1.5255,
      sr: 701.73
    },
    {
      id: 'mo-04',
      proyectoId: 'proj-001',
      categoria: 'Cabo de Oficios',
      sbc: 550.00,
      fs: 1.282,
      ips: 125.00,
      fasar: 1.5093,
      sr: 830.10
    }
  ],
  'proj-002': [
    {
      id: 'mo-21',
      proyectoId: 'proj-002',
      categoria: 'Peón de Construcción',
      sbc: 270.00,
      fs: 1.280,
      ips: 95.00,
      fasar: 1.6319,
      sr: 440.60
    },
    {
      id: 'mo-22',
      proyectoId: 'proj-002',
      categoria: 'Albañil Oficial',
      sbc: 430.00,
      fs: 1.280,
      ips: 108.00,
      fasar: 1.5312,
      sr: 658.40
    }
  ]
};

export const mockSobrecostos: { [proyectoId: string]: ConfiguracionSobrecosto } = {
  'proj-001': {
    proyectoId: 'proj-001',
    indirectosOficinaCentral: 5.5,
    indirectosOficinaCampo: 8.2,
    financiamiento: 1.8,
    utilidad: 10.0,
    cargosAdicionales: 0.5,
    factorSobrecostoTotal: 1.2863 // (1 + 0.137) * (1 + 0.018) * (1 + 0.10) * (1 + 0.005) => ~1.2863
  },
  'proj-002': {
    proyectoId: 'proj-002',
    indirectosOficinaCentral: 4.5,
    indirectosOficinaCampo: 6.5,
    financiamiento: 1.2,
    utilidad: 8.0,
    cargosAdicionales: 0.5,
    factorSobrecostoTotal: 1.2230
  }
};

export const mockConceptos: { [proyectoId: string]: ConceptoObra[] } = {
  'proj-001': [
    {
      id: 'c-01',
      proyectoId: 'proj-001',
      partida: '01. CIMENTACIONES',
      codigo: 'CIM-01',
      descripcion: 'Excavación por medios mecánicos en terreno tipo II seco, incluye extracción y acarreo libre a 20 m de distancia.',
      unidad: 'm3',
      cantidadPresupuestada: 450,
      costoDirecto: 120.00,
      precioUnitario: 154.36, // 120 * 1.2863
      importe: 69462.00, // 450 * 154.36
      apu: {
        materiales: [],
        manoObra: [
          { id: 'apu-mo-1', codigo: 'MO-PEON', descripcion: 'Peón de Construcción (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 457.46, rendimiento: 0.08, importe: 36.60 },
          { id: 'apu-mo-2', codigo: 'MO-CABO', descripcion: 'Cabo de Oficios (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 830.10, rendimiento: 0.01, importe: 8.30 }
        ],
        maquinaria: [
          { id: 'apu-maq-1', codigo: 'MQ-RETRO', descripcion: 'Retroexcavadora Caterpillar 320B (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 750.00, rendimiento: 0.10, importe: 75.00 },
          { id: 'apu-maq-2', codigo: 'MQ-HERRAM', descripcion: 'Herramienta Menor (3% Mano Obra)', tipo: 'Maquinaria', unidad: '%', costoUnitario: 44.90, rendimiento: 0.03, importe: 1.35 }
        ]
      },
      programacion: {
        '2026-08': 250,
        '2026-09': 200
      }
    },
    {
      id: 'c-02',
      proyectoId: 'proj-001',
      partida: '01. CIMENTACIONES',
      codigo: 'CIM-02',
      descripcion: 'Pilote de concreto armado de f\'c=300 kg/cm2, de 40 cm de diámetro, colado en sitio, incluye perforación, acero de refuerzo y habilitado.',
      unidad: 'm',
      cantidadPresupuestada: 380,
      costoDirecto: 1850.00,
      precioUnitario: 2379.66, // 1850 * 1.2863
      importe: 904270.80,
      apu: {
        materiales: [
          { id: 'apu-mat-1', codigo: 'MT-CONCR', descripcion: 'Concreto premezclado f\'c=300 kg/cm2 (m3)', tipo: 'Material', unidad: 'm3', costoUnitario: 2400.00, rendimiento: 0.13, importe: 312.00 },
          { id: 'apu-mat-2', codigo: 'MT-ACERO', descripcion: 'Acero de refuerzo FY=4200 kg/cm2 (kg)', tipo: 'Material', unidad: 'kg', costoUnitario: 26.50, rendimiento: 35.00, importe: 927.50 }
        ],
        manoObra: [
          { id: 'apu-mo-3', codigo: 'MO-ALBANIL', descripcion: 'Albañil Oficial (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 686.90, rendimiento: 0.35, importe: 240.42 },
          { id: 'apu-mo-4', codigo: 'MO-PEON', descripcion: 'Peón de Construcción (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 457.46, rendimiento: 0.50, importe: 228.73 }
        ],
        maquinaria: [
          { id: 'apu-maq-3', codigo: 'MQ-PERFORA', descripcion: 'Perforadora rotatoria hidráulica (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 1200.00, rendimiento: 0.10, importe: 120.00 },
          { id: 'apu-maq-4', codigo: 'MQ-VIBRA', descripcion: 'Vibrador de concreto (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 150.00, rendimiento: 0.14, importe: 21.00 }
        ]
      },
      programacion: {
        '2026-08': 100,
        '2026-09': 150,
        '2026-10': 130
      }
    },
    {
      id: 'c-03',
      proyectoId: 'proj-001',
      partida: '02. SUPERESTRUCTURA',
      codigo: 'SUP-01',
      descripcion: 'Concreto hidráulico f\'c=350 kg/cm2 en vigas y losas de superestructura, colado con bomba, acabado pulido.',
      unidad: 'm3',
      cantidadPresupuestada: 420,
      costoDirecto: 3800.00,
      precioUnitario: 4887.94,
      importe: 2052934.80,
      apu: {
        materiales: [
          { id: 'apu-mat-3', codigo: 'MT-CONCR350', descripcion: 'Concreto premezclado f\'c=350 kg/cm2 (m3)', tipo: 'Material', unidad: 'm3', costoUnitario: 2800.00, rendimiento: 1.03, importe: 2884.00 }
        ],
        manoObra: [
          { id: 'apu-mo-5', codigo: 'MO-ALBANIL', descripcion: 'Albañil Oficial (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 686.90, rendimiento: 0.40, importe: 274.76 },
          { id: 'apu-mo-6', codigo: 'MO-PEON', descripcion: 'Peón de Construcción (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 457.46, rendimiento: 0.80, importe: 365.97 }
        ],
        maquinaria: [
          { id: 'apu-maq-5', codigo: 'MQ-BOMBA', descripcion: 'Bomba de concreto pluma (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 1500.00, rendimiento: 0.15, importe: 225.00 },
          { id: 'apu-maq-6', codigo: 'MQ-HERRAM', descripcion: 'Herramienta Menor y Equipo (3%)', tipo: 'Maquinaria', unidad: '%', costoUnitario: 640.73, rendimiento: 0.08, importe: 51.26 }
        ]
      },
      programacion: {
        '2026-10': 80,
        '2026-11': 150,
        '2026-12': 150,
        '2027-01': 40
      }
    },
    {
      id: 'c-04',
      proyectoId: 'proj-001',
      partida: '02. SUPERESTRUCTURA',
      codigo: 'SUP-02',
      descripcion: 'Acero de refuerzo en superestructura de grado 42 (fy=4200 kg/cm2) de diámetros de 1/2" a 1 1/2", incluye cortes, dobleces, traslapes, alambre y silletas.',
      unidad: 'ton',
      cantidadPresupuestada: 48,
      costoDirecto: 25000.00,
      precioUnitario: 32157.50,
      importe: 1543560.00,
      apu: {
        materiales: [
          { id: 'apu-mat-4', codigo: 'MT-ACEROTON', descripcion: 'Acero corrugado varilla (ton)', tipo: 'Material', unidad: 'ton', costoUnitario: 22000.00, rendimiento: 1.05, importe: 23100.00 },
          { id: 'apu-mat-5', codigo: 'MT-ALAMBRE', descripcion: 'Alambre recocido (kg)', tipo: 'Material', unidad: 'kg', costoUnitario: 32.00, rendimiento: 15.00, importe: 480.00 }
        ],
        manoObra: [
          { id: 'apu-mo-7', codigo: 'MO-FIERRERO', descripcion: 'Oficial Fierrero (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 701.73, rendimiento: 1.50, importe: 1052.60 },
          { id: 'apu-mo-8', codigo: 'MO-PEON', descripcion: 'Peón de Construcción (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 457.46, rendimiento: 0.70, importe: 320.22 }
        ],
        maquinaria: [
          { id: 'apu-maq-7', codigo: 'MQ-DOBLADORA', descripcion: 'Cortadora/Dobladora de acero (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 80.00, rendimiento: 0.50, importe: 40.00 },
          { id: 'apu-maq-8', codigo: 'MQ-HERRAM', descripcion: 'Herramienta Menor (3%)', tipo: 'Maquinaria', unidad: '%', costoUnitario: 1372.82, rendimiento: 0.03, importe: 41.18 }
        ]
      },
      programacion: {
        '2026-10': 15,
        '2026-11': 15,
        '2026-12': 15,
        '2027-01': 3
      }
    }
  ],
  'proj-002': [
    {
      id: 'c-21',
      proyectoId: 'proj-002',
      partida: '01. PAVIMENTO',
      codigo: 'PAV-01',
      descripcion: 'Suministro y colocación de concreto hidráulico premezclado MR-45, espesor de 15 cm, incluye cimbrado y curado.',
      unidad: 'm2',
      cantidadPresupuestada: 2500,
      costoDirecto: 410.00,
      precioUnitario: 501.43,
      importe: 1253575.00,
      apu: {
        materiales: [
          { id: 'apu-mat-21', codigo: 'MT-CONCRMR45', descripcion: 'Concreto MR-45 (m3)', tipo: 'Material', unidad: 'm3', costoUnitario: 2200.00, rendimiento: 0.16, importe: 352.00 }
        ],
        manoObra: [
          { id: 'apu-mo-21', codigo: 'MO-ALBANIL', descripcion: 'Albañil Oficial (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 658.40, rendimiento: 0.05, importe: 32.92 },
          { id: 'apu-mo-22', codigo: 'MO-PEON', descripcion: 'Peón de Construcción (Jornada)', tipo: 'Mano de Obra', unidad: 'jor', costoUnitario: 440.60, rendimiento: 0.05, importe: 22.03 }
        ],
        maquinaria: [
          { id: 'apu-maq-21', codigo: 'MQ-CORTA', descripcion: 'Cortadora de disco para concreto (Hora)', tipo: 'Maquinaria', unidad: 'hr', costoUnitario: 60.00, rendimiento: 0.05, importe: 3.00 }
        ]
      },
      programacion: {
        '2026-05': 1000,
        '2026-06': 1000,
        '2026-07': 500
      }
    }
  ]
};

export const mockEstimaciones: { [proyectoId: string]: Estimacion[] } = {
  'proj-001': [
    {
      id: 'est-001',
      proyectoId: 'proj-001',
      numeroEstimacion: 1,
      periodoInicio: '2026-08-01',
      periodoFin: '2026-08-31',
      montoBruto: 276428.00, // 250 * 154.36 (excavación) + 100 * 2379.66 (pilotes)
      amortizacionAnticipo: 82928.40, // 30% of 276,428
      retencionGarantia: 13821.40, // 5% of 276,428
      subtotal: 179678.20, // 276,428 - 82,928.40 - 13,821.40
      iva: 28748.51, // 16% of 179,678.20
      liquidoAPagar: 208426.71,
      estado: 'Aprobada',
      fechaRegistro: '2026-08-31T17:00:00Z',
      soporteFotografico: [
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23475569">Foto Generador 1: Excavaciones</text></svg>',
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23475569">Foto Generador 2: Habilitado de Pilotes</text></svg>'
      ],
      avances: [
        {
          conceptoId: 'c-01',
          volumenAnterior: 0,
          volumenActual: 250,
          volumenAcumulado: 250,
          saldoVolumen: 200,
          importeActual: 38590.00
        },
        {
          conceptoId: 'c-02',
          volumenAnterior: 0,
          volumenActual: 100,
          volumenAcumulado: 100,
          saldoVolumen: 280,
          importeActual: 237966.00
        },
        {
          conceptoId: 'c-03',
          volumenAnterior: 0,
          volumenActual: 0,
          volumenAcumulado: 0,
          saldoVolumen: 420,
          importeActual: 0.00
        },
        {
          conceptoId: 'c-04',
          volumenAnterior: 0,
          volumenActual: 0,
          volumenAcumulado: 0,
          saldoVolumen: 48,
          importeActual: 0.00
        }
      ]
    },
    {
      id: 'est-002',
      proyectoId: 'proj-001',
      numeroEstimacion: 2,
      periodoInicio: '2026-09-01',
      periodoFin: '2026-09-30',
      montoBruto: 387821.00, // 200 * 154.36 (excavación) + 150 * 2379.66 (pilotes)
      amortizacionAnticipo: 116346.30, // 30%
      retencionGarantia: 19391.05, // 5%
      subtotal: 252083.65,
      iva: 40333.38,
      liquidoAPagar: 292417.03,
      estado: 'Enviada',
      fechaRegistro: '2026-09-30T16:00:00Z',
      soporteFotografico: [
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23475569">Foto Generador 3: Colado de Cabezal</text></svg>'
      ],
      avances: [
        {
          conceptoId: 'c-01',
          volumenAnterior: 250,
          volumenActual: 200,
          volumenAcumulado: 450,
          saldoVolumen: 0,
          importeActual: 30872.00
        },
        {
          conceptoId: 'c-02',
          volumenAnterior: 100,
          volumenActual: 150,
          volumenAcumulado: 250,
          saldoVolumen: 130,
          importeActual: 356949.00
        },
        {
          conceptoId: 'c-03',
          volumenAnterior: 0,
          volumenActual: 0,
          volumenAcumulado: 0,
          saldoVolumen: 420,
          importeActual: 0.00
        },
        {
          conceptoId: 'c-04',
          volumenAnterior: 0,
          volumenActual: 0,
          volumenAcumulado: 0,
          saldoVolumen: 48,
          importeActual: 0.00
        }
      ]
    }
  ],
  'proj-002': [
    {
      id: 'est-201',
      proyectoId: 'proj-002',
      numeroEstimacion: 1,
      periodoInicio: '2026-05-10',
      periodoFin: '2026-06-15',
      montoBruto: 1253575.00, // 2500 * 501.43
      amortizacionAnticipo: 250715.00,
      retencionGarantia: 62678.75,
      subtotal: 940181.25,
      iva: 150429.00,
      liquidoAPagar: 1090610.25,
      estado: 'Aprobada',
      fechaRegistro: '2026-06-15T18:00:00Z',
      soporteFotografico: [],
      avances: [
        {
          conceptoId: 'c-21',
          volumenAnterior: 0,
          volumenActual: 2500,
          volumenAcumulado: 2500,
          saldoVolumen: 0,
          importeActual: 1253575.00
        }
      ]
    }
  ]
};

export const mockFiniquitos: { [proyectoId: string]: Finiquito } = {
  'proj-002': {
    id: 'fin-002',
    proyectoId: 'proj-002',
    montoOriginal: 1250000.00,
    montoEjecutadoReal: 1253575.00,
    montoAmortizadoTotal: 250715.00,
    montoRetenidoTotal: 62678.75,
    montoDevueltoRetenciones: 62678.75,
    saldoFinalLiquido: 66258.75, // Ajustado
    estado: 'Firmado',
    fechaFirma: '2026-07-28',
    firmanteAuditor: 'Arq. Luis Gómez (Auditor Externo)',
    firmanteContratista: 'Ing. Carlos Mendoza (Representante Legal)',
    firmanteResidente: 'Ing. Alberto Silva (Residente de Obra)'
  }
};
