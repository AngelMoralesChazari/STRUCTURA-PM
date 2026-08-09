import React, { useState, useEffect } from 'react';
import type { ConceptoObra, Proyecto, InsumoAPU, CategoriaManoObra, ConfiguracionSobrecosto } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { Plus, Trash2, Edit2, Save, X, Eye, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface ConceptosCatalogoProps {
  proyecto: Proyecto;
  rol: string;
}

export const ConceptosCatalogo: React.FC<ConceptosCatalogoProps> = ({ proyecto, rol }) => {
  const [conceptos, setConceptos] = useState<ConceptoObra[]>([]);
  const [tabuladorMO, setTabuladorMO] = useState<CategoriaManoObra[]>([]);
  const [sobrecosto, setSobrecosto] = useState<ConfiguracionSobrecosto | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Card states
  const [selectedConcept, setSelectedConcept] = useState<ConceptoObra | null>(null);
  const [isEditingAPU, setIsEditingAPU] = useState(false);
  const [isCreatingConcept, setIsCreatingConcept] = useState(false);

  // Form states for new concept
  const [newPartida, setNewPartida] = useState('01. TERRACERÍAS');
  const [newCodigo, setNewCodigo] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newUnidad, setNewUnidad] = useState('m3');
  const [newCantidad, setNewCantidad] = useState<number | ''>(1);

  useEffect(() => {
    setLoading(true);
    
    // Subscribe to concepts
    const unsubscribeConcepts = dbAdapter.subscribeConceptos(proyecto.id, (data) => {
      setConceptos(data);
      setLoading(false);
    });

    // Subscribe to workers (for APU selection)
    const unsubscribeTab = dbAdapter.subscribeTabulador(proyecto.id, (data) => {
      setTabuladorMO(data);
    });

    // Get sobrecosto configuration
    const fetchSobrecosto = async () => {
      const data = await dbAdapter.getSobrecosto(proyecto.id);
      setSobrecosto(data);
    };
    fetchSobrecosto();

    return () => {
      unsubscribeConcepts();
      unsubscribeTab();
    };
  }, [proyecto.id]);

  const handleCreateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodigo || !newDescripcion) return;

    const newConcept: ConceptoObra = {
      id: 'c-' + Date.now(),
      proyectoId: proyecto.id,
      partida: newPartida,
      codigo: newCodigo.toUpperCase(),
      descripcion: newDescripcion,
      unidad: newUnidad,
      cantidadPresupuestada: Number(newCantidad) || 0,
      costoDirecto: 0,
      precioUnitario: 0,
      importe: 0,
      apu: {
        materiales: [],
        manoObra: [],
        maquinaria: []
      },
      programacion: {}
    };

    try {
      await dbAdapter.saveConcepto(proyecto.id, newConcept);
      setIsCreatingConcept(false);
      setNewCodigo('');
      setNewDescripcion('');
      setNewCantidad(1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConcept = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este concepto y su tarjeta APU?')) {
      try {
        await dbAdapter.deleteConcepto(proyecto.id, id);
        if (selectedConcept?.id === id) {
          setSelectedConcept(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddInsumo = (tipo: 'Material' | 'Mano de Obra' | 'Maquinaria') => {
    if (!selectedConcept) return;

    const newInsumo: InsumoAPU = {
      id: 'ins-' + Date.now(),
      codigo: tipo === 'Material' ? 'MAT-' : tipo === 'Mano de Obra' ? 'MO-' : 'MQ-',
      descripcion: '',
      tipo,
      unidad: tipo === 'Material' ? 'kg' : tipo === 'Mano de Obra' ? 'jor' : 'hr',
      costoUnitario: 0,
      rendimiento: 1,
      importe: 0
    };

    const updatedConcept = { ...selectedConcept };
    if (tipo === 'Material') updatedConcept.apu.materiales.push(newInsumo);
    else if (tipo === 'Mano de Obra') updatedConcept.apu.manoObra.push(newInsumo);
    else updatedConcept.apu.maquinaria.push(newInsumo);

    recalculateConceptDirectCost(updatedConcept);
    setSelectedConcept(updatedConcept);
  };

  const handleInsumoChange = (
    tipo: 'Material' | 'Mano de Obra' | 'Maquinaria',
    insumoId: string,
    field: keyof InsumoAPU,
    value: any
  ) => {
    if (!selectedConcept) return;

    const updatedConcept = { ...selectedConcept };
    let list: InsumoAPU[] = [];
    if (tipo === 'Material') list = updatedConcept.apu.materiales;
    else if (tipo === 'Mano de Obra') list = updatedConcept.apu.manoObra;
    else list = updatedConcept.apu.maquinaria;

    const idx = list.findIndex(ins => ins.id === insumoId);
    if (idx >= 0) {
      const insumo = { ...list[idx], [field]: value };
      
      // Auto-assign cost if changing worker category in MO selection
      if (tipo === 'Mano de Obra' && field === 'codigo') {
        const matchingWorker = tabuladorMO.find(w => w.categoria === value);
        if (matchingWorker) {
          insumo.descripcion = matchingWorker.categoria;
          insumo.costoUnitario = matchingWorker.sr; // Use the computed Salario Real!
        }
      }

      insumo.importe = Number((insumo.costoUnitario * insumo.rendimiento).toFixed(2));
      list[idx] = insumo;
    }

    recalculateConceptDirectCost(updatedConcept);
    setSelectedConcept(updatedConcept);
  };

  const handleDeleteInsumo = (tipo: 'Material' | 'Mano de Obra' | 'Maquinaria', insumoId: string) => {
    if (!selectedConcept) return;
    const updatedConcept = { ...selectedConcept };
    if (tipo === 'Material') {
      updatedConcept.apu.materiales = updatedConcept.apu.materiales.filter(i => i.id !== insumoId);
    } else if (tipo === 'Mano de Obra') {
      updatedConcept.apu.manoObra = updatedConcept.apu.manoObra.filter(i => i.id !== insumoId);
    } else {
      updatedConcept.apu.maquinaria = updatedConcept.apu.maquinaria.filter(i => i.id !== insumoId);
    }

    recalculateConceptDirectCost(updatedConcept);
    setSelectedConcept(updatedConcept);
  };

  const recalculateConceptDirectCost = (concept: ConceptoObra) => {
    const sumMat = concept.apu.materiales.reduce((sum, i) => sum + i.importe, 0);
    const sumMo = concept.apu.manoObra.reduce((sum, i) => sum + i.importe, 0);
    const sumMaq = concept.apu.maquinaria.reduce((sum, i) => sum + i.importe, 0);
    
    concept.costoDirecto = Number((sumMat + sumMo + sumMaq).toFixed(2));
    const factor = sobrecosto?.factorSobrecostoTotal || 1.0;
    concept.precioUnitario = Number((concept.costoDirecto * factor).toFixed(2));
    concept.importe = Number((concept.cantidadPresupuestada * concept.precioUnitario).toFixed(2));
  };

  const handleSaveAPU = async () => {
    if (!selectedConcept) return;
    try {
      await dbAdapter.saveConcepto(proyecto.id, selectedConcept);
      setIsEditingAPU(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const isReadOnly = rol === 'Auditor';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">MÓDULO 3: Matriz de Precios Unitarios (APU) y Catálogo</h2>
          <p className="text-xs text-slate-gray-600 mt-1">
            Gestión del presupuesto base, tarjetas de análisis de precios unitarios integrados y costos directos de obra.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setIsCreatingConcept(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-medium text-xs shadow-sm transition-colors"
          >
            <Plus size={14} />
            Crear Concepto
          </button>
        )}
      </div>

      {/* Concept catalog main table */}
      <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm">
        <h3 className="text-sm font-bold text-navy-slate-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-ocean-blue" />
          Catálogo Presupuestal Agrupado por Partidas
        </h3>

        {loading ? (
          <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
            Cargando catálogo...
          </div>
        ) : conceptos.length > 0 ? (
          <div className="overflow-x-auto border border-light-slate rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Partida / Descripción</th>
                  <th className="py-2.5 px-3 text-center">Unidad</th>
                  <th className="py-2.5 px-3 text-right">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">C. Directo ($)</th>
                  <th className="py-2.5 px-3 text-right bg-slate-100/50">P. Unitario ($)</th>
                  <th className="py-2.5 px-3 text-right font-bold bg-navy-slate-800/5 text-navy-slate-900">Importe ($)</th>
                  <th className="py-2.5 px-3 text-center">Matriz APU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-slate">
                {/* We group by Partida */}
                {Array.from(new Set(conceptos.map(c => c.partida))).sort().map(partidaName => {
                  const partidaConcepts = conceptos.filter(c => c.partida === partidaName);
                  const totalPartidaImporte = partidaConcepts.reduce((sum, item) => sum + item.importe, 0);

                  return (
                    <React.Fragment key={partidaName}>
                      {/* Partida Header Row */}
                      <tr className="bg-slate-100 border-y border-light-slate font-bold text-navy-slate-900 text-[11px]">
                        <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wide">
                          {partidaName}
                        </td>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-500 text-[10px]">
                          Subtotal Partida:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-navy-slate-900">
                          {formatCurrency(totalPartidaImporte)}
                        </td>
                        <td></td>
                      </tr>

                      {/* Concepts in Partida */}
                      {partidaConcepts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold font-mono text-navy-slate-900">{c.codigo}</td>
                          <td className="py-3 px-3 max-w-sm text-slate-700 leading-relaxed font-sans">{c.descripcion}</td>
                          <td className="py-3 px-3 text-center text-slate-500 font-medium">{c.unidad}</td>
                          <td className="py-3 px-3 text-right font-mono font-medium">{c.cantidadPresupuestada}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(c.costoDirecto)}</td>
                          <td className="py-3 px-3 text-right font-mono bg-slate-50/50 text-navy-slate-800">{formatCurrency(c.precioUnitario)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold bg-navy-slate-800/5 text-navy-slate-900">{formatCurrency(c.importe)}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedConcept(c);
                                  setIsEditingAPU(false);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-[10px] font-semibold flex items-center gap-1"
                              >
                                <Eye size={12} />
                                APU Card
                              </button>
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleDeleteConcept(c.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar Concepto"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center border border-dashed border-light-slate rounded-lg text-slate-400">
            <p className="text-sm">No hay conceptos en el catálogo para este proyecto.</p>
            {!isReadOnly && <p className="text-xs mt-1">Presiona "Crear Concepto" arriba para agregar el primero.</p>}
          </div>
        )}
      </div>

      {/* APU Detail Modal/Card Drawer */}
      {selectedConcept && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-light-slate w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 animate-slide-in">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-light-slate pb-4 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Tarjeta de Análisis de Precios Unitarios (APU)</span>
                <h3 className="text-md font-bold text-navy-slate-900 mt-1 flex items-center gap-2">
                  <span className="font-mono text-ocean-blue bg-ocean-blue/10 px-2 py-0.5 rounded text-xs">{selectedConcept.codigo}</span>
                  {selectedConcept.descripcion}
                </h3>
              </div>
              <button
                onClick={() => setSelectedConcept(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 border border-light-slate rounded-lg text-xs font-mono">
                <div>
                  <span className="text-slate-400 block">Unidad de Medida:</span>
                  <span className="font-bold text-navy-slate-950">{selectedConcept.unidad}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cantidad Presupuestada:</span>
                  <span className="font-bold text-navy-slate-950">{selectedConcept.cantidadPresupuestada}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-emerald-green">Costo Directo Unitario:</span>
                  <span className="font-bold text-emerald-green">{formatCurrency(selectedConcept.costoDirecto)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-ocean-blue">P. Unitario Integrado:</span>
                  <span className="font-bold text-ocean-blue">{formatCurrency(selectedConcept.precioUnitario)}</span>
                </div>
              </div>

              {/* APU Breakdown: Materiales, Mano de Obra, Maquinaria */}
              {['Material', 'Mano de Obra', 'Maquinaria'].map((insumoType) => {
                const type = insumoType as 'Material' | 'Mano de Obra' | 'Maquinaria';
                let items: InsumoAPU[] = [];
                if (type === 'Material') items = selectedConcept.apu.materiales;
                else if (type === 'Mano de Obra') items = selectedConcept.apu.manoObra;
                else items = selectedConcept.apu.maquinaria;

                const isEditable = isEditingAPU && !isReadOnly;

                return (
                  <div key={type} className="border border-light-slate rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-navy-slate-900 uppercase tracking-wider">{type}</h4>
                      {isEditable && (
                        <button
                          onClick={() => handleAddInsumo(type)}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 border border-light-slate text-slate-700 font-semibold rounded flex items-center gap-1 transition-colors"
                        >
                          <Plus size={10} /> Añadir
                        </button>
                      )}
                    </div>

                    {items.length > 0 ? (
                      <div className="overflow-x-auto text-[11px]">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-medium">
                              <th className="py-2 px-2 text-left w-20">Código</th>
                              <th className="py-2 px-2 text-left">Descripción del Recurso</th>
                              <th className="py-2 px-2 text-center w-16">Unidad</th>
                              <th className="py-2 px-2 text-right w-24">Costo ($)</th>
                              <th className="py-2 px-2 text-right w-24">Rendimiento</th>
                              <th className="py-2 px-2 text-right w-24">Importe ($)</th>
                              {isEditable && <th className="py-2 px-2 text-center w-10"></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-light-slate">
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-2 px-2 font-mono">
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={item.codigo}
                                      onChange={(e) => handleInsumoChange(type, item.id, 'codigo', e.target.value)}
                                      className="w-full border border-light-slate rounded p-0.5 text-[11px] bg-white font-mono"
                                    />
                                  ) : (
                                    item.codigo
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {isEditable ? (
                                    type === 'Mano de Obra' ? (
                                      // Render select dropdown linked to FASAR workers
                                      <select
                                        value={item.codigo}
                                        onChange={(e) => handleInsumoChange(type, item.id, 'codigo', e.target.value)}
                                        className="w-full border border-light-slate rounded p-0.5 text-[11px] bg-white"
                                      >
                                        <option value="">-- Selecciona Categoría FASAR --</option>
                                        {tabuladorMO.map(worker => (
                                          <option key={worker.id} value={worker.categoria}>
                                            {worker.categoria} (${worker.sr.toFixed(2)}/jor)
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={item.descripcion}
                                        onChange={(e) => handleInsumoChange(type, item.id, 'descripcion', e.target.value)}
                                        className="w-full border border-light-slate rounded p-0.5 text-[11px] bg-white"
                                      />
                                    )
                                  ) : (
                                    item.descripcion
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-500">
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={item.unidad}
                                      onChange={(e) => handleInsumoChange(type, item.id, 'unidad', e.target.value)}
                                      className="w-full border border-light-slate rounded p-0.5 text-[11px] text-center bg-white"
                                    />
                                  ) : (
                                    item.unidad
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right font-mono">
                                  {isEditable ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      disabled={type === 'Mano de Obra'} // Handled by Tabulador FASAR!
                                      value={item.costoUnitario}
                                      onChange={(e) => handleInsumoChange(type, item.id, 'costoUnitario', Number(e.target.value))}
                                      className="w-full border border-light-slate rounded p-0.5 text-[11px] text-right bg-white"
                                    />
                                  ) : (
                                    formatCurrency(item.costoUnitario)
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right font-mono">
                                  {isEditable ? (
                                    <input
                                      type="number"
                                      step="0.0001"
                                      value={item.rendimiento}
                                      onChange={(e) => handleInsumoChange(type, item.id, 'rendimiento', Number(e.target.value))}
                                      className="w-full border border-light-slate rounded p-0.5 text-[11px] text-right bg-white font-mono"
                                    />
                                  ) : (
                                    item.rendimiento.toFixed(4)
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-semibold text-navy-slate-900">
                                  {formatCurrency(item.importe)}
                                </td>
                                {isEditable && (
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      onClick={() => handleDeleteInsumo(type, item.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-slate-100 p-0.5 rounded"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 text-xs">
                        No hay insumos cargados para este análisis.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Costo Directo math breakdown */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">DESGLOSE FINAL APU</span>
                    <div className="flex gap-4 text-xs font-mono text-slate-300">
                      <span>Mats: {formatCurrency(selectedConcept.apu.materiales.reduce((sum, i) => sum + i.importe, 0))}</span>
                      <span>M.O.: {formatCurrency(selectedConcept.apu.manoObra.reduce((sum, i) => sum + i.importe, 0))}</span>
                      <span>Eqps: {formatCurrency(selectedConcept.apu.maquinaria.reduce((sum, i) => sum + i.importe, 0))}</span>
                    </div>
                  </div>
                  <div className="flex gap-6 text-right items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">COSTO DIRECTO ($CD)</span>
                      <span className="text-lg font-bold font-mono text-white">{formatCurrency(selectedConcept.costoDirecto)}</span>
                    </div>
                    <div className="text-slate-700 text-xl font-bold">×</div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">SOBRECOSTO</span>
                      <span className="text-lg font-bold font-mono text-ocean-blue">x{sobrecosto?.factorSobrecostoTotal.toFixed(4) || "1.0000"}</span>
                    </div>
                    <div className="text-slate-700 text-xl font-bold">=</div>
                    <div>
                      <span className="text-[10px] text-emerald-400 block">PRECIO UNITARIO ($PU)</span>
                      <span className="text-xl font-extrabold font-mono text-emerald-400">{formatCurrency(selectedConcept.precioUnitario)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-3 mt-6 border-t border-light-slate pt-4">
              {!isReadOnly && (
                <>
                  {isEditingAPU ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingAPU(false);
                          // Re-fetch concepts to revert unsaved edits
                          dbAdapter.subscribeConceptos(proyecto.id, (data) => {
                            setConceptos(data);
                            const updated = data.find(c => c.id === selectedConcept.id);
                            if (updated) setSelectedConcept(updated);
                          })();
                        }}
                        className="px-3.5 py-1.5 text-xs border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveAPU}
                        className="px-4 py-1.5 text-xs bg-emerald-green hover:bg-emerald-green/90 text-white rounded font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Save size={14} />
                        Guardar Tarjeta APU
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingAPU(true)}
                      className="px-4 py-1.5 text-xs bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit2 size={14} />
                      Editar Tarjeta APU
                    </button>
                  )}
                </>
              )}
              {!isEditingAPU && (
                <button
                  onClick={() => setSelectedConcept(null)}
                  className="px-4 py-1.5 text-xs bg-navy-slate-900 text-white rounded font-semibold hover:bg-navy-slate-800 transition-colors"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Concept Modal */}
      {isCreatingConcept && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-light-slate w-full max-w-md p-6 animate-slide-in">
            <div className="flex justify-between items-center border-b border-light-slate pb-3 mb-4">
              <h3 className="text-sm font-bold text-navy-slate-900">Crear Nuevo Concepto de Obra</h3>
              <button
                onClick={() => setIsCreatingConcept(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateConcept} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Partida</label>
                <select
                  value={newPartida}
                  onChange={(e) => setNewPartida(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                >
                  <option value="01. CIMENTACIONES">01. CIMENTACIONES</option>
                  <option value="02. SUPERESTRUCTURA">02. SUPERESTRUCTURA</option>
                  <option value="03. ALBAÑILERÍA">03. ALBAÑILERÍA</option>
                  <option value="04. INSTALACIONES">04. INSTALACIONES</option>
                  <option value="05. ACABADOS Y LIMPIEZA">05. ACABADOS Y LIMPIEZA</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Código de Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PLT-03, EXC-02"
                  value={newCodigo}
                  onChange={(e) => setNewCodigo(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Descripción Detallada</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Redacta las especificaciones técnicas..."
                  value={newDescripcion}
                  onChange={(e) => setNewDescripcion(e.target.value)}
                  className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Unidad</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. m3, m, kg, ton"
                    value={newUnidad}
                    onChange={(e) => setNewUnidad(e.target.value)}
                    className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cantidad Contratada</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newCantidad}
                    onChange={(e) => setNewCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 text-right font-mono"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded flex gap-2 text-amber-800 text-[11px] leading-relaxed">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  El nuevo concepto se registrará con Costo Directo en <strong>$0.00</strong>. Una vez creado, abre su <strong>APU Card</strong> para diseñar la tarjeta de insumos.
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-light-slate pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingConcept(false)}
                  className="px-3 py-1.5 text-xs border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-semibold shadow-sm"
                >
                  Crear Concepto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
