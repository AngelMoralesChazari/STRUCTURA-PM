import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type { 
  Proyecto, 
  CategoriaManoObra, 
  ConfiguracionSobrecosto, 
  ConceptoObra, 
  Estimacion, 
  Finiquito 
} from '../types';
import { 
  mockProyectos, 
  mockTabuladores, 
  mockSobrecostos, 
  mockConceptos, 
  mockEstimaciones, 
  mockFiniquitos 
} from './mockData';

// Simple pub-sub system for local storage simulation
type ListenerCallback = (data: any) => void;
const listeners: { [key: string]: Set<ListenerCallback> } = {};

const subscribeLocal = (key: string, callback: ListenerCallback) => {
  if (!listeners[key]) {
    listeners[key] = new Set();
  }
  listeners[key].add(callback);
  
  // Return unsubscribe function
  return () => {
    listeners[key].delete(callback);
  };
};

const notifyLocal = (key: string, data: any) => {
  if (listeners[key]) {
    listeners[key].forEach(callback => callback(data));
  }
};

// Initialize LocalStorage with Mock Data if empty
const initLocalData = () => {
  if (!localStorage.getItem('structura_proyectos')) {
    localStorage.setItem('structura_proyectos', JSON.stringify(mockProyectos));
  }
  if (!localStorage.getItem('structura_tabuladores')) {
    localStorage.setItem('structura_tabuladores', JSON.stringify(mockTabuladores));
  }
  if (!localStorage.getItem('structura_sobrecostos')) {
    localStorage.setItem('structura_sobrecostos', JSON.stringify(mockSobrecostos));
  }
  if (!localStorage.getItem('structura_conceptos')) {
    localStorage.setItem('structura_conceptos', JSON.stringify(mockConceptos));
  }
  if (!localStorage.getItem('structura_estimaciones')) {
    localStorage.setItem('structura_estimaciones', JSON.stringify(mockEstimaciones));
  }
  if (!localStorage.getItem('structura_finiquitos')) {
    localStorage.setItem('structura_finiquitos', JSON.stringify(mockFiniquitos));
  }
};

let currentMode: 'firebase' | 'local' = 'local';

