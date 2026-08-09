import React, { useState, useEffect } from 'react';
import type { Estimacion, Proyecto, ConceptoObra, Finiquito, EstimacionConceptoAvance } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { Plus, Eye, Image as ImageIcon, CheckCircle, XCircle, Trash2, ShieldCheck, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface EstimacionesGeneradoresProps {
  proyecto: Proyecto;
  rol: string;
  estimaciones: Estimacion[];
  conceptos: ConceptoObra[];
}

export const EstimacionesGeneradores: React.FC<EstimacionesGeneradoresProps> = ({
  proyecto,
  rol,
  estimaciones,
  conceptos
}) => {
  const [finiquito, setFiniquito] = useState<Finiquito | null>(null);
  const [loading, setLoading] = useState(true);

  // Active view: 'list' | 'create' | 'detail' | 'finiquito'
  const [viewState, setViewState] = useState<'list' | 'create' | 'detail' | 'finiquito'>('list');
  const [selectedEstimacion, setSelectedEstimacion] = useState<Estimacion | null>(null);

  // New Estimation Form
  const [numEstimacion, setNumEstimacion] = useState<number | ''>(1);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esFiniquito, setEsFiniquito] = useState(false);
  const [avancesInputs, setAvancesInputs] = useState<{ [conceptoId: string]: number }>({});
  const [soporteFotos, setSoporteFotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Finiquito signatures
  const [firmanteResidente, setFirmanteResidente] = useState('Ing. Sofía Morales');
  const [firmanteContratista, setFirmanteContratista] = useState('Ing. Carlos Mendoza');
  const [firmanteAuditor, setFirmanteAuditor] = useState('Mtro. Fernando Ortiz');

  useEffect(() => {
    setLoading(true);

    // Fetch finiquito
    const fetchFiniquito = async () => {
      try {
        const data = await dbAdapter.getFiniquito(proyecto.id);
        setFiniquito(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiniquito();
  }, [proyecto.id, estimaciones]);

  // Compute accumulated volumes for a concept prior to a specific estimation number
  const getVolumenAnteriorAcumulado = (conceptoId: string, currentEstNumber: number): number => {
    let sum = 0;
    estimaciones.forEach(e => {
      if (e.numeroEstimacion < currentEstNumber && e.estado === 'Aprobada') {
        const av = e.avances.find(a => a.conceptoId === conceptoId);
        if (av) {
          sum += av.volumenActual;
        }
      }
    });
    return sum;
  };

  const handleStartCreate = () => {
    // Prefill inputs
    const initialInputs: typeof avancesInputs = {};
    conceptos.forEach(c => {
      initialInputs[c.id] = 0;
    });

    setAvancesInputs(initialInputs);
    setNumEstimacion(estimaciones.length + 1);
    setPeriodoInicio('');
    setPeriodoFin('');
    setDescripcion('');
    setEsFiniquito(false);
    setSoporteFotos([]);
    setViewState('create');
  };

  const handleVolumeChange = (conceptoId: string, valueStr: string) => {
    const value = valueStr === '' ? 0 : Number(valueStr);
    setAvancesInputs(prev => ({
      ...prev,
      [conceptoId]: value
    }));
  };

  const handleAddDemoPhoto = () => {
    // Generate dummy SVG photo log base64
    const photoNumber = soporteFotos.length + 1;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="100%" height="100%" fill="%231e293b"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%230284c7">Soporte Fotográfico #${photoNumber}</text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%2394a3b8">Periodo: ${periodoInicio || 'N/D'} a ${periodoFin || 'N/D'}</text>
    </svg>`;
    const base64 = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setSoporteFotos(prev => [...prev, base64]);
  };

  // Compute estimation values on the fly
  const calculateOnTheFlyValues = () => {
    let bruto = 0;
    const advancesList: EstimacionConceptoAvance[] = conceptos.map(c => {
      const volAnterior = getVolumenAnteriorAcumulado(c.id, Number(numEstimacion) || 1);
      const volActual = avancesInputs[c.id] || 0;
      const volAcumulado = volAnterior + volActual;
      const saldoVol = c.cantidadPresupuestada - volAcumulado;
      const impActual = volActual * c.precioUnitario;

      bruto += impActual;

      return {
        conceptoId: c.id,
        volumenAnterior: volAnterior,
        volumenActual: volActual,
        volumenAcumulado: volAcumulado,
        saldoVolumen: saldoVol,
        importeActual: impActual
      };
    });

    const amortizacion = bruto * (proyecto.anticipoPorcentaje / 100);
    const retencion = bruto * (proyecto.retencionPorcentaje / 100);
    const subtotal = bruto - amortizacion - retencion;
    const iva = subtotal * (proyecto.ivaPorcentaje / 100);
    const liquido = subtotal + iva;

    return { bruto, amortizacion, retencion, subtotal, iva, liquido, advancesList };
  };

  const handleSaveEstimacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodoInicio || !periodoFin) {
      alert('Por favor introduce las fechas del período.');
      return;
    }

    const { bruto, amortizacion, retencion, subtotal, iva, liquido, advancesList } = calculateOnTheFlyValues();

    if (bruto === 0) {
      alert('Debes capturar avances mayores a 0 en al menos un concepto.');
      return;
    }

    const newEst: Estimacion = {
      id: 'est-' + Date.now(),
      proyectoId: proyecto.id,
      numeroEstimacion: Number(numEstimacion) || 1,
      periodoInicio,
      periodoFin,
      avances: advancesList,
      montoBruto: Number(bruto.toFixed(2)),
      amortizacionAnticipo: Number(amortizacion.toFixed(2)),
      retencionGarantia: Number(retencion.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      liquidoAPagar: Number(liquido.toFixed(2)),
      estado: rol === 'Administrador' ? 'Aprobada' : 'Borrador', // Resident creates draft, Admin approves
      fechaRegistro: new Date().toISOString(),
      soporteFotografico: soporteFotos,
      descripcion: descripcion.trim() || undefined,
      esFiniquito: esFiniquito
    };

    setSaving(true);
    try {
      await dbAdapter.saveEstimacion(newEst);
      setViewState('list');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (est: Estimacion, newStatus: 'Aprobada' | 'Rechazada') => {
    const updated: Estimacion = {
      ...est,
      estado: newStatus
    };
    try {
      await dbAdapter.saveEstimacion(updated);
      setSelectedEstimacion(updated);

      // Auto-trigger project closure and finiquito record if this is a finiquito estimation and it gets approved!
      if (newStatus === 'Aprobada' && est.esFiniquito) {
        // Close project state
        const updatedProj = { ...proyecto, estado: 'Finiquitado' as const };
        await dbAdapter.saveProyecto(updatedProj);

        // Gather approved estimations (including this newly approved one)
        const updatedEstimaciones = estimaciones.map(e => e.id === est.id ? updated : e);
        const approvedEsts = updatedEstimaciones.filter(e => e.estado === 'Aprobada');

        const totalContratado = conceptos.reduce((sum, c) => sum + c.cantidadPresupuestada * c.precioUnitario, 0);
        const totalEjecutadoReal = approvedEsts.reduce((sum, e) => sum + e.montoBruto, 0);
        const totalAmortizadoTotal = approvedEsts.reduce((sum, e) => sum + e.amortizacionAnticipo, 0);
        const totalRetenidoTotal = approvedEsts.reduce((sum, e) => sum + e.retencionGarantia, 0);
        const montoDevueltoRetenciones = totalRetenidoTotal;
        const saldoFinalLiquido = totalEjecutadoReal - totalAmortizadoTotal - totalRetenidoTotal + montoDevueltoRetenciones;

        const newFiniquito: Finiquito = {
          id: 'fin-' + Date.now(),
          proyectoId: proyecto.id,
          montoOriginal: totalContratado,
          montoEjecutadoReal: totalEjecutadoReal,
          montoAmortizadoTotal: totalAmortizadoTotal,
          montoRetenidoTotal: totalRetenidoTotal,
          montoDevueltoRetenciones,
          saldoFinalLiquido,
          estado: 'Firmado',
          fechaFirma: new Date().toISOString().split('T')[0],
          firmanteResidente,
          firmanteContratista,
          firmanteAuditor
        };

        await dbAdapter.saveFiniquito(newFiniquito);
        setFiniquito(newFiniquito);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate Finiquito de Obra
  const handleGenerateFiniquito = async () => {
    const totalContratado = proyecto.montoContratado;
    const totalEjecutadoReal = estimaciones
      .filter(e => e.estado === 'Aprobada')
      .reduce((sum, e) => sum + e.montoBruto, 0);

    const totalAmortizadoTotal = estimaciones
      .filter(e => e.estado === 'Aprobada')
      .reduce((sum, e) => sum + e.amortizacionAnticipo, 0);

    const totalRetenidoTotal = estimaciones
      .filter(e => e.estado === 'Aprobada')
      .reduce((sum, e) => sum + e.retencionGarantia, 0);

    // Devolución de retenciones (Fondo de garantía): 
    // In Mexico, the full retention is returned at final closure if there are no construction defects.
    const montoDevueltoRetenciones = totalRetenidoTotal;

    // Balance
    const saldoFinalLiquido = totalEjecutadoReal - totalAmortizadoTotal - totalRetenidoTotal + montoDevueltoRetenciones;

    const newFiniquito: Finiquito = {
      id: 'fin-' + Date.now(),
      proyectoId: proyecto.id,
      montoOriginal: totalContratado,
      montoEjecutadoReal: totalEjecutadoReal,
      montoAmortizadoTotal: totalAmortizadoTotal,
      montoRetenidoTotal: totalRetenidoTotal,
      montoDevueltoRetenciones,
      saldoFinalLiquido,
      estado: 'Firmado',
      fechaFirma: new Date().toISOString().split('T')[0],
      firmanteResidente,
      firmanteContratista,
      firmanteAuditor
    };

    try {
      await dbAdapter.saveFiniquito(newFiniquito);
      setFiniquito(newFiniquito);
      setViewState('list');
    } catch (err) {
      console.error(err);
    }
  };

  // individual estimation PDF generation
  const handleExportPDF = (est: Estimacion) => {
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; // #0F172A (Navy Slate)

    // Document Title
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ESTIMACIÓN DE OBRA", 15, 22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`ESTIMACIÓN N° ${est.numeroEstimacion} — ESTADO: ${est.estado.toUpperCase()}`, 15, 28);

    // Project metadata block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PROYECTO:", 15, 48);
    doc.setFont("helvetica", "normal");
    doc.text(proyecto.nombre, 45, 48);

    doc.setFont("helvetica", "bold");
    doc.text("CONTRATISTA:", 15, 54);
    doc.setFont("helvetica", "normal");
    doc.text(proyecto.contratista, 45, 54);

    doc.setFont("helvetica", "bold");
    doc.text("PERÍODO:", 15, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`${est.periodoInicio} al ${est.periodoFin}`, 45, 60);

    // Table of concepts advances
    const tableRows = est.avances.map(av => {
      const conc = conceptos.find(c => c.id === av.conceptoId);
      return [
        conc?.codigo || '',
        conc?.descripcion || '',
        conc?.unidad || '',
        conc?.precioUnitario ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(conc.precioUnitario) : '',
        av.volumenAnterior.toFixed(2),
        av.volumenActual.toFixed(2),
        av.volumenAcumulado.toFixed(2),
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(av.importeActual)
      ];
    });

    (doc as any).autoTable({
      startY: 68,
      head: [['Cód.', 'Descripción del Concepto', 'Unid.', 'Precio ($)', 'Vol. Ant.', 'Vol. Act.', 'Vol. Acum.', 'Importe ($)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        1: { cellWidth: 50 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Financial balance calculations table
    const summaryRows = [
      ['MONTO BRUTO ESTIMADO:', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.montoBruto)],
      [`AMORTIZACIÓN DE ANTICIPO (${proyecto.anticipoPorcentaje}%):`, `-${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.amortizacionAnticipo)}`],
      [`RETENCIÓN DE GARANTÍA (${proyecto.retencionPorcentaje}%):`, `-${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.retencionGarantia)}`],
      ['SUBTOTAL:', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.subtotal)],
      [`I.V.A. (${proyecto.ivaPorcentaje}%):`, new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.iva)],
      ['LÍQUIDO NETO A PAGAR:', new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(est.liquidoAPagar)]
    ];

    (doc as any).autoTable({
      startY: finalY,
      body: summaryRows,
      theme: 'plain',
      bodyStyles: { fontSize: 8, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120, halign: 'right' },
        1: { halign: 'right' }
      }
    });

    // Signature boxes
    const sigY = (doc as any).lastAutoTable.finalY + 25;
    doc.line(15, sigY, 70, sigY);
    doc.text("RESIDENTE DE OBRA", 25, sigY + 5);

    doc.line(130, sigY, 185, sigY);
    doc.text("REPRESENTANTE LEGAL", 140, sigY + 5);

    doc.save(`Estimacion_${est.numeroEstimacion}_${proyecto.codigo}.pdf`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">MÓDULO 5: Control de Estimaciones, Generadores y Finiquito</h2>
          <p className="text-xs text-slate-gray-600 mt-1">
            Registro de volúmenes ejecutados, cálculo automático de retenciones, amortizaciones e IVA, y acta de finiquito contractual.
          </p>
        </div>
        <div className="flex gap-2">
          {viewState === 'list' && !finiquito && (
            <>
              {rol !== 'Auditor' && (
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-medium text-xs shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  Crear Estimación
                </button>
              )}
              {rol === 'Administrador' && (
                <button
                  onClick={() => setViewState('finiquito')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-navy-slate-900 hover:bg-navy-slate-800 text-white rounded font-medium text-xs shadow-sm transition-colors"
                >
                  Generar Finiquito
                </button>
              )}
            </>
          )}
          {viewState !== 'list' && (
            <button
              onClick={() => {
                setViewState('list');
                setSelectedEstimacion(null);
              }}
              className="px-3.5 py-2 border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold text-xs transition-colors"
            >
              Volver al Listado
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-60 bg-white border border-light-slate rounded-xl shadow-sm flex items-center justify-center text-slate-400 text-sm">
          Cargando datos de estimación...
        </div>
      ) : viewState === 'list' ? (
        /* View 1: Estimaciones List */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white p-5 rounded-xl border border-light-slate shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-navy-slate-900 border-b border-light-slate pb-2">
              Historial de Estimaciones Registradas
            </h3>

            {estimaciones.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">N° Est.</th>
                      <th className="py-2.5 px-3">Fechas Período</th>
                      <th className="py-2.5 px-3 text-right">Monto Bruto</th>
                      <th className="py-2.5 px-3 text-right text-emerald-green">Líquido Neto</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-slate font-mono">
                    {estimaciones.map(est => (
                      <tr key={est.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-navy-slate-900">
                          #{est.numeroEstimacion}
                          {est.descripcion && (
                            <span className="block text-[9px] font-sans font-normal text-slate-400 mt-0.5">
                              {est.descripcion}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-600">{est.periodoInicio} al {est.periodoFin}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(est.montoBruto)}</td>
                        <td className="py-3 px-3 text-right text-emerald-green font-bold">{formatCurrency(est.liquidoAPagar)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${est.estado === 'Aprobada'
                              ? 'bg-emerald-green/10 text-emerald-green'
                              : est.estado === 'Enviada'
                                ? 'bg-blue-100 text-blue-700'
                                : est.estado === 'Borrador'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                            {est.estado}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            {rol === 'Administrador' && est.estado === 'Borrador' && (
                              <button
                                onClick={() => handleUpdateStatus(est, 'Aprobada')}
                                className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                                title="Aprobar Estimación directamente"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedEstimacion(est);
                                setViewState('detail');
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                              title="Ver detalles"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleExportPDF(est)}
                              className="p-1 hover:bg-slate-100 rounded text-ocean-blue transition-colors"
                              title="Descargar PDF"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                No hay estimaciones generadas.
              </div>
            )}
          </div>

          {/* Right Card: Finiquito Status */}
          <div className="xl:col-span-1 bg-white p-5 rounded-xl border border-light-slate shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-slate-900 border-b border-light-slate pb-2">
                Finiquito de Obra
              </h3>
              {finiquito ? (
                <div className="space-y-4 mt-4 text-xs leading-relaxed font-sans">
                  <div className="p-3 bg-emerald-green/5 border border-emerald-green/20 rounded-lg flex items-center gap-2 text-emerald-700">
                    <ShieldCheck size={18} />
                    <span className="font-bold">Proyecto Finiquitado y Cerrado</span>
                  </div>
                  <div className="space-y-2.5 font-mono">
                    <div className="flex justify-between border-b border-light-slate pb-1">
                      <span className="text-slate-500">Monto Contratado:</span>
                      <span className="text-navy-slate-900 font-bold">{formatCurrency(finiquito.montoOriginal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-light-slate pb-1">
                      <span className="text-slate-500">Monto Ejecutado Real:</span>
                      <span className="text-emerald-green font-bold">{formatCurrency(finiquito.montoEjecutadoReal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-light-slate pb-1">
                      <span className="text-slate-500">Anticipo Amortizado:</span>
                      <span className="text-slate-700">-{formatCurrency(finiquito.montoAmortizadoTotal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-light-slate pb-1">
                      <span className="text-slate-500">Devolución Garantía:</span>
                      <span className="text-emerald-600">+{formatCurrency(finiquito.montoDevueltoRetenciones)}</span>
                    </div>
                    <div className="flex justify-between text-navy-slate-950 font-bold text-sm bg-slate-50 p-1">
                      <span>Saldo Final Neto:</span>
                      <span>{formatCurrency(finiquito.saldoFinalLiquido)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-1">
                    <p>Firmas estampadas electrónicamente:</p>
                    <p>• {finiquito.firmanteResidente}</p>
                    <p>• {finiquito.firmanteContratista}</p>
                    <p>• {finiquito.firmanteAuditor}</p>
                    <p className="font-bold text-[9px] mt-1 text-slate-500">FECHA: {finiquito.fechaFirma}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mt-4 text-xs text-slate-gray-600">
                  <p>
                    El finiquito consolida el balance de cuentas al concluir el plazo de obra, comparando el monto presupuestado original vs. el monto real aprobado en las estimaciones.
                  </p>
                  <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                    <span>
                      {rol === 'Administrador' ? (
                        <strong>Como Administrador de la obra, tienes los permisos necesarios para declarar el finiquito y conciliar el cierre del contrato.</strong>
                      ) : (
                        <span>El proyecto permanece en ejecución. El administrador podrá declarar el finiquito del contrato cuando las estimaciones hayan cubierto el 100% de la obra física.</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {rol === 'Administrador' && !finiquito && (
              <button
                onClick={() => setViewState('finiquito')}
                className="w-full mt-4 bg-navy-slate-900 hover:bg-navy-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded transition-colors text-center shadow-sm"
              >
                Ingresar a Acta de Finiquito
              </button>
            )}
          </div>
        </div>
      ) : viewState === 'create' ? (
        /* View 2: Create Estimation */
        <form onSubmit={handleSaveEstimacion} className="bg-white p-6 rounded-xl border border-light-slate shadow-sm space-y-6 animate-slide-in">
          <h3 className="text-sm font-bold text-navy-slate-900 border-b border-light-slate pb-2">
            Registro de Avance Física y Croquis de Generadores (Estimación #{estimaciones.length + 1})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Identificador / Notas (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Extraordinaria 1, Bis, etc."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-white text-navy-slate-950 font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Número de Estimación</label>
              <input
                type="number"
                min="1"
                required
                value={numEstimacion}
                onChange={(e) => setNumEstimacion(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-white font-bold text-navy-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Inicio del Periodo</label>
              <input
                type="date"
                required
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Fin del Periodo</label>
              <input
                type="date"
                required
                value={periodoFin}
                onChange={(e) => setPeriodoFin(e.target.value)}
                className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
              />
            </div>

          </div>

          {/* Table to enter volumes */}
          <div className="border border-light-slate rounded overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-navy-slate-900 border-b border-light-slate uppercase tracking-wider">
              Captura de Generadores (Cantidades Ejecutadas)
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-light-slate bg-slate-100/50 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3 w-20">Código</th>
                  <th className="py-2 px-3">Descripción</th>
                  <th className="py-2 px-3 text-right w-24">Cant. Pres.</th>
                  <th className="py-2 px-3 text-right w-24">Vol. Anterior</th>
                  <th className="py-2 px-3 text-center w-24 bg-emerald-green/5 text-emerald-green">Vol. Periodo</th>
                  <th className="py-2 px-3 text-right w-24">Vol. Acum.</th>
                  <th className="py-2 px-3 text-right w-24 text-ocean-blue">Saldo Vol.</th>
                  <th className="py-2 px-3 text-right w-24">Importe ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate font-mono">
                {conceptos.map(c => {
                  const volAnterior = getVolumenAnteriorAcumulado(c.id, Number(numEstimacion) || 1);
                  const currentVol = avancesInputs[c.id] || 0;
                  const volAcumulado = volAnterior + currentVol;
                  const saldoVol = c.cantidadPresupuestada - volAcumulado;
                  const currentImport = currentVol * c.precioUnitario;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-navy-slate-800">{c.codigo}</td>
                      <td className="py-2 px-3 font-sans text-slate-700 max-w-xs truncate text-left" title={c.descripcion}>
                        {c.descripcion}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">{c.cantidadPresupuestada.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{volAnterior.toFixed(2)}</td>
                      <td className="py-2 px-3 bg-emerald-green/5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Number((c.cantidadPresupuestada - volAnterior).toFixed(2))} // Prevent over-estimation of quantities
                          value={avancesInputs[c.id] === 0 ? '' : avancesInputs[c.id]}
                          onChange={(e) => handleVolumeChange(c.id, e.target.value)}
                          className="w-full text-right text-xs border border-light-slate rounded px-1.5 py-0.5 bg-white font-mono text-emerald-700 font-bold"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-700">{volAcumulado.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right font-bold ${saldoVol < 0.01 ? 'text-slate-300' : 'text-ocean-blue'}`}>
                        {saldoVol.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-navy-slate-900">{formatCurrency(currentImport)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Photo Log Upload */}
          <div className="border border-light-slate rounded-lg p-5">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-navy-slate-900 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon size={14} className="text-ocean-blue" />
                Soporte Fotográfico de Bitácora
              </h4>
              <button
                type="button"
                onClick={handleAddDemoPhoto}
                className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 border border-light-slate text-slate-700 font-bold rounded"
              >
                + Simular Foto de Obra
              </button>
            </div>

            {soporteFotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                {soporteFotos.map((src, idx) => (
                  <div key={idx} className="relative border border-light-slate rounded-lg overflow-hidden group shadow-sm bg-slate-100">
                    <img src={src} alt={`Bitacora ${idx}`} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setSoporteFotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-light-slate rounded-lg">
                No has cargado imágenes de soporte para esta estimación.
              </div>
            )}
          </div>

          {/* Toggle Es Finiquito */}
          <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
            <input
              type="checkbox"
              id="esFiniquito"
              checked={esFiniquito}
              onChange={(e) => setEsFiniquito(e.target.checked)}
              className="w-4 h-4 text-ocean-blue focus:ring-ocean-blue border-light-slate rounded cursor-pointer"
            />
            <div>
              <label htmlFor="esFiniquito" className="font-bold cursor-pointer select-none">
                ¿Esta estimación representa el Finiquito final y Cierre contractual de la obra?
              </label>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Al ser aprobada por la supervisión/administrador, se congelará el catálogo para evitar cobros futuros y se generará el balance final.
              </p>
            </div>
          </div>

          {/* Live Calculations Panel */}
          {(() => {
            const { bruto, amortizacion, retencion, subtotal, iva, liquido } = calculateOnTheFlyValues();
            return (
              <div className="bg-navy-slate-900 text-white p-5 rounded-xl border border-slate-gray-800 flex flex-col sm:flex-row justify-between gap-4 font-mono text-xs">
                <div className="space-y-1.5 flex-1">
                  <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desglose del Cobro de Estimación</p>
                  <div className="grid grid-cols-2 gap-x-8 max-w-sm">
                    <span className="text-slate-300">Monto Estimado Bruto:</span>
                    <span className="font-bold text-right">{formatCurrency(bruto)}</span>
                    
                    <span className="text-red-400">Amortización Anticipo ({proyecto.anticipoPorcentaje}%):</span>
                    <span className="text-red-400 text-right">-{formatCurrency(amortizacion)}</span>
                    
                    <span className="text-amber-400">Retención Garantía ({proyecto.retencionPorcentaje}%):</span>
                    <span className="text-amber-400 text-right">-{formatCurrency(retencion)}</span>
                    
                    <span className="text-slate-400 border-t border-slate-700 mt-1 pt-1">Subtotal (Neto):</span>
                    <span className="text-slate-200 text-right border-t border-slate-700 mt-1 pt-1 font-bold">{formatCurrency(subtotal)}</span>
                    
                    <span className="text-slate-400">IVA (+{proyecto.ivaPorcentaje}%):</span>
                    <span className="text-slate-200 text-right font-bold">+{formatCurrency(iva)}</span>
                  </div>
                </div>
                <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 shrink-0 flex flex-col justify-center">
                  <p className="text-[10px] font-sans text-slate-400 uppercase tracking-wider">Líquido a Pagar Final</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-1">{formatCurrency(liquido)}</p>
                </div>
              </div>
            );
          })()}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-light-slate pt-4">
            <button
              type="button"
              onClick={() => setViewState('list')}
              className="px-4 py-1.5 text-xs border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-1.5 text-xs bg-emerald-green hover:bg-emerald-green/90 text-white rounded font-semibold transition-colors shadow-sm"
            >
              {saving ? 'Guardando...' : 'Registrar Estimación'}
            </button>
          </div>
        </form>
      ) : viewState === 'detail' && selectedEstimacion ? (
        /* View 3: Estimation Detail */
        <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm space-y-6 animate-slide-in">
          <div className="flex justify-between items-start border-b border-light-slate pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Detalles de la Estimación</span>
              <h3 className="text-md font-bold text-navy-slate-900 mt-1 flex items-center gap-2">
                <span>Estimación #{selectedEstimacion.numeroEstimacion}</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${selectedEstimacion.estado === 'Aprobada'
                    ? 'bg-emerald-green/10 text-emerald-green'
                    : selectedEstimacion.estado === 'Enviada'
                      ? 'bg-blue-100 text-blue-700'
                      : selectedEstimacion.estado === 'Borrador'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-red-100 text-red-700'
                  }`}>
                  {selectedEstimacion.estado}
                </span>
              </h3>
              <p className="text-xs text-slate-gray-500 font-sans mt-0.5">
                Período: {selectedEstimacion.periodoInicio} al {selectedEstimacion.periodoFin}
              </p>
              {selectedEstimacion.descripcion && (
                <p className="text-xs text-navy-slate-800 font-semibold font-sans mt-1">
                  Identificador / Notas: <span className="font-normal text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{selectedEstimacion.descripcion}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportPDF(selectedEstimacion)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-light-slate text-slate-700 font-bold rounded text-xs transition-colors"
              >
                <Download size={14} /> PDF
              </button>
              {rol === 'Administrador' && selectedEstimacion.estado === 'Enviada' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedEstimacion, 'Aprobada')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-green hover:bg-emerald-green/90 text-white font-bold rounded text-xs transition-colors"
                  >
                    <CheckCircle size={14} /> Aprobar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedEstimacion, 'Rechazada')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors"
                  >
                    <XCircle size={14} /> Rechazar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table of items in estimate */}
          <div className="border border-light-slate rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3 text-right">Vol. Anterior</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-green/5 text-emerald-green font-bold">Vol. Período</th>
                  <th className="py-2.5 px-3 text-right">Vol. Acumulado</th>
                  <th className="py-2.5 px-3 text-right font-bold bg-navy-slate-800/5 text-navy-slate-900">Importe ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate font-mono">
                {selectedEstimacion.avances.map(av => {
                  const conc = conceptos.find(c => c.id === av.conceptoId);
                  return (
                    <tr key={av.conceptoId}>
                      <td className="py-2.5 px-3 font-bold text-navy-slate-800">{conc?.codigo}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 max-w-xs truncate text-left">{conc?.descripcion}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{av.volumenAnterior.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right bg-emerald-green/5 text-emerald-green font-bold">{av.volumenActual.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{av.volumenAcumulado.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold bg-navy-slate-800/5 text-navy-slate-900">{formatCurrency(av.importeActual)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Photo Log */}
          {selectedEstimacion.soporteFotografico.length > 0 && (
            <div className="border border-light-slate rounded-lg p-5">
              <h4 className="text-xs font-bold text-navy-slate-900 uppercase tracking-wider mb-3">Soporte Fotográfico de Generadores</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectedEstimacion.soporteFotografico.map((src, idx) => (
                  <div key={idx} className="border border-light-slate rounded-lg overflow-hidden bg-slate-100">
                    <img src={src} alt={`Bitacora ${idx}`} className="w-full h-24 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial summary calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-slate-50 p-4 border border-light-slate rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>MONTO BRUTO ESTIMADO:</span>
                <span className="font-bold">{formatCurrency(selectedEstimacion.montoBruto)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>AMORTIZACIÓN DE ANTICIPO ({proyecto.anticipoPorcentaje}%):</span>
                <span>-{formatCurrency(selectedEstimacion.amortizacionAnticipo)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>RETENCIÓN DE GARANTÍA ({proyecto.retencionPorcentaje}%):</span>
                <span>-{formatCurrency(selectedEstimacion.retencionGarantia)}</span>
              </div>
              <div className="flex justify-between border-t border-light-slate pt-2 font-bold text-navy-slate-950">
                <span>SUBTOTAL (NETO):</span>
                <span>{formatCurrency(selectedEstimacion.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IVA (+{proyecto.ivaPorcentaje}%):</span>
                <span>+{formatCurrency(selectedEstimacion.iva)}</span>
              </div>
            </div>

            <div className="bg-navy-slate-900 text-white p-5 rounded-xl border border-slate-gray-800 flex flex-col justify-center text-right">
              <span className="text-[10px] text-slate-400 font-sans block uppercase tracking-wider">Líquido Neto Autorizado</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1">{formatCurrency(selectedEstimacion.liquidoAPagar)}</span>
            </div>
          </div>
        </div>
      ) : (
        /* View 4: Finiquito Form */
        <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm space-y-6 animate-slide-in">
          <div className="border-b border-light-slate pb-3">
            <h3 className="text-sm font-bold text-navy-slate-900">Acta de Cierre y Finiquito Económico</h3>
            <p className="text-xs text-slate-400 mt-0.5">Conciliación final entre el contrato de obra y los volúmenes reales aprobados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="p-4 bg-slate-50 border border-light-slate rounded">
              <span className="text-[10px] font-sans text-slate-400 block">MONTO CONTRATADO ORIGINAL</span>
              <span className="text-lg font-bold text-navy-slate-950">{formatCurrency(proyecto.montoContratado)}</span>
            </div>
            <div className="p-4 bg-emerald-green/5 border border-emerald-green/20 rounded text-emerald-800">
              <span className="text-[10px] font-sans text-emerald-600/70 block">MONTO EJECUTADO REAL TOTAL</span>
              <span className="text-lg font-bold">{formatCurrency(estimaciones.filter(e => e.estado === 'Aprobada').reduce((sum, e) => sum + e.montoBruto, 0))}</span>
            </div>
            <div className="p-4 bg-navy-slate-900 border border-slate-800 rounded text-white text-right">
              <span className="text-[10px] font-sans text-slate-400 block">SALDO LIQUIDADOR EN FINIQUITO</span>
              <span className="text-lg font-bold text-ocean-blue">
                {formatCurrency(
                  estimaciones.filter(e => e.estado === 'Aprobada').reduce((sum, e) => sum + e.montoBruto, 0)
                )}
              </span>
            </div>
          </div>

          {/* Firmantes Settings */}
          <div className="space-y-4 border border-light-slate rounded-lg p-5">
            <h4 className="text-xs font-bold text-navy-slate-900 uppercase tracking-wider mb-2">Protocolo de Firmas</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Representante del Contratista</label>
                <input
                  type="text"
                  value={firmanteContratista}
                  onChange={(e) => setFirmanteContratista(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Residente de Obra</label>
                <input
                  type="text"
                  value={firmanteResidente}
                  onChange={(e) => setFirmanteResidente(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Auditor Interno/Externo</label>
                <input
                  type="text"
                  value={firmanteAuditor}
                  onChange={(e) => setFirmanteAuditor(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-light-slate pt-4">
            <button
              onClick={() => setViewState('list')}
              className="px-4 py-1.5 text-xs border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerateFiniquito}
              className="px-5 py-1.5 text-xs bg-navy-slate-900 hover:bg-navy-slate-800 text-white rounded font-bold shadow transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={14} />
              Cerrar Proyecto y Firmar Finiquito
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
