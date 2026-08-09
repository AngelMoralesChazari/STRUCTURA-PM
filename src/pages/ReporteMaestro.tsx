import React, { useState, useEffect } from 'react';
import type { Proyecto, Estimacion, ConceptoObra, Finiquito } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { FileText, Download, ShieldCheck, Sparkles, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReporteMaestroProps {
  proyecto: Proyecto;
}

export const ReporteMaestro: React.FC<ReporteMaestroProps> = ({ proyecto }) => {
  const [estimaciones, setEstimaciones] = useState<Estimacion[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoObra[]>([]);
  const [finiquito, setFiniquito] = useState<Finiquito | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [firmanteResidente] = useState('Ing. Sofía Morales');
  const [firmanteContratista] = useState('Ing. Carlos Mendoza');
  const [firmanteAuditor] = useState('Mtro. Fernando Ortiz');

  useEffect(() => {
    setLoading(true);
    const unsubscribeConcepts = dbAdapter.subscribeConceptos(proyecto.id, (data) => {
      setConceptos(data);
    });

    const unsubscribeEst = dbAdapter.subscribeEstimaciones(proyecto.id, (data) => {
      setEstimaciones(data);
      setLoading(false);
    });

    const fetchFin = async () => {
      const data = await dbAdapter.getFiniquito(proyecto.id);
      setFiniquito(data);
    };
    fetchFin();

    return () => {
      unsubscribeConcepts();
      unsubscribeEst();
    };
  }, [proyecto.id]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const handleDownloadMasterPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const navyColor = [15, 23, 42]; // #0F172A
      
      // ==========================================
      // PAGE 1: COVER SHEET (CARÁTULA INSTITUCIONAL)
      // ==========================================
      
      // Top Navy Border
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 45, 'F');
      
      // Top Cover Accent
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 45, 210, 3, 'F');

      // Title & Subtitle on Cover
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("STRUCTURA-PM", 20, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("CONSTRUCTION COST & PROJECT MANAGEMENT SYSTEM", 20, 32);

      // Large Project Name
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("REPORTE GENERAL MAESTRO", 20, 75);
      
      // Project Details Card on Cover
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("OBRA / INFRAESTRUCTURA:", 20, 95);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      
      // Wrap long project names
      const splitProjName = doc.splitTextToSize(proyecto.nombre, 170);
      doc.text(splitProjName, 20, 101);

      const offsetProjNameY = splitProjName.length * 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("CÓDIGO DE CONTRATO:", 20, 105 + offsetProjNameY);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(proyecto.codigo, 20, 111 + offsetProjNameY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("EMPRESA CONTRATISTA:", 20, 120 + offsetProjNameY);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(proyecto.contratista, 20, 126 + offsetProjNameY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("UBICACIÓN DE LA OBRA:", 20, 135 + offsetProjNameY);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(proyecto.ubicacion, 20, 141 + offsetProjNameY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("PERÍODO CONTRACTUAL:", 20, 150 + offsetProjNameY);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`DEL ${proyecto.fechaInicio} AL ${proyecto.fechaFin}`, 20, 156 + offsetProjNameY);

      // Status Badge
      doc.setFillColor(241, 245, 249);
      doc.rect(20, 170 + offsetProjNameY, 170, 20, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, 170 + offsetProjNameY, 170, 20, 'S');
      
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("ESTADO ACTUAL DE LA OBRA:", 25, 178 + offsetProjNameY);
      doc.setTextColor(21, 128, 61);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(proyecto.estado.toUpperCase(), 25, 185 + offsetProjNameY);

      // Bottom Footer Decorator
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 265, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Generado el: ${new Date().toLocaleString()} | STRUCTURA-PM`, 20, 274);

      // ==========================================
      // PAGE 2: RESUMEN FINANCIERO EJECUTIVO
      // ==========================================
      doc.addPage();
      
      // Page header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("STRUCTURA-PM | RESUMEN FINANCIERO EJECUTIVO", 15, 10);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("1. Resumen Ejecutivo de Cuentas", 15, 28);
      
      const approvedEst = estimaciones.filter(e => e.estado === 'Aprobada');
      const totalEjercido = approvedEst.reduce((sum, e) => sum + e.montoBruto, 0);
      const totalAnticipo = proyecto.montoContratado * (proyecto.anticipoPorcentaje / 100);
      const amortizado = proyecto.amortizadoAcumulado;
      const saldoAnticipo = totalAnticipo - amortizado;
      const saldoEjercer = proyecto.montoContratado - totalEjercido;

      const summaryTable = [
        ["Monto Original Contratado", formatCurrency(proyecto.montoContratado)],
        [`Anticipo Otorgado (${proyecto.anticipoPorcentaje}%)`, formatCurrency(totalAnticipo)],
        ["Estimaciones Aprobadas Cobradas (Bruto)", formatCurrency(totalEjercido)],
        ["Anticipo Amortizado a la Fecha", `-${formatCurrency(amortizado)}`],
        ["Saldo por Amortizar", formatCurrency(saldoAnticipo)],
        ["Monto de Garantía Retenido (5%)", `-${formatCurrency(approvedEst.reduce((sum, e) => sum + e.retencionGarantia, 0))}`],
        ["Saldo Contratado por Ejercer", formatCurrency(saldoEjercer)]
      ];

      (doc as any).autoTable({
        startY: 34,
        body: summaryTable,
        theme: 'striped',
        bodyStyles: { fontSize: 9.5, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { halign: 'right', textColor: navyColor }
        }
      });

      // Planned vs. Real S-Curve periods table
      const finalY1 = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.text("2. Programado vs. Avance Real Mensual (Curva S)", 15, finalY1);

      // Re-calculate monthly totals for S-curve table
      const periodsSet = new Set<string>();
      conceptos.forEach(c => {
        if (c.programacion) Object.keys(c.programacion).forEach(p => periodsSet.add(p));
      });
      approvedEst.forEach(e => {
        periodsSet.add(e.periodoFin.substring(0, 7));
      });
      const sortedPeriods = Array.from(periodsSet).sort();

      let plannedAcc = 0;
      let actualAcc = 0;
      const curveTableRows = sortedPeriods.map(period => {
        let periodPlanned = 0;
        conceptos.forEach(c => {
          if (c.programacion && c.programacion[period]) {
            periodPlanned += c.programacion[period] * c.precioUnitario;
          }
        });

        let periodActual = 0;
        approvedEst.forEach(e => {
          if (e.periodoFin.startsWith(period)) {
            periodActual += e.montoBruto;
          }
        });

        plannedAcc += periodPlanned;
        actualAcc += periodActual;

        return [
          period,
          formatCurrency(periodPlanned),
          formatCurrency(plannedAcc),
          formatCurrency(periodActual),
          formatCurrency(actualAcc),
          plannedAcc > 0 ? `${((actualAcc / plannedAcc) * 100).toFixed(1)}%` : '0%'
        ];
      });

      (doc as any).autoTable({
        startY: finalY1 + 6,
        head: [['Mes', 'Programado ($)', 'Prog. Acum. ($)', 'Real ($)', 'Real Acum. ($)', '% Eficiencia']],
        body: curveTableRows,
        theme: 'grid',
        headStyles: { fillColor: navyColor, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' }
        }
      });

      // ==========================================
      // PAGE 3: CUADRO CONSOLIDADO PRESUPUESTO
      // ==========================================
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("STRUCTURA-PM | CUADRO CONSOLIDADO DE PRESUPUESTO", 15, 10);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("3. Presupuesto Base por Partidas", 15, 28);

      const tableRows = conceptos.map(c => [
        c.partida,
        c.codigo,
        c.descripcion,
        c.unidad,
        c.cantidadPresupuestada.toFixed(2),
        formatCurrency(c.precioUnitario),
        formatCurrency(c.importe)
      ]);

      (doc as any).autoTable({
        startY: 34,
        head: [['Partida', 'Cód.', 'Descripción de Concepto', 'Unid.', 'Cant.', 'Precio ($)', 'Importe ($)']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: navyColor, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 30 },
          2: { cellWidth: 65 },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });

      // ==========================================
      // PAGE 4: ESTADO DE ESTIMACIONES Y ACTA FINIQUITO
      // ==========================================
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("STRUCTURA-PM | ACTA DE ENTREGA Y FINIQUITO", 15, 10);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("4. Relación de Estimaciones Tramitadas", 15, 28);

      const estRows = estimaciones.map(e => [
        `#${e.numeroEstimacion}`,
        `${e.periodoInicio} al ${e.periodoFin}`,
        formatCurrency(e.montoBruto),
        `-${formatCurrency(e.amortizacionAnticipo)}`,
        `-${formatCurrency(e.retencionGarantia)}`,
        formatCurrency(e.liquidoAPagar),
        e.estado
      ]);

      (doc as any).autoTable({
        startY: 34,
        head: [['N°', 'Período', 'Monto Bruto ($)', 'Amortizado ($)', 'Retenido ($)', 'Líquido ($)', 'Estado']],
        body: estRows,
        theme: 'grid',
        headStyles: { fillColor: navyColor, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' }
        }
      });

      const finalY4 = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.text("5. Acta de Cierre y Finiquito", 15, finalY4);
      
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      
      const finiquitoText = `Reunidos los firmantes al calce, se declara que los trabajos del contrato ${proyecto.codigo} se encuentran terminados y ejecutados conforme a las especificaciones pactadas. Las partes hacen constar que el balance final resulta en un saldo liquidador por la cantidad de ${finiquito ? formatCurrency(finiquito.saldoFinalLiquido) : formatCurrency(totalEjercido)} pesos, dándose por liquidados de común acuerdo y sin más reclamaciones que formular.`;
      
      const splitText = doc.splitTextToSize(finiquitoText, 180);
      doc.text(splitText, 15, finalY4 + 6);

      // Signatures
      const sigY = finalY4 + 38;
      
      doc.setDrawColor(148, 163, 184);
      doc.line(15, sigY, 70, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(finiquito?.firmanteContratista || firmanteContratista, 15, sigY + 4);
      doc.setFont("helvetica", "normal");
      doc.text("POR EL CONTRATISTA", 15, sigY + 8);

      doc.line(135, sigY, 190, sigY);
      doc.setFont("helvetica", "bold");
      doc.text(finiquito?.firmanteResidente || firmanteResidente, 135, sigY + 4);
      doc.setFont("helvetica", "normal");
      doc.text("RESIDENTE DE OBRA", 135, sigY + 8);

      doc.line(75, sigY + 25, 130, sigY + 25);
      doc.setFont("helvetica", "bold");
      doc.text(finiquito?.firmanteAuditor || firmanteAuditor, 75, sigY + 29);
      doc.setFont("helvetica", "normal");
      doc.text("SUPERVISIÓN / AUDITORIA", 75, sigY + 33);

      doc.save(`Reporte_Maestro_${proyecto.codigo}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        Cargando datos del reporte...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">Reporte General Maestro (Finiquito de Obra)</h2>
          <p className="text-xs text-slate-gray-600 mt-1">
            Consolidado ejecutivo integral listo para impresión y auditoría oficial. Genera un expediente PDF formal de alta calidad.
          </p>
        </div>
        <button
          onClick={handleDownloadMasterPDF}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-bold text-xs shadow-sm transition-colors"
        >
          <Download size={14} />
          {generating ? 'Generando PDF...' : 'Descargar Reporte Maestro (PDF)'}
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-xl border border-light-slate shadow-sm p-8 max-w-4xl mx-auto space-y-8 animate-slide-in relative">
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 bg-navy-slate-900 text-white px-4 py-1.5 rounded-bl-lg font-mono text-[9px] font-bold tracking-widest uppercase">
          Previsualización de Reporte
        </div>

        {/* Portada Mini */}
        <div className="border border-light-slate rounded-lg p-6 bg-slate-50/50 space-y-4">
          <div className="flex justify-between items-start border-b border-light-slate pb-4">
            <div>
              <span className="text-[9px] font-mono font-bold text-ocean-blue uppercase tracking-widest">PORTADA INSTITUCIONAL</span>
              <h3 className="text-lg font-extrabold text-navy-slate-950 mt-1">STRUCTURA-PM</h3>
              <p className="text-[10px] text-slate-400">Structural Project & Cost Management</p>
            </div>
            <Sparkles className="text-ocean-blue shrink-0 stroke-1" size={24} />
          </div>

          <div className="grid grid-cols-2 gap-y-4 text-xs font-sans leading-relaxed">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Proyecto</span>
              <span className="text-navy-slate-900 font-bold">{proyecto.nombre}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Código de Obra</span>
              <span className="text-navy-slate-900 font-mono font-bold">{proyecto.codigo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Contratista</span>
              <span className="text-navy-slate-900 font-bold">{proyecto.contratista}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Ubicación</span>
              <span className="text-navy-slate-900 font-semibold">{proyecto.ubicacion}</span>
            </div>
          </div>
        </div>

        {/* Resumen Financiero Mini */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <DollarSign size={14} className="text-ocean-blue" />
            1. Resumen Ejecutivo Financiero
          </h4>
          <div className="overflow-x-auto text-xs border border-light-slate rounded">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-light-slate">
                  <th className="py-2 px-3">Cuenta Presupuestal</th>
                  <th className="py-2 px-3 text-right">Importe Integrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate font-mono">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Monto Contratado Original</td>
                  <td className="py-2 px-3 text-right text-navy-slate-900 font-bold">{formatCurrency(proyecto.montoContratado)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Monto Real Aprobado Ejecutado</td>
                  <td className="py-2 px-3 text-right text-emerald-green font-bold">
                    {formatCurrency(estimaciones.filter(e => e.estado === 'Aprobada').reduce((sum, e) => sum + e.montoBruto, 0))}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans">Amortización Acumulada de Anticipo</td>
                  <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(proyecto.amortizadoAcumulado)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3 font-sans">Saldo de Liquidación Final</td>
                  <td className="py-2 px-3 text-right text-ocean-blue">
                    {formatCurrency(
                      estimaciones.filter(e => e.estado === 'Aprobada').reduce((sum, e) => sum + e.montoBruto, 0)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuadro Consolidado Partidas Mini */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <FileText size={14} className="text-ocean-blue" />
            2. Cuadro Consolidado por Partidas
          </h4>
          <div className="overflow-x-auto text-xs border border-light-slate rounded">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-light-slate">
                  <th className="py-2 px-3">Nombre de la Partida</th>
                  <th className="py-2 px-3 text-right">Conceptos</th>
                  <th className="py-2 px-3 text-right">Importe Total Partida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate font-mono">
                {Array.from(new Set(conceptos.map(c => c.partida))).sort().map(partidaName => {
                  const partConcepts = conceptos.filter(c => c.partida === partidaName);
                  const sumPart = partConcepts.reduce((sum, i) => sum + i.importe, 0);

                  return (
                    <tr key={partidaName}>
                      <td className="py-2 px-3 font-sans font-medium text-left">{partidaName}</td>
                      <td className="py-2 px-3 text-right">{partConcepts.length}</td>
                      <td className="py-2 px-3 text-right font-bold text-navy-slate-900">{formatCurrency(sumPart)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acta y Firmas Mini */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-green" />
            3. Protocolo de Acta de Entrega y Cierre
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed text-left">
            Declaración formal de conclusión física y económica de los trabajos conforme al contrato de referencia.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 text-[10px] font-bold text-center text-slate-700">
            <div className="space-y-1">
              <div className="border-t border-slate-300 pt-2">{finiquito?.firmanteContratista || firmanteContratista}</div>
              <div className="font-normal text-slate-400">Representante Legal (Contratista)</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-300 pt-2">{finiquito?.firmanteResidente || firmanteResidente}</div>
              <div className="font-normal text-slate-400">Residente de Obra</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-300 pt-2">{finiquito?.firmanteAuditor || firmanteAuditor}</div>
              <div className="font-normal text-slate-400">Auditor Interno</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
