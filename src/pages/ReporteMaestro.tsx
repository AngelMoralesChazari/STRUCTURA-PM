import React, { useState, useEffect } from 'react';
import type { Proyecto, Estimacion, ConceptoObra, Finiquito } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { FileText, Download, ShieldCheck, Sparkles, DollarSign, Layers, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [firmanteContratista] = useState('Ing. Angel Morales Chazari');
  const [firmanteAuditor] = useState('Dr. Severino Feliciano Morales');

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

  interface InsumoExplosionItem {
    codigo: string;
    descripcion: string;
    tipo: 'Material' | 'Mano de Obra' | 'Maquinaria';
    unidad: string;
    costoUnitario: number;
    cantidadTotal: number;
    importeTotal: number;
  }

  const getExplosionInsumos = (): InsumoExplosionItem[] => {
    const map: { [codigo: string]: InsumoExplosionItem } = {};

    conceptos.forEach(c => {
      const budgetQty = c.cantidadPresupuestada;
      if (c.apu) {
        if (c.apu.materiales) {
          c.apu.materiales.forEach(ins => {
            const totalQty = ins.rendimiento * budgetQty;
            if (map[ins.codigo]) {
              map[ins.codigo].cantidadTotal += totalQty;
              map[ins.codigo].importeTotal += totalQty * ins.costoUnitario;
            } else {
              map[ins.codigo] = {
                codigo: ins.codigo,
                descripcion: ins.descripcion,
                tipo: 'Material',
                unidad: ins.unidad,
                costoUnitario: ins.costoUnitario,
                cantidadTotal: totalQty,
                importeTotal: totalQty * ins.costoUnitario
              };
            }
          });
        }

        if (c.apu.manoObra) {
          c.apu.manoObra.forEach(ins => {
            const totalQty = ins.rendimiento * budgetQty;
            if (map[ins.codigo]) {
              map[ins.codigo].cantidadTotal += totalQty;
              map[ins.codigo].importeTotal += totalQty * ins.costoUnitario;
            } else {
              map[ins.codigo] = {
                codigo: ins.codigo,
                descripcion: ins.descripcion,
                tipo: 'Mano de Obra',
                unidad: ins.unidad,
                costoUnitario: ins.costoUnitario,
                cantidadTotal: totalQty,
                importeTotal: totalQty * ins.costoUnitario
              };
            }
          });
        }

        if (c.apu.maquinaria) {
          c.apu.maquinaria.forEach(ins => {
            const totalQty = ins.rendimiento * budgetQty;
            if (map[ins.codigo]) {
              map[ins.codigo].cantidadTotal += totalQty;
              map[ins.codigo].importeTotal += totalQty * ins.costoUnitario;
            } else {
              map[ins.codigo] = {
                codigo: ins.codigo,
                descripcion: ins.descripcion,
                tipo: 'Maquinaria',
                unidad: ins.unidad,
                costoUnitario: ins.costoUnitario,
                cantidadTotal: totalQty,
                importeTotal: totalQty * ins.costoUnitario
              };
            }
          });
        }
      }
    });

    return Object.values(map);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const handleDownloadMasterPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const navyColor: [number, number, number] = [15, 23, 42]; // #0F172A

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
      doc.text("REPORTE GENERAL", 20, 75);

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

      autoTable(doc, {
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

      autoTable(doc, {
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

      autoTable(doc, {
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
      // PAGE 4: EXPLOSIÓN DETALLADA DE INSUMOS
      // ==========================================
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("STRUCTURA-PM | EXPLOSIÓN CONSOLIDADA DE INSUMOS", 15, 10);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("4. Explosión Consolidada de Insumos (Recursos)", 15, 25);

      const explosionData = getExplosionInsumos();
      const materialItems = explosionData.filter(i => i.tipo === 'Material');
      const manoObraItems = explosionData.filter(i => i.tipo === 'Mano de Obra');
      const maquinariaItems = explosionData.filter(i => i.tipo === 'Maquinaria');

      // 4.1 Materiales
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`4.1 Materiales (Subtotal: ${formatCurrency(materialItems.reduce((s, i) => s + i.importeTotal, 0))})`, 15, 33);

      const matRows = materialItems.map(i => [
        i.codigo,
        i.descripcion,
        i.unidad,
        i.cantidadTotal.toFixed(2),
        formatCurrency(i.costoUnitario),
        formatCurrency(i.importeTotal)
      ]);

      autoTable(doc, {
        startY: 36,
        head: [['Código', 'Descripción del Insumo', 'Unid.', 'Cant. Total', 'Costo Unit.', 'Importe ($)']],
        body: matRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          1: { cellWidth: 80 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      // 4.2 Mano de Obra
      const finalYMat = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`4.2 Mano de Obra (Subtotal: ${formatCurrency(manoObraItems.reduce((s, i) => s + i.importeTotal, 0))})`, 15, finalYMat);

      const moRows = manoObraItems.map(i => [
        i.codigo,
        i.descripcion,
        i.unidad,
        i.cantidadTotal.toFixed(2),
        formatCurrency(i.costoUnitario),
        formatCurrency(i.importeTotal)
      ]);

      autoTable(doc, {
        startY: finalYMat + 4,
        head: [['Código', 'Especialidad / Categoría', 'Unid.', 'Jornadas Tot.', 'Salario Real', 'Importe ($)']],
        body: moRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          1: { cellWidth: 80 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      // 4.3 Maquinaria y Equipo
      const finalYMo = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`4.3 Maquinaria y Equipo (Subtotal: ${formatCurrency(maquinariaItems.reduce((s, i) => s + i.importeTotal, 0))})`, 15, finalYMo);

      const maqRows = maquinariaItems.map(i => [
        i.codigo,
        i.descripcion,
        i.unidad,
        i.cantidadTotal.toFixed(2),
        formatCurrency(i.costoUnitario),
        formatCurrency(i.importeTotal)
      ]);

      autoTable(doc, {
        startY: finalYMo + 4,
        head: [['Código', 'Descripción del Equipo', 'Unid.', 'Horas Tot.', 'Costo Horario', 'Importe ($)']],
        body: maqRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          1: { cellWidth: 80 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      // ==========================================
      // PAGE 5: ESTADO DE ESTIMACIONES Y ACTA FINIQUITO
      // ==========================================
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("STRUCTURA-PM | ACTA DE ENTREGA Y FINIQUITO", 15, 10);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text("5. Relación de Estimaciones Tramitadas", 15, 28);

      const estRows = estimaciones.map(e => [
        `#${e.numeroEstimacion}`,
        `${e.periodoInicio} al ${e.periodoFin}`,
        formatCurrency(e.montoBruto),
        `-${formatCurrency(e.amortizacionAnticipo)}`,
        `-${formatCurrency(e.retencionGarantia)}`,
        formatCurrency(e.liquidoAPagar),
        e.estado
      ]);

      autoTable(doc, {
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
      doc.text("6. Acta de Cierre y Finiquito", 15, finalY4);

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

      doc.save(`Reporte_General_${proyecto.codigo}.pdf`);
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
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">Reporte General (Finiquito de Obra)</h2>
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
          {generating ? 'Generando PDF...' : 'Descargar Reporte General (PDF)'}
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-xl border border-light-slate shadow-sm p-8 w-full max-w-6xl mx-auto space-y-8 animate-slide-in relative">
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

        {/* Explosión Detallada de Insumos Mini */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <Layers size={14} className="text-ocean-blue" />
            3. Explosión Consolidada de Insumos (Recursos)
          </h4>
          <div className="space-y-3">
            {(() => {
              const explosionData = getExplosionInsumos();
              const categories = [
                { title: '3.1 Materiales', items: explosionData.filter(i => i.tipo === 'Material'), headers: ['Código', 'Descripción del Insumo', 'Unid.', 'Cant. Total', 'Costo Unit.', 'Importe ($)'] },
                { title: '3.2 Mano de Obra', items: explosionData.filter(i => i.tipo === 'Mano de Obra'), headers: ['Código', 'Especialidad / Categoría', 'Unid.', 'Jornadas Tot.', 'Salario Real', 'Importe ($)'] },
                { title: '3.3 Maquinaria y Equipo', items: explosionData.filter(i => i.tipo === 'Maquinaria'), headers: ['Código', 'Descripción del Equipo', 'Unid.', 'Horas Tot.', 'Costo Horario', 'Importe ($)'] }
              ];

              return categories.map(cat => {
                const subtotal = cat.items.reduce((s, i) => s + i.importeTotal, 0);
                if (cat.items.length === 0) return null;

                return (
                  <div key={cat.title} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-navy-slate-800">
                      <span>{cat.title}</span>
                      <span className="text-ocean-blue font-mono">Subtotal: {formatCurrency(subtotal)}</span>
                    </div>
                    <div className="overflow-x-auto text-[10px] border border-light-slate rounded">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase border-b border-light-slate">
                            {cat.headers.map(h => (
                              <th key={h} className={`py-1.5 px-2 ${h === 'Código' || h === 'Descripción del Insumo' || h === 'Especialidad / Categoría' || h === 'Descripción del Equipo' ? 'text-left' : h === 'Unid.' ? 'text-center' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-light-slate font-mono text-[9.5px]">
                          {cat.items.map(item => (
                            <tr key={item.codigo}>
                              <td className="py-1.5 px-2 font-bold text-left">{item.codigo}</td>
                              <td className="py-1.5 px-2 font-sans text-left truncate max-w-xs">{item.descripcion}</td>
                              <td className="py-1.5 px-2 text-center font-sans text-slate-500">{item.unidad}</td>
                              <td className="py-1.5 px-2 text-right">{item.cantidadTotal.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-400">{formatCurrency(item.costoUnitario)}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-navy-slate-900">{formatCurrency(item.importeTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Relación de Estimaciones Mini */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-ocean-blue" />
            4. Relación de Estimaciones Tramitadas
          </h4>
          <div className="overflow-x-auto text-xs border border-light-slate rounded">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-light-slate">
                  <th className="py-2 px-3">N°</th>
                  <th className="py-2 px-3">Período</th>
                  <th className="py-2 px-3 text-right">Monto Bruto ($)</th>
                  <th className="py-2 px-3 text-right">Amortizado ($)</th>
                  <th className="py-2 px-3 text-right">Retenido ($)</th>
                  <th className="py-2 px-3 text-right">Líquido ($)</th>
                  <th className="py-2 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate font-mono">
                {estimaciones.map(e => (
                  <tr key={e.id}>
                    <td className="py-2 px-3 font-sans font-bold">#{e.numeroEstimacion}</td>
                    <td className="py-2 px-3 font-sans">{e.periodoInicio} al {e.periodoFin}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(e.montoBruto)}</td>
                    <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(e.amortizacionAnticipo)}</td>
                    <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(e.retencionGarantia)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-green">{formatCurrency(e.liquidoAPagar)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        e.estado === 'Aprobada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>{e.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acta y Firmas Mini */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-navy-slate-950 uppercase tracking-wider border-b border-light-slate pb-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-green" />
            5. Protocolo de Acta de Entrega y Cierre
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed text-left">
            Declaración formal de conclusión física y económica de los trabajos conforme al contrato de referencia.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 text-[10px] font-bold text-center text-slate-700 font-sans">
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
              <div className="font-normal text-slate-400">Supervisión / Auditoría</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
