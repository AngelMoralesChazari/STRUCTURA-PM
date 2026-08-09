import React, { useState, useEffect } from 'react';
import type { ConfiguracionSobrecosto, Proyecto } from '../types';
import { dbAdapter } from '../db/dbAdapter';
import { Save, Percent, TrendingUp } from 'lucide-react';

interface SobrecostoConfigProps {
  proyecto: Proyecto;
  rol: string;
}

export const SobrecostoConfig: React.FC<SobrecostoConfigProps> = ({ proyecto, rol }) => {
  const [config, setConfig] = useState<ConfiguracionSobrecosto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await dbAdapter.getSobrecosto(proyecto.id);
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [proyecto.id]);

  const handleInputChange = (field: keyof ConfiguracionSobrecosto, value: number) => {
    if (!config) return;
    
    const updated = {
      ...config,
      [field]: value
    };

    // Recalculate Factor de Sobrecosto Total
    // Formula: (1 + %Ind) * (1 + %Fin) * (1 + %Util) * (1 + %CargosAdic)
    // where %Ind = %IndirectosCentral + %IndirectosCampo
    const ind = (updated.indirectosOficinaCentral + updated.indirectosOficinaCampo) / 100;
    const fin = updated.financiamiento / 100;
    const uti = updated.utilidad / 100;
    const add = updated.cargosAdicionales / 100;

    const factor = (1 + ind) * (1 + fin) * (1 + uti) * (1 + add);
    updated.factorSobrecostoTotal = Number(factor.toFixed(4));

    setConfig(updated);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      await dbAdapter.saveSobrecosto(config);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = rol === 'Auditor';

  if (loading) {
    return (
      <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
        Cargando configuración de sobrecosto...
      </div>
    );
  }

  if (!config) return null;

  const totalIndirectoPct = config.indirectosOficinaCentral + config.indirectosOficinaCampo;
  
  // Mathematical step-by-step display
  const baseCost = 1.0000;
  const withIndirects = baseCost * (1 + totalIndirectoPct / 100);
  const withFinance = withIndirects * (1 + config.financiamiento / 100);
  const withUtility = withFinance * (1 + config.utilidad / 100);
  const finalFactor = withUtility * (1 + config.cargosAdicionales / 100);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm">
        <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">MÓDULO 2: Análisis de Indirectos, Financiamiento y Utilidad (Sobrecosto)</h2>
        <p className="text-xs text-slate-gray-600 mt-1">
          Configuración de coeficientes aplicables a los Costos Directos para determinar el precio de venta unitario integrado de cada concepto de obra.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Inputs Card */}
        <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-navy-slate-900 border-b border-light-slate pb-2 flex items-center gap-1.5">
              <Percent size={16} className="text-ocean-blue" />
              Porcentajes del Sobrecosto
            </h3>

            {/* Central Office Indirects */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-gray-700 flex items-center gap-1">
                  Indirecto Oficina Central
                  <span className="text-[10px] text-slate-400 font-normal">(%IndC)</span>
                </span>
                <span className="font-mono text-navy-slate-900">{config.indirectosOficinaCentral}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                disabled={isReadOnly}
                value={config.indirectosOficinaCentral}
                onChange={(e) => handleInputChange('indirectosOficinaCentral', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-ocean-blue"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Sueldos del personal directivo en oficina central, renta, etc.</p>
            </div>

            {/* Field Office Indirects */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-gray-700 flex items-center gap-1">
                  Indirecto Oficina Campo
                  <span className="text-[10px] text-slate-400 font-normal">(%IndO)</span>
                </span>
                <span className="font-mono text-navy-slate-900">{config.indirectosOficinaCampo}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                disabled={isReadOnly}
                value={config.indirectosOficinaCampo}
                onChange={(e) => handleInputChange('indirectosOficinaCampo', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-ocean-blue"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Bodegas de obra, residencias temporales, ingenieros de campo, etc.</p>
            </div>

            {/* Financiamiento */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-gray-700 flex items-center gap-1">
                  Costo por Financiamiento
                  <span className="text-[10px] text-slate-400 font-normal">(%Fin)</span>
                </span>
                <span className="font-mono text-navy-slate-900">{config.financiamiento}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.05"
                disabled={isReadOnly}
                value={config.financiamiento}
                onChange={(e) => handleInputChange('financiamiento', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-ocean-blue"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Costo de capital por retraso entre cobros de estimaciones y compras.</p>
            </div>

            {/* Utilidad */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-gray-700 flex items-center gap-1">
                  Utilidad Deseada
                  <span className="text-[10px] text-slate-400 font-normal">(%Util)</span>
                </span>
                <span className="font-mono text-navy-slate-900">{config.utilidad}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                disabled={isReadOnly}
                value={config.utilidad}
                onChange={(e) => handleInputChange('utilidad', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-ocean-blue"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Margen de ganancia neto estipulado por la empresa.</p>
            </div>

            {/* Cargos Adicionales */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-gray-700 flex items-center gap-1">
                  Cargos Adicionales
                  <span className="text-[10px] text-slate-400 font-normal">(%Cargos)</span>
                </span>
                <span className="font-mono text-navy-slate-900">{config.cargosAdicionales}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                disabled={isReadOnly}
                value={config.cargosAdicionales}
                onChange={(e) => handleInputChange('cargosAdicionales', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-ocean-blue"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Cargos obligatorios de Ley (ej. 5 al millar para supervisión).</p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-light-slate">
            {!isReadOnly ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-ocean-blue hover:bg-ocean-blue/90 text-white font-semibold text-xs py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Aplicar y Guardar Factor'}
                </button>
                {savedMessage && (
                  <span className="text-[10px] text-emerald-green text-center font-bold animate-pulse">
                    ¡Configuración guardada y precios unitarios actualizados!
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 block text-center">
                Rol actual de solo lectura. No es posible editar la configuración.
              </span>
            )}
          </div>
        </div>

        {/* Right Output details Card */}
        <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy-slate-900 border-b border-light-slate pb-2 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-ocean-blue" />
              Estructura Matemática y Cascada de Integración
            </h3>

            <div className="mt-6 space-y-4">
              {/* Step 1 */}
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-light-slate rounded">
                <div>
                  <span className="font-bold text-slate-gray-700">Paso 1: Costo Directo Base (CD)</span>
                  <p className="text-[10px] text-slate-400">Punto de partida acumulado de Insumos (Materiales, Mano de Obra, Equipo)</p>
                </div>
                <span className="font-mono font-bold text-navy-slate-900">{baseCost.toFixed(4)}</span>
              </div>

              {/* Step 2 */}
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-light-slate rounded">
                <div>
                  <span className="font-bold text-slate-gray-700">Paso 2: Con Costo Indirecto (+{totalIndirectoPct}%)</span>
                  <p className="text-[10px] text-slate-400">Formula: $CD \times (1 + \%Ind)$</p>
                </div>
                <span className="font-mono font-bold text-navy-slate-900">{withIndirects.toFixed(4)}</span>
              </div>

              {/* Step 3 */}
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-light-slate rounded">
                <div>
                  <span className="font-bold text-slate-gray-700">Paso 3: Con Costo por Financiamiento (+{config.financiamiento}%)</span>
                  <p className="text-[10px] text-slate-400">Formula: $Paso 2 \times (1 + \%Fin)$</p>
                </div>
                <span className="font-mono font-bold text-navy-slate-900">{withFinance.toFixed(4)}</span>
              </div>

              {/* Step 4 */}
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-light-slate rounded">
                <div>
                  <span className="font-bold text-slate-gray-700">Paso 4: Con Margen de Utilidad (+{config.utilidad}%)</span>
                  <p className="text-[10px] text-slate-400">Formula: $Paso 3 \times (1 + \%Util)$</p>
                </div>
                <span className="font-mono font-bold text-navy-slate-900">{withUtility.toFixed(4)}</span>
              </div>

              {/* Step 5 */}
              <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-light-slate rounded">
                <div>
                  <span className="font-bold text-slate-gray-700">Paso 5: Con Cargos Adicionales (+{config.cargosAdicionales}%)</span>
                  <p className="text-[10px] text-slate-400">Formula: $Paso 4 \times (1 + \%Cargos)$</p>
                </div>
                <span className="font-mono font-bold text-navy-slate-900">{finalFactor.toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-navy-slate-900 text-white p-5 rounded-xl border border-slate-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">FACTOR DE SOBRECOSTO TOTAL (FST)</span>
              <p className="text-[11px] text-slate-300 mt-1 max-w-[280px]">
                Todos los precios directos de tus conceptos serán multiplicados por este factor.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold font-mono text-ocean-blue block">
                {config.factorSobrecostoTotal.toFixed(4)}
              </span>
              <span className="text-[10px] text-slate-400">
                Factor multiplicador
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
