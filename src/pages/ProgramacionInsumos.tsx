import React, { useState, useEffect } from 'react';
import type { ConceptoObra, Proyecto } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { Layers, Calendar, Save } from 'lucide-react';

interface ProgramacionInsumosProps {
  proyecto: Proyecto;
  rol: string;
}

interface InsumoExplosionItem {
  codigo: string;
  descripcion: string;
  tipo: 'Material' | 'Mano de Obra' | 'Maquinaria';
  unidad: string;
  costoUnitario: number;
  cantidadTotal: number;
  importeTotal: number;
}

export const ProgramacionInsumos: React.FC<ProgramacionInsumosProps> = ({ proyecto, rol }) => {
  const [conceptos, setConceptos] = useState<ConceptoObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'explosion' | 'programacion'>('explosion');
  
  // Schedule periods: e.g., Month 1, Month 2, Month 3, Month 4 based on project dates
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [editingProgramacion, setEditingProgramacion] = useState<{ [conceptoId: string]: { [periodo: string]: number } }>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbAdapter.subscribeConceptos(proyecto.id, (data) => {
      setConceptos(data);
      
      // Initialize editing state
      const initialEditState: typeof editingProgramacion = {};
      data.forEach(c => {
        initialEditState[c.id] = { ...(c.programacion || {}) };
      });
      setEditingProgramacion(initialEditState);
      
      setLoading(false);
    });

    // Generate periods based on start and end dates (e.g. "2026-08", "2026-09", etc.)
    const generatePeriods = () => {
      const start = new Date(proyecto.fechaInicio + "-02");
      const end = new Date(proyecto.fechaFin + "-02");
      const list: string[] = [];

      let current = new Date(start);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        list.push(`${year}-${month}`);
        current.setMonth(current.getMonth() + 1);
      }
      setPeriodos(list);
    };
    generatePeriods();

    return () => unsubscribe();
  }, [proyecto.id, proyecto.fechaInicio, proyecto.fechaFin]);

  // Consolidated Insumos Calculation (Explosión de Insumos)
  const getExplosionInsumos = (): InsumoExplosionItem[] => {
    const map: { [codigo: string]: InsumoExplosionItem } = {};

    conceptos.forEach(c => {
      const budgetQty = c.cantidadPresupuestada;
      
      // Consolidate Materials
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

      // Consolidate Mano de Obra
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

      // Consolidate Maquinaria
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
    });

    return Object.values(map);
  };

  const handleProgramQtyChange = (conceptoId: string, periodo: string, valStr: string) => {
    const value = valStr === '' ? 0 : Number(valStr);
    setEditingProgramacion(prev => ({
      ...prev,
      [conceptoId]: {
        ...(prev[conceptoId] || {}),
        [periodo]: value
      }
    }));
  };

  const handleSaveProgramacion = async () => {
    setSaving(true);
    setSuccessMessage(false);
    try {
      // Loop concepts and save updated programacion to DB
      for (const c of conceptos) {
        const updatedConcept: ConceptoObra = {
          ...c,
          programacion: editingProgramacion[c.id] || {}
        };
        await dbAdapter.saveConcepto(proyecto.id, updatedConcept);
      }
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const explosionData = getExplosionInsumos();
  const totalCostExplosion = explosionData.reduce((sum, item) => sum + item.importeTotal, 0);

  const isReadOnly = rol === 'Auditor';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm">
        <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">MÓDULO 4: Programación y Explosión de Insumos</h2>
        <p className="text-xs text-slate-gray-600 mt-1">
          Planificación físico-financiera mensual y consolidación total de materiales, jornadas laborales y horas de maquinaria necesarias para el proyecto.
        </p>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-5 border-t border-light-slate pt-4">
          <button
            onClick={() => setActiveTab('explosion')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-colors ${
              activeTab === 'explosion' 
                ? 'bg-navy-slate-800 text-white shadow-sm' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers size={14} />
            Explosión de Insumos
          </button>
          <button
            onClick={() => setActiveTab('programacion')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-colors ${
              activeTab === 'programacion' 
                ? 'bg-navy-slate-800 text-white shadow-sm' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Calendar size={14} />
            Distribución Temporal (Programa)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-60 bg-white border border-light-slate rounded-xl shadow-sm flex items-center justify-center text-slate-400 text-sm">
          Cargando datos...
        </div>
      ) : activeTab === 'explosion' ? (
        /* Tab 1: Explosión de Insumos View */
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm space-y-6 animate-slide-in">
          <div className="flex justify-between items-center border-b border-light-slate pb-3">
            <div>
              <h3 className="text-sm font-bold text-navy-slate-900">Consolidación General de Recursos Requeridos</h3>
              <p className="text-[10px] text-slate-400">Sumatoria global ponderada de insumos según rendimientos APU y cantidades contratadas.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Costo Directo Consolidado</span>
              <span className="text-md font-extrabold text-navy-slate-900 font-mono">{formatCurrency(totalCostExplosion)}</span>
            </div>
          </div>

          {explosionData.length > 0 ? (
            ['Material', 'Mano de Obra', 'Maquinaria'].map(type => {
              const items = explosionData.filter(i => i.tipo === type);
              if (items.length === 0) return null;

              const totalTypeImporte = items.reduce((sum, i) => sum + i.importeTotal, 0);

              return (
                <div key={type} className="border border-light-slate rounded overflow-hidden">
                  <div className="bg-slate-50 border-b border-light-slate px-4 py-2.5 flex justify-between items-center text-xs font-bold text-navy-slate-900">
                    <span className="uppercase tracking-wider">{type}s</span>
                    <span className="font-mono text-slate-600">Subtotal: {formatCurrency(totalTypeImporte)}</span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-light-slate bg-slate-100/50 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-4 w-24">Código</th>
                        <th className="py-2 px-4">Descripción del Insumo</th>
                        <th className="py-2 px-4 text-center w-20">Unidad</th>
                        <th className="py-2 px-4 text-right w-32">Cantidad Total</th>
                        <th className="py-2 px-4 text-right w-32">Costo Unitario</th>
                        <th className="py-2 px-4 text-right w-36">Importe ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-slate font-mono">
                      {items.map(item => (
                        <tr key={item.codigo} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-4 font-bold text-navy-slate-800">{item.codigo}</td>
                          <td className="py-2 px-4 font-sans text-slate-700 text-left">{item.descripcion}</td>
                          <td className="py-2 px-4 text-center font-sans text-slate-500">{item.unidad}</td>
                          <td className="py-2 px-4 text-right">{item.cantidadTotal.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right text-slate-500">{formatCurrency(item.costoUnitario)}</td>
                          <td className="py-2 px-4 text-right font-bold text-navy-slate-900">{formatCurrency(item.importeTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              No hay recursos consolidados. Asegúrate de añadir insumos a las tarjetas APU en el Módulo 3.
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Programación Calendar Table View */
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm space-y-4 animate-slide-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-navy-slate-900">Distribución de Cantidades por Período</h3>
              <p className="text-[10px] text-slate-400">Distribuye la cantidad presupuestada de cada concepto en los distintos meses del proyecto.</p>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveProgramacion}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-green hover:bg-emerald-green/90 text-white rounded font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Guardar Calendario'}
                </button>
                {successMessage && (
                  <span className="text-[10px] text-emerald-green font-bold animate-pulse">
                    ¡Programa guardado!
                  </span>
                )}
              </div>
            )}
          </div>

          {conceptos.length > 0 ? (
            <div className="overflow-x-auto border border-light-slate rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 w-20">Código</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-right w-24">Cant. Total</th>
                    <th className="py-2.5 px-3 text-center w-16">Unidad</th>
                    {periodos.map(period => (
                      <th key={period} className="py-2.5 px-3 text-center w-24 bg-slate-100/50">{period}</th>
                    ))}
                    <th className="py-2.5 px-3 text-right w-24 font-bold bg-navy-slate-800/5 text-navy-slate-900">Programada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-slate font-mono">
                  {conceptos.map(c => {
                    const editObj = editingProgramacion[c.id] || {};
                    const sumProgrammed = Object.values(editObj).reduce((sum, val) => sum + (Number(val) || 0), 0);
                    
                    const isQtyExceeded = sumProgrammed > c.cantidadPresupuestada;
                    const isQtyUnder = sumProgrammed < c.cantidadPresupuestada;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-navy-slate-850">{c.codigo}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-700 max-w-xs truncate text-left" title={c.descripcion}>
                          {c.descripcion}
                        </td>
                        <td className="py-2.5 px-3 text-right text-navy-slate-900 font-bold">{c.cantidadPresupuestada}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-slate-500">{c.unidad}</td>
                        {periodos.map(period => (
                          <td key={period} className="py-2.5 px-2 bg-slate-50/30">
                            {isReadOnly ? (
                              <span className="block text-center">{editObj[period] || 0}</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={editObj[period] === undefined ? '' : editObj[period]}
                                onChange={(e) => handleProgramQtyChange(c.id, period, e.target.value)}
                                className="w-full border border-light-slate rounded px-1.5 py-1 text-[11px] text-center bg-white"
                              />
                            )}
                          </td>
                        ))}
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          isQtyExceeded 
                            ? 'text-red-600 bg-red-50' 
                            : isQtyUnder 
                              ? 'text-amber-600 bg-amber-50' 
                              : 'text-emerald-green bg-emerald-green/5'
                        }`}>
                          {sumProgrammed.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400">
              No hay conceptos para programar. Añade conceptos en el Módulo 3.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
