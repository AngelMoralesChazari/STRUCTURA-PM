import { useState, useEffect } from 'react';
import type { Usuario, Proyecto, Estimacion, ConceptoObra } from './types';
import { dbAdapter } from './db/dbAdapter';
import { Login } from './pages/Login';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { FasarTabulador } from './pages/FasarTabulador';
import { SobrecostoConfig } from './pages/SobrecostoConfig';
import { ConceptosCatalogo } from './pages/ConceptosCatalogo';
import { ProgramacionInsumos } from './pages/ProgramacionInsumos';
import { EstimacionesGeneradores } from './pages/EstimacionesGeneradores';
import { ReporteMaestro } from './pages/ReporteMaestro';
import { auth } from './firebase';

import { 
  Layers, 
  Hammer, 
  Percent, 
  FileSpreadsheet, 
  Calendar, 
  LogOut, 
  Plus, 
  FolderGit2, 
  MapPin, 
  Building2, 
  FolderOpen,
  User,
  ShieldCheck,
  TrendingUp,
  FileText
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [selectedProject, setSelectedProject] = useState<Proyecto | null>(null);
  const [estimaciones, setEstimaciones] = useState<Estimacion[]>([]);
  const [conceptos, setConceptos] = useState<ConceptoObra[]>([]);
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Project creation modal state
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjCodigo, setNewProjCodigo] = useState('');
  const [newProjNombre, setNewProjNombre] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjUbicacion, setNewProjUbicacion] = useState('');
  const [newProjContratista, setNewProjContratista] = useState('');
  const [newProjAnticipo, setNewProjAnticipo] = useState(30);
  const [newProjRetencion, setNewProjRetencion] = useState(5);
  const [newProjIva, setNewProjIva] = useState(16);
  const [newProjInicio, setNewProjInicio] = useState('');
  const [newProjFin, setNewProjFin] = useState('');

  // Sync database mode on user change
  useEffect(() => {
    if (user) {
      const isMock = user.uid.startsWith('u-');
      dbAdapter.setMode(isMock ? 'local' : 'firebase');
    }
  }, [user]);

  // Sync projects list
  useEffect(() => {
    const unsubscribe = dbAdapter.subscribeProyectos((data) => {
      setProyectos(data);
      // Keep selected project updated if it exists
      if (selectedProject) {
        const updated = data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedProject?.id, user]);

  // Sync project-specific sub-collections when a project is selected
  useEffect(() => {
    if (!selectedProject) {
      setEstimaciones([]);
      setConceptos([]);
      return;
    }

    const unsubscribeEst = dbAdapter.subscribeEstimaciones(selectedProject.id, (data) => {
      setEstimaciones(data);
    });

    const unsubscribeConcepts = dbAdapter.subscribeConceptos(selectedProject.id, (data) => {
      setConceptos(data);
    });

    return () => {
      unsubscribeEst();
      unsubscribeConcepts();
    };
  }, [selectedProject?.id, user]);

  const handleLogout = async () => {
    setUser(null);
    setSelectedProject(null);
    if (dbAdapter.getMode() === 'firebase' && auth) {
      try {
        await auth.signOut();
        console.log("Logged out of Firebase Auth successfully");
      } catch (err) {
        console.error("Error logging out of Firebase:", err);
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjCodigo || !newProjNombre) return;

    const newProj: Proyecto = {
      id: 'proj-' + Date.now(),
      codigo: newProjCodigo.toUpperCase(),
      nombre: newProjNombre,
      descripcion: newProjDesc,
      ubicacion: newProjUbicacion,
      contratista: newProjContratista,
      montoContratado: 0, // Calculated dynamically from concepts
      anticipoPorcentaje: Number(newProjAnticipo) || 0,
      amortizadoAcumulado: 0,
      retencionPorcentaje: Number(newProjRetencion) || 0,
      ivaPorcentaje: Number(newProjIva) || 0,
      fechaInicio: newProjInicio || new Date().toISOString().split('T')[0],
      fechaFin: newProjFin || new Date().toISOString().split('T')[0],
      estado: 'Ejecucion'
    };

    try {
      await dbAdapter.saveProyecto(newProj);
      setIsCreatingProject(false);
      // Reset form
      setNewProjCodigo('');
      setNewProjNombre('');
      setNewProjDesc('');
      setNewProjUbicacion('');
      setNewProjContratista('');
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  // If user is not logged in, render Login view
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  // If no project is selected, render Project Selector view
  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-technical-gray p-6 sm:p-10">
        <div className="max-w-6xl mx-auto space-y-8 animate-slide-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-light-slate pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-navy-slate-900 tracking-tight">STRUCTURA-PM</h1>
              <p className="text-sm text-slate-gray-600 mt-1">
                Structural Project & Cost Management — Panel General de Obras
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-light-slate text-xs shadow-sm">
                <User size={14} className="text-ocean-blue" />
                <span className="font-bold text-navy-slate-800">{user.nombre}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">{user.rol}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-white hover:bg-slate-50 border border-light-slate text-slate-600 rounded-lg shadow-sm transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Project List Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-bold text-navy-slate-900 flex items-center gap-2">
                <FolderOpen size={18} className="text-ocean-blue" />
                Listado de Obras Activas
              </h2>
              {user.rol !== 'Auditor' && (
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-bold text-xs shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  Nueva Obra
                </button>
              )}
            </div>

            {proyectos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {proyectos.map((p) => {
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white border border-light-slate rounded-xl p-6 shadow-sm hover:shadow-md hover:border-ocean-blue/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-ocean-blue bg-ocean-blue/10 px-2 py-0.5 rounded">
                              {p.codigo}
                            </span>
                            <h3 className="text-base font-bold text-navy-slate-900 mt-2">{p.nombre}</h3>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.estado === 'Finiquitado' 
                              ? 'bg-emerald-green/10 text-emerald-green' 
                              : p.estado === 'Ejecucion' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.estado}
                          </span>
                        </div>

                        <p className="text-xs text-slate-gray-600 line-clamp-2 leading-relaxed">{p.descripcion}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 font-medium text-slate-gray-700">
                          <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {p.ubicacion}</span>
                          <span className="flex items-center gap-1"><Building2 size={12} className="text-slate-400" /> {p.contratista}</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-light-slate flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Presupuesto Contratado</span>
                          <span className="text-sm font-bold font-mono text-navy-slate-900">{formatCurrency(p.montoContratado)}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProject(p);
                            setActiveTab('dashboard');
                          }}
                          className="px-4 py-2 bg-navy-slate-800 hover:bg-navy-slate-900 text-white rounded font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <FolderOpen size={14} />
                          Administrar Obra
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-60 bg-white border border-dashed border-light-slate rounded-xl flex flex-col items-center justify-center text-slate-400">
                <FolderGit2 size={36} className="mb-2 stroke-1" />
                <p className="text-sm font-medium">No se encontraron proyectos activos.</p>
                {user.rol !== 'Auditor' && (
                  <button
                    onClick={() => setIsCreatingProject(true)}
                    className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-light-slate text-slate-700 font-bold rounded text-xs transition-colors"
                  >
                    Registrar el primer proyecto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Project Modal */}
        {isCreatingProject && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-light-slate w-full max-w-lg p-6 animate-slide-in">
              <div className="flex justify-between items-center border-b border-light-slate pb-3 mb-4">
                <h3 className="text-sm font-bold text-navy-slate-900">Registrar Nueva Obra de Infraestructura</h3>
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Código de Obra</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. OP-012"
                      value={newProjCodigo}
                      onChange={(e) => setNewProjCodigo(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre Comercial de la Obra</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Reencarpetamiento Av. Juárez"
                      value={newProjNombre}
                      onChange={(e) => setNewProjNombre(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Descripción General / Alcance</label>
                  <textarea
                    rows={2}
                    placeholder="Describe los alcances y especificaciones del contrato..."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Empresa Contratista</label>
                    <input
                      type="text"
                      placeholder="Ej. Infraestructuras de Occidente S.A."
                      value={newProjContratista}
                      onChange={(e) => setNewProjContratista(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ubicación Física</label>
                    <input
                      type="text"
                      placeholder="Ej. Guadalajara, Jalisco"
                      value={newProjUbicacion}
                      onChange={(e) => setNewProjUbicacion(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Anticipo (%)</label>
                    <input
                      type="number"
                      required
                      value={newProjAnticipo}
                      onChange={(e) => setNewProjAnticipo(Number(e.target.value))}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Retención Garantía (%)</label>
                    <input
                      type="number"
                      required
                      value={newProjRetencion}
                      onChange={(e) => setNewProjRetencion(Number(e.target.value))}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">IVA (%)</label>
                    <input
                      type="number"
                      required
                      value={newProjIva}
                      onChange={(e) => setNewProjIva(Number(e.target.value))}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      required
                      value={newProjInicio}
                      onChange={(e) => setNewProjInicio(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Cierre</label>
                    <input
                      type="date"
                      required
                      value={newProjFin}
                      onChange={(e) => setNewProjFin(e.target.value)}
                      className="w-full border border-light-slate rounded p-2 focus:outline-none focus:border-ocean-blue bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-light-slate pt-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="px-3 py-1.5 border border-light-slate hover:bg-slate-50 text-slate-700 rounded font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded font-semibold shadow-sm"
                  >
                    Registrar Obra
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active view router
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ProjectDashboard 
            proyecto={selectedProject} 
            estimaciones={estimaciones} 
            conceptos={conceptos}
          />
        );
      case 'fasar':
        return <FasarTabulador proyecto={selectedProject} rol={user.rol} />;
      case 'sobrecosto':
        return <SobrecostoConfig proyecto={selectedProject} rol={user.rol} />;
      case 'apu':
        return <ConceptosCatalogo proyecto={selectedProject} rol={user.rol} />;
      case 'programacion':
        return <ProgramacionInsumos proyecto={selectedProject} rol={user.rol} />;
      case 'estimaciones':
        return <EstimacionesGeneradores proyecto={selectedProject} rol={user.rol} />;
      case 'reportes':
        return <ReporteMaestro proyecto={selectedProject} />;
      default:
        return <ProjectDashboard proyecto={selectedProject} estimaciones={estimaciones} conceptos={conceptos} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: <TrendingUp size={16} /> },
    { id: 'fasar', label: 'FASAR & Mano de Obra', icon: <Hammer size={16} /> },
    { id: 'sobrecosto', label: 'Análisis de Sobrecosto', icon: <Percent size={16} /> },
    { id: 'apu', label: 'Matriz APU & Catálogo', icon: <Layers size={16} /> },
    { id: 'programacion', label: 'Programación e Insumos', icon: <Calendar size={16} /> },
    { id: 'estimaciones', label: 'Estimaciones y Finiquito', icon: <FileSpreadsheet size={16} /> },
    { id: 'reportes', label: 'Reporte Maestro (Cierre)', icon: <FileText size={16} /> }
  ];

  return (
    <div className="min-h-screen flex bg-technical-gray text-navy-slate-900 font-sans">
      {/* 1. LEFT SIDEBAR (Navy Slate) */}
      <aside className="w-64 bg-navy-slate-900 text-white flex flex-col justify-between border-r border-slate-gray-700 shrink-0">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-gray-700 flex items-center gap-2">
            <Building2 size={24} className="text-ocean-blue stroke-[1.8]" />
            <div>
              <span className="font-extrabold text-sm tracking-tight block">STRUCTURA-PM</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold font-mono">Cost Management</span>
            </div>
          </div>

          {/* Project navigation switcher button */}
          <div className="px-4">
            <button
              onClick={() => setSelectedProject(null)}
              className="w-full flex items-center justify-between p-2.5 bg-navy-slate-800 hover:bg-navy-slate-800/80 border border-slate-gray-700 rounded-lg text-slate-200 text-xs font-semibold transition-colors group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FolderGit2 size={15} className="text-ocean-blue shrink-0" />
                <span className="truncate text-left" title={selectedProject.nombre}>{selectedProject.nombre}</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 group-hover:text-white shrink-0 ml-1">Cambiar</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                    isActive 
                      ? 'bg-ocean-blue text-white shadow-sm font-semibold' 
                      : 'text-slate-300 hover:bg-navy-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-gray-700 space-y-4">
          {/* User profile info */}
          <div className="flex items-center gap-2.5 bg-navy-slate-800/40 p-2.5 rounded-lg border border-slate-gray-800">
            <div className="w-7 h-7 rounded-full bg-ocean-blue/20 text-ocean-blue flex items-center justify-center border border-ocean-blue/30 text-xs font-bold font-mono">
              {user.nombre[0]}
            </div>
            <div className="overflow-hidden">
              <span className="block text-[10px] font-bold text-white truncate">{user.nombre}</span>
              <span className="inline-flex px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[8px] uppercase tracking-wider font-extrabold mt-0.5">
                {user.rol}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 hover:bg-red-950/40 border border-slate-gray-700 hover:border-red-900 rounded-lg text-slate-300 hover:text-red-300 text-xs font-bold transition-all"
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 2. RIGHT MAIN SHELL CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-light-slate px-6 flex justify-between items-center shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-light-slate">
              {selectedProject.codigo}
            </span>
            <span className="text-xs text-slate-gray-600 font-semibold truncate max-w-md hidden sm:inline" title={selectedProject.nombre}>
              {selectedProject.nombre}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-gray-500 bg-slate-50 py-1 px-2.5 rounded-full border border-light-slate">
              <ShieldCheck size={14} className="text-emerald-green" />
              <span>Rol:</span>
              <span className="font-bold text-navy-slate-900 uppercase text-[9px] bg-emerald-green/10 text-emerald-green px-1.5 py-0.2 rounded font-sans">
                {user.rol}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