export const dbAdapter = {
  setMode(mode: 'firebase' | 'local') {
    currentMode = mode;
    console.log(`dbAdapter switched to mode: ${mode}`);
    if (mode === 'local') {
      initLocalData();
    }
  },

  getMode() {
    return currentMode;
  },

  // === PROYECTOS ===
  subscribeProyectos(callback: (proyectos: Proyecto[]) => void): () => void {
    if (currentMode === 'firebase' && db) {
      const q = collection(db, 'proyectos');
      return onSnapshot(q, (snapshot) => {
        const proyectos: Proyecto[] = [];
        snapshot.forEach((doc) => {
          proyectos.push({ id: doc.id, ...doc.data() } as Proyecto);
        });
        callback(proyectos);
      }, (err) => {
        console.error("Firestore Projects subscribe error: ", err);
      });
    } else {
      // Local mode
      const getLocalProyectos = () => {
        const raw = localStorage.getItem('structura_proyectos');
        return raw ? JSON.parse(raw) : [];
      };
      
      callback(getLocalProyectos());
      return subscribeLocal('proyectos', callback);
    }
  },

  async saveProyecto(proyecto: Proyecto): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'proyectos', proyecto.id), proyecto);
    } else {
      const raw = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = raw ? JSON.parse(raw) : [];
      const index = proyectos.findIndex(p => p.id === proyecto.id);
      if (index >= 0) {
        proyectos[index] = proyecto;
      } else {
        proyectos.push(proyecto);
      }
      localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
      notifyLocal('proyectos', proyectos);
    }
  },

  // === TABULADOR MANO DE OBRA (FASAR) ===
  subscribeTabulador(proyectoId: string, callback: (data: CategoriaManoObra[]) => void): () => void {
    if (currentMode === 'firebase' && db) {
      const q = query(collection(db, 'tabuladores_mo'), where('proyectoId', '==', proyectoId));
      return onSnapshot(q, (snapshot) => {
        const list: CategoriaManoObra[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CategoriaManoObra);
        });
        callback(list);
      });
    } else {
      const getLocalTab = () => {
        const raw = localStorage.getItem('structura_tabuladores');
        const allTab = raw ? JSON.parse(raw) : {};
        return allTab[proyectoId] || [];
      };
      
      callback(getLocalTab());
      return subscribeLocal(`tabuladores_${proyectoId}`, callback);
    }
  },

  async saveCategoriaManoObra(categoria: CategoriaManoObra): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'tabuladores_mo', categoria.id), categoria);
    } else {
      const { proyectoId } = categoria;
      const raw = localStorage.getItem('structura_tabuladores');
      const allTab = raw ? JSON.parse(raw) : {};
      const list: CategoriaManoObra[] = allTab[proyectoId] || [];
      
      const index = list.findIndex(item => item.id === categoria.id);
      if (index >= 0) {
        list[index] = categoria;
      } else {
        list.push(categoria);
      }
      
      allTab[proyectoId] = list;
      localStorage.setItem('structura_tabuladores', JSON.stringify(allTab));
      notifyLocal(`tabuladores_${proyectoId}`, list);
    }
  },

  async deleteCategoriaManoObra(id: string, proyectoId: string): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await deleteDoc(doc(db, 'tabuladores_mo', id));
    } else {
      const raw = localStorage.getItem('structura_tabuladores');
      const allTab = raw ? JSON.parse(raw) : {};
      let list: CategoriaManoObra[] = allTab[proyectoId] || [];
      list = list.filter(item => item.id !== id);
      allTab[proyectoId] = list;
      localStorage.setItem('structura_tabuladores', JSON.stringify(allTab));
      notifyLocal(`tabuladores_${proyectoId}`, list);
    }
  },

  // === CONFIGURACION SOBRECOSTO ===
  async getSobrecosto(proyectoId: string): Promise<ConfiguracionSobrecosto> {
    if (currentMode === 'firebase' && db) {
      const snap = await getDoc(doc(db, 'configuracion_sobrecosto', proyectoId));
      if (snap.exists()) {
        return snap.data() as ConfiguracionSobrecosto;
      } else {
        // Return a default configuration if not found
        const def = {
          proyectoId,
          indirectosOficinaCentral: 5.0,
          indirectosOficinaCampo: 5.0,
          financiamiento: 1.0,
          utilidad: 8.0,
          cargosAdicionales: 0.5,
          factorSobrecostoTotal: 1.2057
        };
        await setDoc(doc(db, 'configuracion_sobrecosto', proyectoId), def);
        return def;
      }
    } else {
      const raw = localStorage.getItem('structura_sobrecostos');
      const allSobrecostos = raw ? JSON.parse(raw) : {};
      if (allSobrecostos[proyectoId]) {
        return allSobrecostos[proyectoId];
      }
      const def = {
        proyectoId,
        indirectosOficinaCentral: 5.0,
        indirectosOficinaCampo: 5.0,
        financiamiento: 1.0,
        utilidad: 8.0,
        cargosAdicionales: 0.5,
        factorSobrecostoTotal: 1.2057
      };
      allSobrecostos[proyectoId] = def;
      localStorage.setItem('structura_sobrecostos', JSON.stringify(allSobrecostos));
      return def;
    }
  },

  async saveSobrecosto(config: ConfiguracionSobrecosto): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'configuracion_sobrecosto', config.proyectoId), config);
    } else {
      const { proyectoId } = config;
      const raw = localStorage.getItem('structura_sobrecostos');
      const allSobrecostos = raw ? JSON.parse(raw) : {};
      allSobrecostos[proyectoId] = config;
      localStorage.setItem('structura_sobrecostos', JSON.stringify(allSobrecostos));
      
      // We also trigger update on concepts since price units changed because of sobrecosto
      const rawConcepts = localStorage.getItem('structura_conceptos');
      const allConcepts = rawConcepts ? JSON.parse(rawConcepts) : {};
      const list: ConceptoObra[] = allConcepts[proyectoId] || [];
      const updatedList = list.map(c => {
        const precioUnitario = Number((c.costoDirecto * config.factorSobrecostoTotal).toFixed(2));
        const importe = Number((c.cantidadPresupuestada * precioUnitario).toFixed(2));
        return { ...c, precioUnitario, importe };
      });
      allConcepts[proyectoId] = updatedList;
      localStorage.setItem('structura_conceptos', JSON.stringify(allConcepts));
      notifyLocal(`conceptos_${proyectoId}`, updatedList);
      
      // Update the projects total contracted amount
      const rawProj = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = rawProj ? JSON.parse(rawProj) : [];
      const pIdx = proyectos.findIndex(p => p.id === proyectoId);
      if (pIdx >= 0) {
        proyectos[pIdx].montoContratado = updatedList.reduce((sum, item) => sum + item.importe, 0);
        localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
        notifyLocal('proyectos', proyectos);
      }
    }
  },

  // === CONCEPTOS / APU ===
  subscribeConceptos(proyectoId: string, callback: (data: ConceptoObra[]) => void): () => void {
    if (currentMode === 'firebase' && db) {
      const q = collection(db, 'proyectos', proyectoId, 'conceptos');
      return onSnapshot(q, (snapshot) => {
        const list: ConceptoObra[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as ConceptoObra);
        });
        callback(list);
      });
    } else {
      const getLocalConcepts = () => {
        const raw = localStorage.getItem('structura_conceptos');
        const allConcepts = raw ? JSON.parse(raw) : {};
        return allConcepts[proyectoId] || [];
      };
      
      callback(getLocalConcepts());
      return subscribeLocal(`conceptos_${proyectoId}`, callback);
    }
  },

  async saveConcepto(proyectoId: string, concepto: ConceptoObra): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'proyectos', proyectoId, 'conceptos', concepto.id), concepto);
      
      // Update Project's total budget
      const q = collection(db, 'proyectos', proyectoId, 'conceptos');
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => {
        const c = doc.data() as ConceptoObra;
        if (c.id === concepto.id) {
          total += concepto.importe;
        } else {
          total += c.importe;
        }
      });
      const hasConcept = querySnapshot.docs.some(doc => doc.id === concepto.id);
      if (!hasConcept) {
        total += concepto.importe;
      }
      
      const projRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(projRef, { montoContratado: total });
    } else {
      const raw = localStorage.getItem('structura_conceptos');
      const allConcepts = raw ? JSON.parse(raw) : {};
      const list: ConceptoObra[] = allConcepts[proyectoId] || [];
      
      const index = list.findIndex(c => c.id === concepto.id);
      if (index >= 0) {
        list[index] = concepto;
      } else {
        list.push(concepto);
      }
      
      allConcepts[proyectoId] = list;
      localStorage.setItem('structura_conceptos', JSON.stringify(allConcepts));
      notifyLocal(`conceptos_${proyectoId}`, list);

      // Update project total
      const rawProj = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = rawProj ? JSON.parse(rawProj) : [];
      const pIdx = proyectos.findIndex(p => p.id === proyectoId);
      if (pIdx >= 0) {
        proyectos[pIdx].montoContratado = list.reduce((sum, item) => sum + item.importe, 0);
        localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
        notifyLocal('proyectos', proyectos);
      }
    }
  },

  async deleteConcepto(proyectoId: string, conceptoId: string): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await deleteDoc(doc(db, 'proyectos', proyectoId, 'conceptos', conceptoId));
    } else {
      const raw = localStorage.getItem('structura_conceptos');
      const allConcepts = raw ? JSON.parse(raw) : {};
      let list: ConceptoObra[] = allConcepts[proyectoId] || [];
      list = list.filter(c => c.id !== conceptoId);
      allConcepts[proyectoId] = list;
      localStorage.setItem('structura_conceptos', JSON.stringify(allConcepts));
      notifyLocal(`conceptos_${proyectoId}`, list);

      // Update project total
      const rawProj = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = rawProj ? JSON.parse(rawProj) : [];
      const pIdx = proyectos.findIndex(p => p.id === proyectoId);
      if (pIdx >= 0) {
        proyectos[pIdx].montoContratado = list.reduce((sum, item) => sum + item.importe, 0);
        localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
        notifyLocal('proyectos', proyectos);
      }
    }
  },

  // === ESTIMACIONES ===
  subscribeEstimaciones(proyectoId: string, callback: (data: Estimacion[]) => void): () => void {
    if (currentMode === 'firebase' && db) {
      const q = query(collection(db, 'estimaciones'), where('proyectoId', '==', proyectoId));
      return onSnapshot(q, (snapshot) => {
        const list: Estimacion[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Estimacion);
        });
        list.sort((a, b) => a.numeroEstimacion - b.numeroEstimacion);
        callback(list);
      });
    } else {
      const getLocalEstimations = () => {
        const raw = localStorage.getItem('structura_estimaciones');
        const allEst = raw ? JSON.parse(raw) : {};
        const list: Estimacion[] = allEst[proyectoId] || [];
        return list.sort((a, b) => a.numeroEstimacion - b.numeroEstimacion);
      };
      
      callback(getLocalEstimations());
      return subscribeLocal(`estimaciones_${proyectoId}`, callback);
    }
  },

  async saveEstimacion(estimacion: Estimacion): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'estimaciones', estimacion.id), estimacion);
      
      if (estimacion.estado === 'Aprobada') {
        const q = query(collection(db, 'estimaciones'), where('proyectoId', '==', estimacion.proyectoId), where('estado', '==', 'Aprobada'));
        const querySnapshot = await getDocs(q);
        let totalAmortizado = 0;
        querySnapshot.forEach((doc) => {
          const est = doc.data() as Estimacion;
          if (est.id === estimacion.id) {
            totalAmortizado += estimacion.amortizacionAnticipo;
          } else {
            totalAmortizado += est.amortizacionAnticipo;
          }
        });
        
        const hasEst = querySnapshot.docs.some(doc => doc.id === estimacion.id);
        if (!hasEst) {
          totalAmortizado += estimacion.amortizacionAnticipo;
        }

        const projRef = doc(db, 'proyectos', estimacion.proyectoId);
        await updateDoc(projRef, { amortizadoAcumulado: totalAmortizado });
      }
    } else {
      const { proyectoId } = estimacion;
      const raw = localStorage.getItem('structura_estimaciones');
      const allEst = raw ? JSON.parse(raw) : {};
      const list: Estimacion[] = allEst[proyectoId] || [];
      
      const index = list.findIndex(e => e.id === estimacion.id);
      if (index >= 0) {
        list[index] = estimacion;
      } else {
        list.push(estimacion);
      }
      
      allEst[proyectoId] = list;
      localStorage.setItem('structura_estimaciones', JSON.stringify(allEst));
      notifyLocal(`estimaciones_${proyectoId}`, list);

      // Update project amortizadoAcumulado if approved
      const approvedList = list.filter(e => e.estado === 'Aprobada');
      const totalAmortizado = approvedList.reduce((sum, item) => sum + item.amortizacionAnticipo, 0);

      const rawProj = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = rawProj ? JSON.parse(rawProj) : [];
      const pIdx = proyectos.findIndex(p => p.id === proyectoId);
      if (pIdx >= 0) {
        proyectos[pIdx].amortizadoAcumulado = totalAmortizado;
        localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
        notifyLocal('proyectos', proyectos);
      }
    }
  },

  // === FINIQUITO ===
  async getFiniquito(proyectoId: string): Promise<Finiquito | null> {
    if (currentMode === 'firebase' && db) {
      const snap = await getDoc(doc(db, 'finiquitos', proyectoId));
      return snap.exists() ? (snap.data() as Finiquito) : null;
    } else {
      const raw = localStorage.getItem('structura_finiquitos');
      const allFiniquitos = raw ? JSON.parse(raw) : {};
      return allFiniquitos[proyectoId] || null;
    }
  },

  async saveFiniquito(finiquito: Finiquito): Promise<void> {
    if (currentMode === 'firebase' && db) {
      await setDoc(doc(db, 'finiquitos', finiquito.proyectoId), finiquito);
      
      const projRef = doc(db, 'proyectos', finiquito.proyectoId);
      await updateDoc(projRef, { estado: 'Finiquitado' });
    } else {
      const { proyectoId } = finiquito;
      const raw = localStorage.getItem('structura_finiquitos');
      const allFiniquitos = raw ? JSON.parse(raw) : {};
      allFiniquitos[proyectoId] = finiquito;
      localStorage.setItem('structura_finiquitos', JSON.stringify(allFiniquitos));

      const rawProj = localStorage.getItem('structura_proyectos');
      const proyectos: Proyecto[] = rawProj ? JSON.parse(rawProj) : [];
      const pIdx = proyectos.findIndex(p => p.id === proyectoId);
      if (pIdx >= 0) {
        proyectos[pIdx].estado = 'Finiquitado';
        localStorage.setItem('structura_proyectos', JSON.stringify(proyectos));
        notifyLocal('proyectos', proyectos);
      }
    }
  }
};
