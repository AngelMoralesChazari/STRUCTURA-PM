import React from 'react';
import type { Proyecto, Estimacion, ConceptoObra } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Calendar, 
  MapPin, 
  Briefcase, 
  FileSpreadsheet, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface ProjectDashboardProps {
  proyecto: Proyecto;
  estimaciones: Estimacion[];
  conceptos: ConceptoObra[];
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
  proyecto, 
  estimaciones, 
  conceptos
}) => {
  // Calculations
  const totalContratado = proyecto.montoContratado;
  
  // Total Ejercido: Sum of approved estimations gross amounts (or subtotal or liquidation)
  // Let's use the gross amount (montoBruto) or liquidoAPagar depending on preference. 
  // Standard in cost engineering is to measure executed budget (montoBruto) against target contract amount.
  const approvedEstimaciones = estimaciones.filter(e => e.estado === 'Aprobada');
  const totalEjercido = approvedEstimaciones.reduce((sum, e) => sum + e.montoBruto, 0);
  
  const avanceFisico = totalContratado > 0 ? (totalEjercido / totalContratado) * 100 : 0;
  const saldoPorEjercer = totalContratado - totalEjercido;

  // Formatting helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  // Prepare S-Curve Data
  // Periods: gather all unique months from concept programacion and estimations
  const periodsSet = new Set<string>();
  conceptos.forEach(c => {
    if (c.programacion) {
      Object.keys(c.programacion).forEach(p => periodsSet.add(p));
    }
  });
  approvedEstimaciones.forEach(e => {
    const period = e.periodoFin.substring(0, 7); // "YYYY-MM"
    periodsSet.add(period);
  });

  const sortedPeriods = Array.from(periodsSet).sort();

  // Accumulate planned and actual
  let cumulativePlanned = 0;
  let cumulativeActual = 0;

  const chartData = sortedPeriods.map(period => {
    // Calculate planned in this period
    let periodPlanned = 0;
    conceptos.forEach(c => {
      if (c.programacion && c.programacion[period]) {
        // programmed quantity * price unit
        periodPlanned += c.programacion[period] * c.precioUnitario;
      }
    });

    // Calculate actual (approved estimations matching the month)
    let periodActual = 0;
    approvedEstimaciones.forEach(e => {
      if (e.periodoFin.startsWith(period)) {
        periodActual += e.montoBruto;
      }
    });

    cumulativePlanned += periodPlanned;
    
    // We only accumulate actual if we have estimations for/before this period
    // If the period is in the future relative to the last estimate, we don't plot actual (avoid dropping to horizontal line if not yet reported)
    const isFuturePeriod = new Date(period + "-28") > new Date();
    if (!isFuturePeriod || periodActual > 0) {
      cumulativeActual += periodActual;
    }

    return {
      name: period,
      "Planeado Acumulado": Number(cumulativePlanned.toFixed(2)),
      "Real Ejecutado Acumulado": isFuturePeriod && periodActual === 0 && cumulativeActual === 0 ? null : Number(cumulativeActual.toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ocean-blue/10 text-ocean-blue mb-2">
            <Sparkles size={12} /> {proyecto.codigo}
          </span>
          <h2 className="text-xl font-bold text-navy-slate-900 tracking-tight">{proyecto.nombre}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-gray-600">
            <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-gray-600" /> {proyecto.ubicacion}</span>
            <span className="flex items-center gap-1"><Briefcase size={14} className="text-slate-gray-600" /> {proyecto.contratista}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado del Proyecto</span>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
              proyecto.estado === 'Finiquitado' 
                ? 'bg-emerald-green/10 text-emerald-green border border-emerald-green/20' 
                : proyecto.estado === 'Ejecucion' 
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              {proyecto.estado === 'Licitacion' ? 'En Licitación' : proyecto.estado === 'Ejecucion' ? 'En Ejecución' : 'Finiquitado'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time KPIs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Contratado */}
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Contratado Total</p>
              <h3 className="text-xl font-bold text-navy-slate-900 mt-2 font-mono">{formatCurrency(totalContratado)}</h3>
            </div>
            <div className="p-2 bg-navy-slate-800/5 text-navy-slate-800 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-gray-600 flex items-center gap-1.5">
            <FileSpreadsheet size={14} />
            <span>Basado en Catálogo de Conceptos</span>
          </div>
        </div>

        {/* KPI 2: Ejercido */}
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monto Ejercido / Estimado</p>
              <h3 className="text-xl font-bold text-emerald-green mt-2 font-mono">{formatCurrency(totalEjercido)}</h3>
            </div>
            <div className="p-2 bg-emerald-green/10 text-emerald-green rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-gray-600 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-green" />
            <span>{approvedEstimaciones.length} Estimación(es) Aprobada(s)</span>
          </div>
        </div>

        {/* KPI 3: Avance Físico */}
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">% Avance Físico Financiero</p>
              <h3 className="text-xl font-bold text-ocean-blue mt-2 font-mono">{avanceFisico.toFixed(2)}%</h3>
            </div>
            <div className="p-2 bg-ocean-blue/10 text-ocean-blue rounded-lg">
              <Percent size={20} />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-ocean-blue h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(avanceFisico, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KPI 4: Saldo por Ejercer */}
        <div className="bg-white p-5 rounded-xl border border-light-slate shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo por Ejercer</p>
              <h3 className="text-xl font-bold text-slate-gray-600 mt-2 font-mono">{formatCurrency(saldoPorEjercer)}</h3>
            </div>
            <div className="p-2 bg-slate-100 text-slate-gray-600 rounded-lg">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-gray-600 flex items-center gap-1">
            <span>Período: {proyecto.fechaInicio} al {proyecto.fechaFin}</span>
          </div>
        </div>
      </div>

      {/* Chart: S-Curve */}
      <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm">
        <h3 className="text-md font-bold text-navy-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-ocean-blue" />
          Curva S: Programado vs. Real Ejecutado Acumulado
        </h3>
        
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis 
                  stroke="#64748b" 
                  style={{ fontSize: 11, fontFamily: 'monospace' }} 
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="Planeado Acumulado" 
                  stroke="#1e293b" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorPlanned)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Real Ejecutado Acumulado" 
                  stroke="#0284c7" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorActual)" 
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center border border-dashed border-light-slate rounded-lg text-slate-400">
            <Calendar size={36} className="mb-2 stroke-1" />
            <p className="text-sm">Configura la programación de conceptos para ver la Curva S.</p>
          </div>
        )}
      </div>

      {/* Recent Estimations & Advance info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-light-slate shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-navy-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-ocean-blue" />
              Historial de Estimaciones
            </h3>
          </div>

          {estimaciones.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-light-slate bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Est. N°</th>
                    <th className="py-2.5 px-3">Período</th>
                    <th className="py-2.5 px-3 text-right">Monto Bruto</th>
                    <th className="py-2.5 px-3 text-right">Amortización</th>
                    <th className="py-2.5 px-3 text-right">Retención</th>
                    <th className="py-2.5 px-3 text-right">Líquido a Pagar</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-slate font-mono">
                  {estimaciones.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-navy-slate-900">#{e.numeroEstimacion}</td>
                      <td className="py-3 px-3 text-slate-gray-600 font-sans">{e.periodoInicio} al {e.periodoFin}</td>
                      <td className="py-3 px-3 text-right text-navy-slate-900">{formatCurrency(e.montoBruto)}</td>
                      <td className="py-3 px-3 text-right text-red-600">-{formatCurrency(e.amortizacionAnticipo)}</td>
                      <td className="py-3 px-3 text-right text-slate-gray-600">-{formatCurrency(e.retencionGarantia)}</td>
                      <td className="py-3 px-3 text-right text-emerald-green font-bold">{formatCurrency(e.liquidoAPagar)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.estado === 'Aprobada' 
                            ? 'bg-emerald-green/10 text-emerald-green' 
                            : e.estado === 'Enviada' 
                              ? 'bg-blue-100 text-blue-700' 
                              : e.estado === 'Borrador' 
                                ? 'bg-slate-100 text-slate-600' 
                                : 'bg-red-100 text-red-700'
                        }`}>
                          {e.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-sm">
              No hay estimaciones registradas aún.
            </div>
          )}
        </div>

        {/* Project Financial Summary Block */}
        <div className="bg-navy-slate-900 text-white p-6 rounded-xl border border-slate-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold mb-4 border-b border-slate-700 pb-2">Estado de Cuenta de Obra</h3>
            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Monto Contratado:</span>
                <span className="font-bold">{formatCurrency(proyecto.montoContratado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Anticipo Otorgado ({proyecto.anticipoPorcentaje}%):</span>
                <span>{formatCurrency(proyecto.montoContratado * (proyecto.anticipoPorcentaje / 100))}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-emerald-400">
                <span>Avance Físico Real Ejecutado:</span>
                <span className="font-bold">{formatCurrency(totalEjercido)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Amortización Acumulada:</span>
                <span>-{formatCurrency(proyecto.amortizadoAcumulado)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Saldo por Amortizar:</span>
                <span>{formatCurrency((proyecto.montoContratado * (proyecto.anticipoPorcentaje / 100)) - proyecto.amortizadoAcumulado)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Plazo de Ejecución:</span>
            <span className="font-bold text-ocean-blue flex items-center gap-1">
              <Calendar size={14} />
              {Math.ceil((new Date(proyecto.fechaFin).getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 3600 * 24))} días
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
