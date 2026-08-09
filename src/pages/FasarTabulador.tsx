import React, { useState, useEffect } from 'react';
import type { CategoriaManoObra, Proyecto } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { Plus, Trash2, Save, HelpCircle, ShieldAlert } from 'lucide-react';

interface FasarTabuladorProps {
  proyecto: Proyecto;
  rol: string;
}

export const FasarTabulador: React.FC<FasarTabuladorProps> = ({ proyecto, rol }) => {
  const [tabulador, setTabulador] = useState<CategoriaManoObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form for new worker
  const [newCategoria, setNewCategoria] = useState('');
  const [newSbc, setNewSbc] = useState(300);
  const [newFs, setNewFs] = useState(1.282); // tp/tl
  const [newIps, setNewIps] = useState(100); // IMSS + Infonavit + Impuesto sobre nómina, etc.

  const [saving, setSaving] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbAdapter.subscribeTabulador(proyecto.id, (data) => {
      setTabulador(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [proyecto.id]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoria.trim()) return;
    
    // Math formulas:
    // FASAR = Fs + (Ips / SBC)
    // SR = SBC * FASAR
    const fasar = Number((newFs + (newIps / newSbc)).toFixed(4));
    const sr = Number((newSbc * fasar).toFixed(2));

    const newRow: CategoriaManoObra = {
      id: 'mo-' + Date.now(),
      proyectoId: proyecto.id,
      categoria: newCategoria,
      sbc: newSbc,
      fs: newFs,
      ips: newIps,
      fasar,
      sr
    };

    setSaving(true);
    try {
      await dbAdapter.saveCategoriaManoObra(newRow);
      setNewCategoria('');
      setNewSbc(300);
      setNewFs(1.282);
      setNewIps(100);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (item: CategoriaManoObra) => {
    const fasar = Number((item.fs + (item.ips / item.sbc)).toFixed(4));
    const sr = Number((item.sbc * fasar).toFixed(2));
    
    const updated = {
      ...item,
      fasar,
      sr
    };

    try {
      await dbAdapter.saveCategoriaManoObra(updated);
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta categoría del tabulador?')) {
      try {
        await dbAdapter.deleteCategoriaManoObra(id, proyecto.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFieldChange = (id: string, field: keyof CategoriaManoObra, value: any) => {
    setTabulador(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate FASAR and SR on change
        const sbc = Number(updated.sbc) || 0;
        const fs = Number(updated.fs) || 0;
        const ips = Number(updated.ips) || 0;
        updated.fasar = sbc > 0 ? Number((fs + (ips / sbc)).toFixed(4)) : 0;
        updated.sr = Number((sbc * updated.fasar).toFixed(2));
        return updated;
      }
      return item;
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const isReadOnly = rol === 'Auditor';

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">MÓDULO 1: Factor de Salario Real (FASAR)</h2>
          <p className="text-xs text-slate-gray-600 mt-1">
            Cálculo del Salario Real ($SR$) de la Mano de Obra a partir del Salario Base de Cotización ($SBC$) e incidencias de Ley.
          </p>
        </div>
        <button
          onClick={() => setShowHelper(!showHelper)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-light-slate transition-colors font-medium"
        >
          <HelpCircle size={14} />
          {showHelper ? 'Ocultar Fórmulas' : 'Ver Fórmulas de Ley'}
        </button>
      </div>

      {/* Helper Panel */}
      {showHelper && (
        <div className="bg-navy-slate-800 border border-slate-gray-700 text-slate-200 p-5 rounded-xl animate-slide-in text-xs space-y-3 leading-relaxed">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5 border-b border-slate-700 pb-2">
            Marco Metodológico (Leyes de Obra Pública en México - Reglamento LOPSRM)
          </h3>
          <p>
            El <strong>Factor de Salario Real (FASAR)</strong> es el coeficiente que integra las prestaciones de ley y seguridad social del trabajador.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-navy-slate-900/60 p-4 rounded border border-slate-gray-800">
            <div>
              <p className="font-bold text-ocean-blue mb-1">Fórmula del Salario Real ($SR$):</p>
              <code className="text-white block bg-navy-slate-900 p-2 rounded text-center border border-slate-800 my-1 font-mono text-sm">
                SR = SBC * FASAR
              </code>
              <p className="mt-1 text-slate-400">
                Donde <strong>SBC</strong> es el Salario Base de Cotización diario ante el IMSS.
              </p>
            </div>
            <div>
              <p className="font-bold text-ocean-blue mb-1">Fórmula Simplificada FASAR:</p>
              <code className="text-white block bg-navy-slate-900 p-2 rounded text-center border border-slate-800 my-1 font-mono text-sm">
                FASAR = Fs + (Ips / SBC)
              </code>
              <p className="mt-1 text-slate-400">
                Donde <strong>Fs</strong> = Tp/Tl (Días Pagados / Días Laborados) y <strong>Ips</strong> son las cuotas patronales IMSS/INFONAVIT e impuestos estatales.
              </p>
            </div>
          </div>
          <p className="text-slate-400">
            * El factor base usual en México <strong>Fs (Tp/Tl)</strong> ronda entre 1.25 y 1.35 dependiendo de días festivos del calendario anual y vacaciones acumuladas. El costo de prestaciones <strong>Ips</strong> se determina en base a la UMA vigente y las tablas de cuotas del IMSS.
          </p>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Form: Add worker category */}
        {!isReadOnly && (
          <div className="xl:col-span-1 bg-white p-5 rounded-xl border border-light-slate shadow-sm h-fit">
            <h3 className="text-sm font-bold text-navy-slate-900 mb-4 border-b border-light-slate pb-2">
              Agregar Categoría de Mano de Obra
            </h3>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Oficial Carpintero, Fierrero"
                  value={newCategoria}
                  onChange={(e) => setNewCategoria(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Salario Base Diario (SBC)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={newSbc}
                    onChange={(e) => setNewSbc(Number(e.target.value))}
                    className="w-full text-xs border border-light-slate rounded pl-6 pr-2 py-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                  <span>Factor de Días Fs (Tp/Tl)</span>
                  <span className="text-[9px] text-slate-500 font-normal">T. Pagado/T. Laborado</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.001"
                  required
                  value={newFs}
                  onChange={(e) => setNewFs(Number(e.target.value))}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                  <span>Importe de Prestaciones (Ips)</span>
                  <span className="text-[9px] text-slate-500 font-normal">IMSS + INFONAVIT Diario</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newIps}
                    onChange={(e) => setNewIps(Number(e.target.value))}
                    className="w-full text-xs border border-light-slate rounded pl-6 pr-2 py-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-light-slate text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">FASAR Calculado:</span>
                  <span className="font-bold text-navy-slate-900 font-mono">
                    {(newFs + (newIps / newSbc)).toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed border-light-slate pt-1.5">
                  <span className="text-slate-400">Salario Real (SR):</span>
                  <span className="font-bold text-emerald-green font-mono">
                    {formatCurrency(newSbc * (newFs + (newIps / newSbc)))}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white font-semibold text-xs py-2 px-4 rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                Agregar al Tabulador
              </button>
            </form>
          </div>
        )}

        {/* Right Content: Spreadsheet Table */}
        <div className={`bg-white p-5 rounded-xl border border-light-slate shadow-sm ${isReadOnly ? 'xl:col-span-4' : 'xl:col-span-3'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-navy-slate-900 flex items-center gap-2">
              Tabulador de Mano de Obra Integrado (FASAR)
            </h3>
            {isReadOnly && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                <ShieldAlert size={12} /> Lectura (Auditor)
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              Cargando tabulador...
            </div>
          ) : tabulador.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Categoría de Mano de Obra</th>
                    <th className="py-2.5 px-3 text-right">SBC ($Base)</th>
                    <th className="py-2.5 px-3 text-right">Fs (Tp/Tl)</th>
                    <th className="py-2.5 px-3 text-right">Ips ($IMSS/INF)</th>
                    <th className="py-2.5 px-3 text-right bg-slate-100/50">FASAR</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-green/5 text-emerald-green">Salario Real (SR)</th>
                    {!isReadOnly && <th className="py-2.5 px-3 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-slate">
                  {tabulador.map((worker) => {
                    const isEditing = editingId === worker.id;
                    return (
                      <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-medium text-navy-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={worker.categoria}
                              onChange={(e) => handleFieldChange(worker.id, 'categoria', e.target.value)}
                              className="w-full text-xs border border-light-slate rounded p-1 bg-white"
                            />
                          ) : (
                            worker.categoria
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              value={worker.sbc}
                              onChange={(e) => handleFieldChange(worker.id, 'sbc', Number(e.target.value))}
                              className="w-20 text-right text-xs border border-light-slate rounded p-1 bg-white"
                            />
                          ) : (
                            formatCurrency(worker.sbc)
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-gray-600">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.001"
                              value={worker.fs}
                              onChange={(e) => handleFieldChange(worker.id, 'fs', Number(e.target.value))}
                              className="w-16 text-right text-xs border border-light-slate rounded p-1 bg-white"
                            />
                          ) : (
                            worker.fs.toFixed(3)
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-gray-600">
                          {isEditing ? (
                            <input
                              type="number"
                              value={worker.ips}
                              onChange={(e) => handleFieldChange(worker.id, 'ips', Number(e.target.value))}
                              className="w-16 text-right text-xs border border-light-slate rounded p-1 bg-white"
                            />
                          ) : (
                            formatCurrency(worker.ips)
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono bg-slate-50 font-bold text-navy-slate-800">
                          {worker.fasar.toFixed(4)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono bg-emerald-green/5 text-emerald-green font-bold">
                          {formatCurrency(worker.sr)}
                        </td>
                        {!isReadOnly && (
                          <td className="py-2 px-3 text-center">
                            <div className="flex justify-center gap-1.5">
                              {isEditing ? (
                                <button
                                  onClick={() => handleSaveEdit(worker)}
                                  className="p-1 bg-emerald-green text-white hover:bg-emerald-green/90 rounded transition-colors"
                                  title="Guardar cambios"
                                >
                                  <Save size={12} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEditingId(worker.id)}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Save size={12} className="opacity-40" /> {/* edit placeholder */}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteWorker(worker.id)}
                                className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center border border-dashed border-light-slate rounded-lg text-slate-400">
              <p className="text-sm">El tabulador está vacío para este proyecto.</p>
              {!isReadOnly && <p className="text-xs mt-1">Crea una categoría en el panel de la izquierda para comenzar.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
