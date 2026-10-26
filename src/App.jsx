import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";

function getTodayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const generarClientes=()=>Array.from({length:15},(_,i)=>({
  nombre:`Cliente ${i+1}`,
  deuda:0,
  kg:0,
  hoy:0,
  ayer:0,
  precio:24,
  pagadoHoy:0,
  devHoy:0
}));

const generarEmpleados=()=>Array.from({length:5},(_,i)=>({
  nombre:`Empleado ${i+1}`,
  sueldo:200,
  activo:true
}));

function timestampLocal(){
  const d=new Date();
  return {fecha:getTodayKey(),hora:d.toLocaleTimeString('es-MX',{hour12:false}),fechaHora:d.toISOString()};
}
const STORAGE_KEY = 'tortilleria_app';
const makeId=()=>`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const num=v=>Number(v||0);
const sameClient=(m,c,i)=>m.clienteId!=null ? m.clienteId===i : m.cliente===c.nombre;
function applyMovement(client,m,sign){
  const value=num(m.importe), kg=num(m.kg);
  return {...client,
    deuda:num(client.deuda)+sign*(m.tipo==='Entrega'?value:-value),
    hoy:num(client.hoy)+(m.tipo==='Entrega'?sign*kg:0),
    kg:num(client.kg)+(m.tipo==='Entrega'?sign*kg:0),
    pagadoHoy:num(client.pagadoHoy)+(m.tipo==='Cobranza'?sign*value:0),
    devHoy:num(client.devHoy)+(m.tipo==='Devolución'?sign*kg:0)
  };
}

function readSaved(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch(e){ console.error('No se pudo leer el respaldo local',e); return null; }
}
function rollover(data, today){
  if (!data) return null;
  const oldDay = data.dayKey || today; // Datos anteriores sin fecha: no asumir que son de ayer.
  if (oldDay >= today) return {...data, dayKey:oldDay};
  const archive = {...(data.archive || {})};
  archive[oldDay] = {
    fecha:oldDay, clientes:data.clientes || [], totalPesos:data.totalPesos || 0,
    historialVentas:data.historialVentas || [], gastosDiarios:data.gastosDiarios || 0,
    historialGastos:data.historialGastos || [], bultos:data.bultos || 0,
    kgRecuperados:data.kgRecuperados || 0, mermaKg:data.mermaKg || 0,
    empleados:data.empleados || [], precioKg:data.precioKg, precioHarina:data.precioHarina,
    precioGas:data.precioGas, gasPorBulto:data.gasPorBulto, rendimiento:data.rendimiento
  };
  return {...data, archive, dayKey:today,
    clientes:(data.clientes || generarClientes()).map(c=>({
      ...c, ayer:Number(c.hoy || 0), hoy:0, pagadoHoy:0, devHoy:0
    })), totalPesos:0, historialVentas:[], gastosDiarios:0,
    historialGastos:[], bultos:0, kgRecuperados:0, mermaKg:0};
}
const initialData = rollover(readSaved(),getTodayKey());
if(initialData) localStorage.setItem(STORAGE_KEY,JSON.stringify(initialData));

export default function App(){
//Estados
  const [tab,setTab]=useState('inicio');
  const [buscarExpendio,setBuscarExpendio]=useState('');
  const [precioKg,setPrecioKg]=useState(24);

  const [clientes,setClientes]=useState(generarClientes());
  const [empleados,setEmpleados]=useState(generarEmpleados());
  const [repartidores,setRepartidores]=useState(initialData?.repartidores || []);
  const [nuevoRepartidor,setNuevoRepartidor]=useState('');
  const [repartidorElegido,setRepartidorElegido]=useState('');
  const [nombreRepartidor,setNombreRepartidor]=useState('');
  const [filtroHistorialRepartidor,setFiltroHistorialRepartidor]=useState('todos');
  const [responsableEdicion,setResponsableEdicion]=useState('');
  const nombreResponsable=id=>repartidores.find(r=>r.id===id)?.nombre || (id?'Repartidor eliminado':'Sin asignar');
  const disponibles=repartidores.filter(r=>r.activo!==false);
  const opcionesRepartidores=<><option value="">Sin asignar / General</option>{disponibles.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</>;


  const [temp,setTemp]=useState({});

  const [ventaKg,setVentaKg]=useState('');
  const [ventaPesos,setVentaPesos]=useState('');
  const [totalPesos,setTotalPesos]=useState(0);
  const [historialVentas,setHistorialVentas]=useState([]);
  const [movimientosReparto,setMovimientosReparto]=useState(initialData?.movimientosReparto || []);
  const [fechaHistorial,setFechaHistorial]=useState(getTodayKey());
  const [tipoHistorial,setTipoHistorial]=useState('ventas');
  const [nuevoHistorico,setNuevoHistorico]=useState(null);
  const [editor,setEditor]=useState(null);
  const [editTipo,setEditTipo]=useState('Entrega');
  const [editValor,setEditValor]=useState('');
  const [audit,setAudit]=useState(initialData?.audit || []);

  const [movimientosProduccion,setMovimientosProduccion]=useState(initialData?.movimientosProduccion || []);
  const [editorProduccion,setEditorProduccion]=useState(null);
  const [valorProduccion,setValorProduccion]=useState('');
  const [editorResumenProduccion,setEditorResumenProduccion]=useState(null);
  const [bultos,setBultos]=useState(0);
  const [inputBultos,setInputBultos]=useState('');

  const [rendimiento,setRendimiento]=useState(38);

  const [precioHarina,setPrecioHarina]=useState(335);
  const [precioGas,setPrecioGas]=useState(11);
  const [gasPorBulto,setGasPorBulto]=useState(7);

  const [gastosDiarios,setGastosDiarios]=useState(0);
  const [kgRecuperados,setKgRecuperados]=useState(0);
  const [inputKgRec,setInputKgRec]=useState('');
  const [mermaKg,setMermaKg]=useState(0);
  const [inputMerma,setInputMerma]=useState('');
  const [historialGastos,setHistorialGastos]=useState([]);
  const [inputGastos,setInputGastos]=useState('');

  const [selectedCliente,setSelectedCliente]=useState(0);
  const [nuevoPrecio,setNuevoPrecio]=useState('');

  const [nuevoCliente,setNuevoCliente]=useState('');
  const [nuevoNombreCliente,setNuevoNombreCliente]=useState('');

  const [selectedEmpleado,setSelectedEmpleado]=useState(0);
  const [nuevoSueldo,setNuevoSueldo]=useState('');

  const [fechaReporte,setFechaReporte]=useState(getTodayKey());
  const [dayKey,setDayKey]=useState(getTodayKey());

  const [ready,setReady]=useState(false);
  const [archive,setArchive]=useState(initialData?.archive || {});
  const currentRef=useRef(null);

  // Carga inicial: no sobrescribir el almacenamiento antes de recuperar los datos.
  useEffect(()=>{
    const s=initialData;
    if(s){
      if(s.clientes) setClientes(s.clientes);
      if(s.empleados) setEmpleados(s.empleados);
      if(s.repartidores) setRepartidores(s.repartidores);
      setTotalPesos(s.totalPesos ?? 0);
      setHistorialVentas(s.historialVentas || []);
      setMovimientosReparto(s.movimientosReparto || []);
      setAudit(s.audit || []);
      setGastosDiarios(s.gastosDiarios ?? 0);
      setHistorialGastos(s.historialGastos || []);
      setBultos(s.bultos ?? 0);
      setMovimientosProduccion(s.movimientosProduccion || []);
      setPrecioKg(s.precioKg ?? 24);
      setPrecioHarina(s.precioHarina ?? 335);
      setPrecioGas(s.precioGas ?? 11);
      setGasPorBulto(s.gasPorBulto ?? 7);
      setKgRecuperados(s.kgRecuperados ?? 0);
      setMermaKg(s.mermaKg ?? 0);
      setRendimiento(s.rendimiento ?? 38);
      setDayKey(s.dayKey || getTodayKey());
    }
    setReady(true);
  },[]);

  const stateData={clientes,empleados,repartidores,totalPesos,historialVentas,movimientosReparto,audit,gastosDiarios,
    historialGastos,bultos,movimientosProduccion,precioKg,precioHarina,precioGas,gasPorBulto,
    kgRecuperados,mermaKg,rendimiento,dayKey,archive};
  currentRef.current=stateData;

  useEffect(()=>{
    if(!ready) return;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(stateData));
  },[ready,clientes,empleados,repartidores,totalPesos,historialVentas,movimientosReparto,audit,gastosDiarios,
    historialGastos,bultos,movimientosProduccion,precioKg,precioHarina,precioGas,gasPorBulto,
    kgRecuperados,mermaKg,rendimiento,dayKey,archive,audit]);

  useEffect(()=>{
    if(!ready) return;
    const checkDay=()=>{
      const today=getTodayKey();
      const s=currentRef.current;
      if(!s || today<=s.dayKey) return;
      const updated=rollover(s,today);
      // Persistir el cierre antes de aplicar los cambios de interfaz.
      localStorage.setItem(STORAGE_KEY,JSON.stringify(updated));
      setArchive(updated.archive);
      setClientes(updated.clientes);
      setHistorialVentas([]); setTotalPesos(0);
      setGastosDiarios(0); setHistorialGastos([]);
      setBultos(0); setKgRecuperados(0); setMermaKg(0);
      setDayKey(today);
    };
    const onVisible=()=>{if(document.visibilityState==='visible') checkDay();};
    window.addEventListener('focus',checkDay);
    document.addEventListener('visibilitychange',onVisible);
    const timer=setInterval(checkDay,30000);
    checkDay();
    return ()=>{clearInterval(timer);window.removeEventListener('focus',checkDay);
      document.removeEventListener('visibilitychange',onVisible);};
  },[ready]);

  const registrarVenta=()=>{
    if(!ventaKg && !ventaPesos) return;
    const pesos=Number(ventaPesos||0);
    const kg=Number(ventaKg||0);
    if(pesos===0 && kg===0) return;

    setTotalPesos(p=>p+pesos);
    setHistorialVentas(prev=>[...prev,{id:makeId(),kg,pesos,...timestampLocal()}]);

    setVentaKg('');
    setVentaPesos('');
  }

  const abrirHistorico=()=>setNuevoHistorico({fecha:fechaHistorial,clase:tipoHistorial,
    clienteId:'0',tipo:'Entrega',kg:'',pesos:'',repartidorId:'',hora:new Date().toLocaleTimeString('es-MX',{hour12:false})});
  const guardarHistorico=()=>{
    const h=nuevoHistorico;
    if(!h)return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(h.fecha) || h.fecha>dayKey || h.fecha<'2000-01-01'){
      alert('Selecciona una fecha válida, igual o anterior a hoy.');return;
    }
    if(h.fecha!==dayKey && !archive[h.fecha]){
      alert('No hay un cierre guardado para esa fecha. No se puede reconstruir un día sin datos previos.');return;
    }
    if(!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(h.hora)){
      alert('Escribe una hora válida (HH:MM).');return;
    }
    const kg=Number(h.kg),pesos=Number(h.pesos);
    const sello={fecha:h.fecha,hora:h.hora,fechaHora:new Date().toISOString(),
      registradoPosteriormente:true,registradoEn:new Date().toISOString(),id:makeId()};
    if(h.clase==='ventas'){
      if(!Number.isFinite(kg)||kg<=0||!Number.isFinite(pesos)||pesos<=0){alert('Ingresa kilos e importe mayores que cero.');return;}
      const mov={...sello,kg,pesos};
      if(h.fecha===dayKey){setHistorialVentas(prev=>[...prev,mov]);setTotalPesos(prev=>num(prev)+pesos);}
      else setArchive(prev=>({...prev,[h.fecha]:{...prev[h.fecha],
        historialVentas:[...(prev[h.fecha].historialVentas||[]),mov],totalPesos:num(prev[h.fecha].totalPesos)+pesos}}));
      setAudit(prev=>[...prev,{accion:'Agregar movimiento histórico',clase:'venta',nuevo:mov,fechaHora:sello.registradoEn}]);
    }else{
      const idx=Number(h.clienteId),c=clientes[idx];
      if(!c){alert('Selecciona un expendio válido.');return;}
      const cobranza=h.tipo==='Cobranza';
      const valor=cobranza?pesos:kg;
      if(!Number.isFinite(valor)||valor<=0){alert('Ingresa una cantidad mayor que cero.');return;}
      const precio=(h.fecha===dayKey?c.precio:(archive[h.fecha]?.clientes?.[idx]?.precio ?? c.precio));
      if(!Number.isFinite(Number(precio))||Number(precio)<0){alert('Precio de cliente inválido.');return;}
      if(disponibles.length && !h.repartidorId){alert('Selecciona un repartidor.');return;}
      const responsable=repartidores.find(r=>r.id===h.repartidorId);
      const entregaFecha=new Date(h.fecha+'T12:00:00');entregaFecha.setDate(entregaFecha.getDate()-1);
      const fechaEntrega=`${entregaFecha.getFullYear()}-${String(entregaFecha.getMonth()+1).padStart(2,'0')}-${String(entregaFecha.getDate()).padStart(2,'0')}`;
      const mov={...sello,clienteId:idx,cliente:c.nombre,tipo:h.tipo,
        repartidorId:h.repartidorId,repartidorNombre:responsable?.nombre||'Sin asignar',
        kg:cobranza?undefined:kg,importe:cobranza?pesos:Math.round(kg*Number(precio)*100)/100,
        fechaEntrega:h.tipo==='Devolución'?fechaEntrega:undefined};
      setMovimientosReparto(prev=>[...prev,mov]);
      setClientes(prev=>prev.map((cl,i)=>{
        if(i!==idx)return cl;
        const changed=applyMovement(cl,mov,1);
        if(h.fecha===dayKey)return changed;
        return {...cl,deuda:changed.deuda,kg:changed.kg,
          ayer:h.fecha===(()=>{const d=new Date(dayKey+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})() && h.tipo==='Entrega'?num(cl.ayer)+kg:cl.ayer};
      }));
      if(h.fecha!==dayKey)setArchive(prev=>{
        const next={...prev};
        Object.keys(next).filter(d=>d>=h.fecha).forEach(d=>{
          const snap=next[d];
          next[d]={...snap,clientes:(snap.clientes||[]).map((cl,i)=>{
            if(i!==idx)return cl;
            const changed=applyMovement(cl,mov,1);
            return d===h.fecha?changed:{...cl,deuda:changed.deuda,kg:changed.kg};
          })};
        });
        return next;
      });
      setAudit(prev=>[...prev,{accion:'Agregar movimiento histórico',clase:'reparto',nuevo:mov,fechaHora:sello.registradoEn}]);
    }
    setNuevoHistorico(null);
  };

  const openEditor=(kind,m,index,fecha)=>{
    setEditor({kind,original:m,index,fecha});
    setEditTipo(m.tipo || 'Venta');
    setResponsableEdicion(m.repartidorId || '');
    setEditValor(String(kind==='venta'?num(m.kg):m.tipo==='Cobranza'?num(m.importe):num(m.kg)));
  };
  const commitEdit=(remove=false)=>{
    if(!editor) return;
    const {kind,original,index,fecha}=editor;
    if(!remove && (!editValor.trim() || !Number.isFinite(Number(editValor)) || Number(editValor)<=0)){
      alert('Escribe una cantidad válida mayor que cero.');return;
    }
    const oldDay=fecha!==dayKey;
    const source=kind==='venta' ? (oldDay?archive[fecha]?.historialVentas:historialVentas) : movimientosReparto;
    if(!source || source[index]!==original){alert('El movimiento cambió. Vuelve a seleccionarlo.');setEditor(null);return;}
    if(kind==='reparto' && !clientes.some((c,i)=>sameClient(original,c,i))){
      alert('No se encontró la tienda original. No se modificó ningún saldo.');return;
    }
    if(remove && !window.confirm('¿Eliminar este movimiento? Se actualizarán los totales y la deuda.'))return;
    const amount=Number(editValor);
    let replacement=null;
    if(!remove){
      if(kind==='venta'){
        const originalPrice=num(original.kg)>0?num(original.pesos)/num(original.kg):num(precioKg);
        replacement={...original,kg:amount,pesos:Math.round(amount*originalPrice*100)/100};
      }else{
        const price=['Entrega','Devolución'].includes(original.tipo)&&num(original.kg)>0
          ? num(original.importe)/num(original.kg)
          : (clientes.find((c,i)=>sameClient(original,c,i))?.precio || precioKg);
        replacement={...original,repartidorId:responsableEdicion,tipo:editTipo,kg:editTipo==='Cobranza'?undefined:amount,
          importe:editTipo==='Cobranza'?amount:Math.round(amount*price*100)/100,
          fechaEntrega:editTipo==='Devolución'?(original.fechaEntrega || (()=>{const d=new Date(fecha+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})()):undefined};
      }
    }
    if(kind==='venta'){
      const next=source.filter((_,i)=>i!==index);
      if(replacement)next.splice(index,0,replacement);
      const total=next.reduce((a,v)=>a+num(v.pesos),0);
      if(oldDay)setArchive(prev=>({...prev,[fecha]:{...prev[fecha],historialVentas:next,totalPesos:total}}));
      else {setHistorialVentas(next);setTotalPesos(total);}
    }else{
      const next=source.filter((_,i)=>i!==index);
      if(replacement)next.splice(index,0,replacement);
      setMovimientosReparto(next);
      setClientes(prev=>prev.map((c,i)=>{
        if(!sameClient(original,c,i))return c;
        const change=applyMovement(applyMovement(c,original,-1),replacement || {tipo:'Cobranza',importe:0},replacement?1:0);
        return oldDay ? {...c,deuda:change.deuda,kg:change.kg,pagadoHoy:c.pagadoHoy,devHoy:c.devHoy,hoy:c.hoy} : change;
      }));
      if(oldDay){
        setArchive(prev=>{
          const snapshot=prev[fecha];
          if(!snapshot)return prev;
          const result={...prev};
          Object.keys(result).filter(d=>d>=fecha).forEach(d=>{
            const snap=result[d];
            result[d]={...snap,clientes:(snap.clientes||[]).map((c,i)=>{
              if(!sameClient(original,c,i))return c;
              const change=applyMovement(applyMovement(c,original,-1),replacement || {tipo:'Cobranza',importe:0},replacement?1:0);
              return d===fecha?change:{...c,deuda:change.deuda,kg:change.kg};
            })};
          });
          return result;
        });
      }
      // Si la entrega editada fue la de ayer, actualizar también el indicador «Kg ayer».
      if(fecha===(()=>{const d=new Date(dayKey+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})()){
        setClientes(prev=>prev.map((c,i)=>sameClient(original,c,i)?{...c,ayer:num(c.ayer)+(replacement?.tipo==='Entrega'?num(replacement.kg):0)-(original.tipo==='Entrega'?num(original.kg):0)}:c));
      }
    }
    setAudit(prev=>[...prev,{fechaHora:new Date().toISOString(),accion:remove?'Eliminar':'Editar',clase:kind,anterior:original,nuevo:replacement}]);
    setEditor(null);
  };

  const corregirProduccion=(eliminar=false)=>{
    if(!editorProduccion)return;
    const {mov,index}=editorProduccion;
    if(movimientosProduccion[index]!==mov){alert('El registro cambió. Selecciónalo nuevamente.');setEditorProduccion(null);return;}
    const valor=Number(valorProduccion);
    if(!eliminar && (valorProduccion.trim()==='' || !Number.isFinite(valor) || valor<0)){
      alert('Ingresa una cantidad válida, igual o mayor a cero.');return;
    }
    if(eliminar && !window.confirm('¿Eliminar este registro de producción? Se actualizarán los totales.'))return;
    const diferencia=(eliminar?0:valor)-num(mov.cantidad);
    const reemplazados=movimientosProduccion.flatMap((m,i)=>i!==index?[m]:eliminar?[]:[{...m,cantidad:valor,editadoEn:new Date().toISOString()}]);
    const setters={Bultos:setBultos,Merma:setMermaKg,Recuperados:setKgRecuperados};
    const campo={Bultos:'bultos',Merma:'mermaKg',Recuperados:'kgRecuperados'}[mov.tipo];
    if(!campo){alert('Tipo de registro desconocido.');return;}
    const fecha=mov.fecha;
    if(fecha===dayKey){
      if(mov.tipo!=='Bultos'){
        const ultimo=reemplazados.filter(m=>m.fecha===fecha&&m.tipo===mov.tipo).at(-1);
        setters[mov.tipo](ultimo?num(ultimo.cantidad):0);
      }else{
      const actuales={bultos,mermaKg,kgRecuperados};
      if(num(actuales[campo])+diferencia < -0.00001){alert('La corrección dejaría un total negativo.');return;}
      setters[mov.tipo](prev=>Math.max(0,num(prev)+diferencia));
      }
    }else{
      const snap=archive[fecha];
      if(!snap){alert('No existe el cierre guardado de esta fecha.');return;}
      const nuevoTotal=mov.tipo==='Bultos' ? num(snap[campo])+diferencia : (reemplazados.filter(m=>m.fecha===fecha&&m.tipo===mov.tipo).at(-1)?.cantidad ?? 0);
      if(nuevoTotal < -0.00001){alert('La corrección dejaría un total negativo.');return;}
      setArchive(prev=>({...prev,[fecha]:{...prev[fecha],[campo]:nuevoTotal}}));
    }
    setMovimientosProduccion(reemplazados);
    setAudit(prev=>[...prev,{fechaHora:new Date().toISOString(),accion:eliminar?'Eliminar':'Editar',clase:'produccion',anterior:mov,nuevo:eliminar?null:{...mov,cantidad:valor}}]);
    setEditorProduccion(null);
  };

  const guardarResumenProduccion=()=>{
    if(!editorResumenProduccion)return;
    const {fecha,campo,valor}=editorResumenProduccion;
    const n=Number(valor);
    if(valor.trim()===''||!Number.isFinite(n)||n<0){alert('Escribe una cantidad válida.');return;}
    const previo=fecha===dayKey ? {bultos,mermaKg,kgRecuperados}[campo] : archive[fecha]?.[campo];
    if(fecha!==dayKey&&!archive[fecha]){alert('No existe un cierre guardado para esta fecha.');return;}
    if(fecha===dayKey){
      ({bultos:setBultos,mermaKg:setMermaKg,kgRecuperados:setKgRecuperados})[campo](n);
    }else{
      setArchive(prev=>({...prev,[fecha]:{...prev[fecha],[campo]:n}}));
    }
    setAudit(prev=>[...prev,{fechaHora:new Date().toISOString(),accion:'Corregir total histórico',clase:'produccion',fecha,campo,anterior:previo,nuevo:n}]);
    setEditorResumenProduccion(null);
  };

  const pagosReparto=clientes.reduce((a,c)=>a+(c.pagadoHoy||0),0);
  const totalKgHoy = clientes.reduce((a,c)=>a+(c.hoy||0),0);
  const totalDevHoy = clientes.reduce((a,c)=>a+(c.devHoy||0),0);
  const ingresoTotal=totalPesos+pagosReparto;

  const kgVentaPublico = precioKg ? (totalPesos/precioKg) : 0;
  const kgReparto = clientes.reduce((a,c)=>a+c.hoy,0);
  const kgTotales = kgVentaPublico + kgReparto;
  const kgAjustados = kgTotales - kgRecuperados + mermaKg;

  const kgEsperados=bultos*rendimiento;
  const rendimientoReal=bultos? (kgAjustados/bultos).toFixed(2):0;

  const costoBase=(bultos*precioHarina)+(bultos*gasPorBulto*precioGas);
  const sueldosActivos=empleados.filter(e=>e.activo).reduce((a,e)=>a+e.sueldo,0);
  const costoTotal=costoBase+Number(gastosDiarios||0)+sueldosActivos;
  const utilidad=ingresoTotal-costoTotal;

  const generarPDF=()=>{
    if(fechaReporte !== dayKey && !archive[fechaReporte]){
      alert('No hay datos guardados para esa fecha.'); return;
    }
    const snapshot=fechaReporte===dayKey ? null : archive[fechaReporte];
    const ingresoReporte=snapshot ? (snapshot.totalPesos + snapshot.clientes.reduce((a,c)=>a+Number(c.pagadoHoy||0),0)) : ingresoTotal;
    const costoReporte=snapshot ? (snapshot.bultos*(num(snapshot.precioHarina ?? precioHarina)+num(snapshot.gasPorBulto ?? gasPorBulto)*num(snapshot.precioGas ?? precioGas))+Number(snapshot.gastosDiarios||0)+(snapshot.empleados || empleados).filter(e=>e.activo).reduce((a,e)=>a+num(e.sueldo),0)) : costoTotal;
    const bultosReporte=snapshot ? snapshot.bultos : bultos;
    const kgReporte=snapshot ? (snapshot.totalPesos/(snapshot.precioKg || precioKg)+snapshot.clientes.reduce((a,c)=>a+Number(c.hoy||0),0)) : kgTotales;
    const doc=new jsPDF();
    doc.text(`Reporte ${fechaReporte}`,10,10);
    doc.text(`Ingreso: $${ingresoReporte}`,10,20);
    doc.text(`Costos: $${costoReporte}`,10,30);
    doc.text(`Utilidad: $${ingresoReporte-costoReporte}`,10,40);
    doc.text(`Bultos: ${bultosReporte}`,10,50);
    doc.text(`Kg totales: ${kgReporte.toFixed(2)}`,10,60);
    doc.save(`reporte_${fechaReporte}.pdf`);

  }

  const navigation=[['inicio','⌂','Inicio'],['venta','▣','Venta'],['reparto','▰','Reparto'],['historial','◷','Historial'],['control','▥','Control'],['config','⚙','Config.']];
  const moneda=v=>`$${Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return (
    <div className="tc-app min-h-screen pb-24">
      <style>{`
        .tc-app{background:#f1f5f9;color:#14283d;font-family:system-ui,-apple-system,sans-serif;min-height:100vh}
        .tc-app .tc-header{background:linear-gradient(125deg,#073657,#0b5484);color:white;padding:22px 18px 26px;border-radius:0 0 24px 24px;box-shadow:0 7px 22px #0b31512b}
        .tc-app .tc-main{max-width:860px;margin:-12px auto 0;padding:0 13px 25px}
        .tc-app .bg-white{background:#fff;border:1px solid #e6edf5}
        .tc-app .shadow{box-shadow:0 4px 18px #183c6110}
        .tc-app .rounded-2xl{border-radius:20px}
        .tc-app .rounded-xl{border-radius:15px}
        .tc-app input,.tc-app select,.tc-app textarea{min-height:43px;background:#fff;border-color:#d8e2ed;border-radius:11px;max-width:100%;font-size:16px}
        .tc-app input[type=checkbox]{min-height:auto;width:20px;height:20px;accent-color:#1268d8}
        .tc-app button{transition:filter .15s,transform .1s;font-weight:600}
        .tc-app button:active{transform:scale(.985)}
        .tc-app .bg-blue-500,.tc-app .bg-blue-600{background:#1466db}
        .tc-app .bg-green-500,.tc-app .bg-green-600{background:#09a65b}
        .tc-app .bg-red-500,.tc-app .bg-red-600{background:#dc4053}
        .tc-app .bg-blue-50{background:#edf5ff}
        .tc-app .tc-bottom{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e1e8f0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));padding:7px 3px max(8px,env(safe-area-inset-bottom));z-index:30;box-shadow:0 -5px 22px #122c4615}
        .tc-app .tc-nav{display:flex;align-items:center;flex-direction:column;gap:2px;padding:6px 0;color:#687c90;font-size:10px;border-radius:12px}
        .tc-app .tc-nav .tc-symbol{font-size:22px;line-height:25px}
        .tc-app .tc-nav.active{background:#eaf2ff;color:#1265dc}
        .tc-app .tc-stat{padding:17px 14px;border-radius:18px;background:#fff;border:1px solid #e2ebf4;box-shadow:0 4px 12px #173c5d0c}
        .tc-app .tc-stat strong{display:block;font-size:23px;margin-top:8px;letter-spacing:-.5px}
        .tc-app .tc-quick{border-radius:15px;padding:17px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px}
        .tc-app .tc-quick span{font-size:24px}
        .tc-app .tc-section-label{font-weight:750;font-size:17px;margin:10px 0 2px}
        .tc-app .tc-search{width:100%;padding:12px 14px;border:1px solid #d9e4ef;border-radius:14px;background:white}
        @media(min-width:850px){.tc-app .tc-bottom{left:50%;transform:translateX(-50%);max-width:860px;border-radius:18px 18px 0 0}}
      `}</style>
      <header className="tc-header">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="text-3xl" aria-hidden="true">🌽</div>
          <div className="flex-1"><div className="font-extrabold text-xl tracking-tight">Torti Control</div><div className="text-sm opacity-80">{tab==='inicio'?'Resumen del día':({venta:'Venta · Mostrador',reparto:'Reparto a expendios',historial:'Historial de movimientos',control:'Control del día',config:'Configuración'})[tab]}</div></div>
          <div className="text-xs opacity-80 text-right">{dayKey.split('-').reverse().join('/')}</div>
        </div>
      </header>
      <main className="tc-main space-y-4">
      {tab==='inicio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="tc-stat"><div className="text-xs text-slate-500">💵 Ingresos del día</div><strong>{moneda(ingresoTotal)}</strong><div className="text-xs text-slate-500">Ventas y cobros</div></div>
            <div className="tc-stat"><div className="text-xs text-slate-500">🚚 Reparto de hoy</div><strong>{totalKgHoy.toFixed(2)} kg</strong><div className="text-xs text-slate-500">{clientes.length} expendios</div></div>
            <div className="tc-stat"><div className="text-xs text-slate-500">🏭 Producción</div><strong>{bultos} bultos</strong><div className="text-xs text-slate-500">{kgEsperados.toFixed(2)} kg esperados</div></div>
            <div className="tc-stat"><div className="text-xs text-slate-500">📈 Utilidad estimada</div><strong>{moneda(utilidad)}</strong><div className="text-xs text-slate-500">Según costos registrados</div></div>
          </div>
          <div className="tc-section-label">Accesos rápidos</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>setTab('venta')} className="tc-quick bg-green-500 text-white"><span>🛒</span>Registrar venta</button>
            <button onClick={()=>setTab('reparto')} className="tc-quick bg-blue-600 text-white"><span>🚚</span>Registrar reparto</button>
            <button onClick={()=>setTab('historial')} className="tc-quick bg-white text-blue-700"><span>◷</span>Ver historial</button>
            <button onClick={()=>setTab('control')} className="tc-quick bg-white text-blue-700"><span>▥</span>Control y reportes</button>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow space-y-2"><div className="font-bold">Estado de reparto</div><div className="flex justify-between text-sm"><span>Deuda total de expendios</span><strong>{moneda(clientes.reduce((a,c)=>a+num(c.deuda),0))}</strong></div><div className="flex justify-between text-sm"><span>Devoluciones de hoy</span><strong>{totalDevHoy.toFixed(2)} kg</strong></div></div>
        </div>
      )}

      {/* VENTA */}
      {tab==='venta' && (
        <div className="bg-white p-4 rounded-2xl shadow space-y-2">
          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-1/3 rounded" placeholder="Kg" value={ventaKg}
              onChange={e=>{
                const v=e.target.value;
                setVentaKg(v);
                setVentaPesos(v? (Number(v)*precioKg).toFixed(2):'');
              }}/>
            <input inputMode="decimal" className="border p-2 w-1/3 rounded" placeholder="$" value={ventaPesos}
              onChange={e=>{
                const v=e.target.value;
                setVentaPesos(v);
                setVentaKg(v? (Number(v)/precioKg).toFixed(2):'');
              }}/>
            <button className="bg-blue-600 text-white w-1/3 p-3 rounded-xl text-lg" onClick={registrarVenta}>Vender</button>
          </div>
          <p className="font-bold">Total: ${totalPesos.toFixed(2)}</p>
          <div className="mt-3 border-t pt-3 space-y-2">
            <h3 className="font-semibold">Ventas de hoy</h3>
            {historialVentas.length===0 && <p className="text-sm text-gray-500">Aún no hay ventas registradas.</p>}
            {[...historialVentas].reverse().map((v,i)=>(
              <div key={i} className="flex justify-between gap-2 border-b py-2 text-sm">
                <span>{v.fecha || dayKey} · {v.hora || 'Hora no disponible'}</span>
                <span className="font-medium">{Number(v.kg||0).toFixed(2)} kg · ${Number(v.pesos||0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPARTO */}
      {tab==='reparto' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl shadow font-bold">
            Deuda total: ${clientes.reduce((a,c)=>a+c.deuda,0)}
          </div>
          <div className="bg-white p-3 rounded-xl shadow">
  <div className="grid grid-cols-3 gap-2 text-center">
    <div>
      <p className="text-sm text-gray-500">Ingreso del día</p>
      <p className="font-bold">${pagosReparto}</p>
    </div>
    <div>
      <p className="text-sm text-gray-500">Kg hoy</p>
      <p className="font-bold">{totalKgHoy}</p>
    </div>
    <div>
      <p className="text-sm text-gray-500">Dev hoy</p>
      <p className="font-bold">{totalDevHoy}</p>
    </div>
  </div>
</div>

          <input className="tc-search" value={buscarExpendio} onChange={e=>setBuscarExpendio(e.target.value)} placeholder="🔎 Buscar expendio..." aria-label="Buscar expendio" />
          {clientes.map((c,i)=>({c,i})).filter(({c})=>c.nombre.toLocaleLowerCase('es').includes(buscarExpendio.toLocaleLowerCase('es'))).map(({c,i})=>(
            <div key={i} className="bg-white p-3 rounded-xl shadow space-y-2">
              <div className="flex justify-between">
                <p className="font-bold">{c.nombre}</p>
                <p>${c.deuda}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="text-gray-500">Kg hoy</p>
                  <p className="font-bold">{c.hoy}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dev hoy</p>
                  <p className="font-bold">{c.devHoy||0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kg ayer</p>
                  <p className="font-bold">{c.ayer}</p>
                </div>
                <div>
                  <p className="text-gray-500">pagó $</p>
                  <p className="font-bold">{c.pagadoHoy||0}</p>
                </div>
              </div>

              <div className="flex gap-1">
                <input inputMode="decimal" className="border p-1 rounded w-1/3" placeholder="Kg"
                  value={temp[i]?.ent||''}
                  onChange={e=>setTemp({...temp,[i]:{...temp[i],ent:e.target.value}})} />
                <input inputMode="decimal" className="border p-1 rounded w-1/3" placeholder="$"
                  value={temp[i]?.pag||''}
                  onChange={e=>setTemp({...temp,[i]:{...temp[i],pag:e.target.value}})} />
                <input inputMode="decimal" className="border p-1 rounded w-1/3" placeholder="Dev"
                  value={temp[i]?.dev||''}
                  onChange={e=>setTemp({...temp,[i]:{...temp[i],dev:e.target.value}})} />
              </div>

              {(Number(temp[i]?.ent||0)>0 || Number(temp[i]?.pag||0)>0 || Number(temp[i]?.dev||0)>0) && (
                <label className="block text-sm font-semibold">Repartidor que realizó el movimiento
                  <select className="border p-2 rounded w-full mt-1 font-normal" value={temp[i]?.responsable ?? ''} onChange={e=>setTemp(prev=>({...prev,[i]:{...prev[i],responsable:e.target.value}}))}>
                    <option value="">Seleccionar repartidor</option>
                    {disponibles.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                  <span className="block text-xs text-gray-500 font-normal mt-1">Si varias personas realizaron los movimientos, regístralos por separado.</span>
                </label>
              )}
              <button className="bg-green-500 text-white w-full p-2 rounded-xl"
                onClick={()=>{
                  const d=temp[i]||{};
                  const ent=Number(d.ent||0);
                  const pag=Number(d.pag||0);
                  const dev=Number(d.dev||0);

                  if(![ent,pag,dev].every(n=>Number.isFinite(n) && n>=0) || !(ent||pag||dev)) return;
                  if(disponibles.length>0 && !d.responsable){alert('Selecciona el repartidor que realizó el movimiento.');return;}
                  const responsable=d.responsable || '';
                  const responsableNombre=repartidores.find(r=>r.id===responsable)?.nombre || 'Sin asignar';
                  const sello=timestampLocal();
                  const clActual=clientes[i];
                  const movimientos=[];
                  if(ent) movimientos.push({...sello,id:makeId(),clienteId:i,cliente:clActual.nombre,repartidorId:responsable,repartidorNombre:responsableNombre,tipo:'Entrega',kg:ent,importe:ent*clActual.precio});
                  if(dev) movimientos.push({...sello,id:makeId(),clienteId:i,cliente:clActual.nombre,repartidorId:responsable,repartidorNombre:responsableNombre,tipo:'Devolución',kg:dev,importe:dev*clActual.precio,fechaEntrega:dayKey > '0000' ? (()=>{const d=new Date(dayKey+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})() : ''});
                  if(pag) movimientos.push({...sello,id:makeId(),clienteId:i,cliente:clActual.nombre,repartidorId:responsable,repartidorNombre:responsableNombre,tipo:'Cobranza',importe:pag});
                  setMovimientosReparto(prev=>[...prev,...movimientos]);
                  setClientes(prev=>prev.map((cl,idx)=>{
                    if(idx===i){
                      return {
                        ...cl,
                        deuda: cl.deuda + ent*cl.precio - pag - dev*cl.precio,
                        hoy: cl.hoy + ent,
                        kg: cl.kg + ent,
                        pagadoHoy: cl.pagadoHoy + pag,
                        devHoy: (cl.devHoy||0) + dev
                      }
                    }
                    return cl;
                  }))

                  setTemp({...temp,[i]:{}})
                }}>
                Registrar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HISTORIAL: fuera de las pantallas de captura */}
      {tab==='historial' && (
        <div className="bg-white p-4 rounded-2xl shadow space-y-3">
          <h2 className="text-lg font-bold">Historial por día</h2>
          <div className="flex flex-wrap gap-2">
            <button className={`flex-1 p-2 rounded-lg ${tipoHistorial==='ventas'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setTipoHistorial('ventas')}>Ventas</button>
            <button className={`flex-1 p-2 rounded-lg ${tipoHistorial==='reparto'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setTipoHistorial('reparto')}>Reparto y cobranza</button>
            <button className={`flex-1 p-2 rounded-lg ${tipoHistorial==='produccion'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setTipoHistorial('produccion')}>Producción</button>
          </div>
          <p className="text-xs text-gray-500">Toca un movimiento para editarlo o eliminarlo.</p>
          <label className="block text-sm font-semibold">Consultar fecha</label>
          <input type="date" className="border rounded-lg p-2 w-full" value={fechaHistorial} onChange={e=>setFechaHistorial(e.target.value)} />
          {tipoHistorial!=='produccion' && <button type="button" className="bg-green-600 text-white rounded-lg p-3 w-full font-semibold" onClick={abrirHistorico}>+ Agregar movimiento a esta fecha</button>}
          {tipoHistorial==='produccion' && (()=>{
            const registros=movimientosProduccion.filter(m=>m.fecha===fechaHistorial);
            const datos=fechaHistorial===dayKey ? {bultos,mermaKg,kgRecuperados} : archive[fechaHistorial];
            return <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-blue-50 p-3 text-center">
                <div><p className="text-xs text-gray-600">Bultos</p><p className="font-bold">{num(datos?.bultos).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-600">Merma kg</p><p className="font-bold">{num(datos?.mermaKg).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-600">Recuperados kg</p><p className="font-bold">{num(datos?.kgRecuperados).toFixed(2)}</p></div>
              </div>
              <p className="text-sm text-gray-500">Puedes corregir los totales con los botones de abajo. El listado de movimientos se conserva como referencia.</p>
              {datos && <div className="grid grid-cols-3 gap-2">
                {[['bultos','Bultos'],['mermaKg','Merma'],['kgRecuperados','Recuperados']].map(([campo,nombre])=>(
                  <button type="button" key={campo} className="text-xs rounded-lg p-2 bg-blue-100 text-blue-800 font-semibold" onClick={()=>setEditorResumenProduccion({fecha:fechaHistorial,campo,valor:String(num(datos[campo]))})}>
                    Editar {nombre}
                  </button>
                ))}
              </div>}
              {registros.length===0 && <p className="text-sm text-gray-500">No hay movimientos individuales de producción para esta fecha. Los totales antiguos se conservan cuando existe un cierre guardado.</p>}
              {registros.map(m=><button type="button" key={m.id} className="w-full text-left border-b py-2 text-sm" onClick={()=>{setEditorProduccion({mov,index:movimientosProduccion.indexOf(m)});setValorProduccion(String(m.cantidad));}}>
                <p className="font-semibold">{m.tipo==='Bultos'?'Bultos procesados':m.tipo==='Merma'?'Merma':'Kg recuperados'}: {num(m.cantidad).toFixed(2)} {m.tipo==='Bultos'?'bultos':'kg'}</p>
                <p className="text-gray-600">{m.fecha} · {m.hora || 'Hora no disponible'}</p>
              </button>)}
            </div>;
          })()}
          {tipoHistorial!=='produccion' && (tipoHistorial==='ventas' ? (()=>{
            const ventas=fechaHistorial===dayKey ? historialVentas : (archive[fechaHistorial]?.historialVentas || []);
            const total=ventas.reduce((a,v)=>a+Number(v.pesos||0),0);
            const kilos=ventas.reduce((a,v)=>a+Number(v.kg||0),0);
            return <div className="space-y-2">
              <p className="font-semibold">{ventas.length} ventas · {kilos.toFixed(2)} kg · ${total.toFixed(2)}</p>
              {ventas.length===0 && <p className="text-sm text-gray-500">No hay ventas registradas en esta fecha.</p>}
              {ventas.map((v,i)=><div key={v.id||i} onClick={()=>openEditor('venta',v,i,fechaHistorial)} className="border-b py-2 text-sm flex justify-between gap-2 cursor-pointer"><span>{v.fecha || fechaHistorial} · {v.hora || 'Hora no disponible'}{v.registradoPosteriormente?' · Agregada posteriormente':''}</span><span>{v.kg} kg · ${Number(v.pesos||0).toFixed(2)}</span></div>)}
            </div>;
          })() : (()=>{
            const listaCompleta=movimientosReparto.filter(m=>m.fecha===fechaHistorial);
            const lista=listaCompleta.filter(m=>filtroHistorialRepartidor==='todos'||(m.repartidorId||'')===filtroHistorialRepartidor);
            const resumen=archive[fechaHistorial];
            // Usar movimientos individuales cuando existen; para días antiguos,
            // utilizar los acumulados de cierre sin contarlos dos veces.
            const clientesDia=fechaHistorial===dayKey ? clientes : (resumen?.clientes || []);
            const desdeMovimientos=lista.length>0;
            const filtrado=filtroHistorialRepartidor!=='todos';
            const suma=(items, campo)=>items.reduce((acc,item)=>acc+Number(item[campo]||0),0);
            const kgEntregados=desdeMovimientos
              ? suma(lista.filter(m=>m.tipo==='Entrega'),'kg')
              : filtrado?0:suma(clientesDia,'hoy');
            const kgDevueltos=desdeMovimientos
              ? suma(lista.filter(m=>m.tipo==='Devolución'),'kg')
              : filtrado?0:suma(clientesDia,'devHoy');
            const totalCobrado=desdeMovimientos
              ? suma(lista.filter(m=>m.tipo==='Cobranza'),'importe')
              : filtrado?0:suma(clientesDia,'pagadoHoy');
            return <div className="space-y-2">
              <label className="block text-sm font-semibold">Filtrar movimientos por repartidor</label>
              <select className="border rounded-lg p-2 w-full" value={filtroHistorialRepartidor} onChange={e=>setFiltroHistorialRepartidor(e.target.value)}>
                <option value="todos">Todos (General)</option>
                <option value="">Sin asignar</option>
                {repartidores.map(r=><option key={r.id} value={r.id}>{r.nombre}{r.activo===false?' (inactivo)':''}</option>)}
              </select>
              {filtrado && listaCompleta.length===0 && <p className="text-xs text-amber-700">Los registros anteriores a esta función no identifican repartidores.</p>}
              <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-blue-50 p-3">
                <div><p className="text-xs text-gray-600">Kg entregados</p><p className="font-bold">{kgEntregados.toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-600">Kg devueltos</p><p className="font-bold">{kgDevueltos.toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-600">Total cobrado</p><p className="font-bold">${totalCobrado.toFixed(2)}</p></div>
              </div>
              {!filtrado && lista.length===0 && resumen?.clientes?.length>0 && <div className="rounded-lg bg-blue-50 p-3 text-sm space-y-2">
                <p className="font-semibold">Resumen recuperado del cierre de {fechaHistorial}</p>
                <p className="text-gray-600">Estos son los acumulados que quedaron guardados al cerrar ese día. No son movimientos individuales; no se conservaron sus horas.</p>
                {resumen.clientes.filter(c=>Number(c.hoy||0)>0 || Number(c.devHoy||0)>0 || Number(c.pagadoHoy||0)>0).map((c,i)=>(
                  <div key={i} className="border-t pt-2">
                    <p className="font-medium">{c.nombre}</p>
                    <p>Entregados: {Number(c.hoy||0)} kg · Devoluciones registradas: {Number(c.devHoy||0)} kg · Cobrado: ${Number(c.pagadoHoy||0).toFixed(2)}</p>
                  </div>
                ))}
              </div>}
              <p className="font-semibold">{lista.length} movimientos</p>
              {lista.length===0 && (filtrado || !resumen?.clientes?.length) && <p className="text-sm text-gray-500">No hay movimientos registrados en esta fecha. Los movimientos anteriores a la instalación del historial no se pueden reconstruir individualmente.</p>}
              {lista.map((m,i)=><div key={m.id||i} onClick={()=>openEditor('reparto',m,movimientosReparto.indexOf(m),fechaHistorial)} className="border-b py-2 text-sm cursor-pointer">
                <p className="font-semibold">{m.cliente} · {m.tipo}</p>
                <p className="text-xs text-blue-700">Repartidor: {(repartidores.find(r=>r.id===m.repartidorId)?.nombre || m.repartidorNombre || (m.repartidorId?'Repartidor eliminado':'Sin asignar'))}</p>
                <p className="text-gray-600">{m.fecha} · {m.hora}{m.registradoPosteriormente?' · Agregado posteriormente':''}{m.tipo==='Devolución' && m.fechaEntrega ? ` · Corresponde a ${m.fechaEntrega}` : ''}</p>
                <p>{m.kg ? `${m.kg} kg · ` : ''}${Number(m.importe||0).toFixed(2)}</p>
              </div>)}
            </div>;
          })())}
        </div>
      )}

      {nuevoHistorico && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 max-h-[90vh] overflow-y-auto">
          <h2 className="font-bold text-lg">Agregar {nuevoHistorico.clase==='ventas'?'venta':'movimiento de reparto'} anterior</h2>
          <p className="text-xs text-amber-700">Se guardará en la fecha elegida y quedará identificado como registro posterior.</p>
          <label className="block text-sm">Fecha
            <input type="date" max={dayKey} className="border rounded p-2 w-full" value={nuevoHistorico.fecha} onChange={e=>setNuevoHistorico(p=>({...p,fecha:e.target.value}))}/>
          </label>
          <label className="block text-sm">Hora aproximada del movimiento
            <input type="time" step="1" className="border rounded p-2 w-full" value={nuevoHistorico.hora} onChange={e=>setNuevoHistorico(p=>({...p,hora:e.target.value}))}/>
          </label>
          {nuevoHistorico.clase==='reparto' && <>
            <label className="block text-sm">Expendio
              <select className="border rounded p-2 w-full" value={nuevoHistorico.clienteId} onChange={e=>setNuevoHistorico(p=>({...p,clienteId:e.target.value}))}>
                {clientes.map((c,i)=><option key={i} value={i}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="block text-sm">Movimiento
              <select className="border rounded p-2 w-full" value={nuevoHistorico.tipo} onChange={e=>setNuevoHistorico(p=>({...p,tipo:e.target.value}))}>
                {['Entrega','Cobranza','Devolución'].map(t=><option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-sm">Repartidor responsable
              <select className="border rounded p-2 w-full" value={nuevoHistorico.repartidorId} onChange={e=>setNuevoHistorico(p=>({...p,repartidorId:e.target.value}))}>
                <option value="">Sin asignar</option>
                {repartidores.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </label>
          </>}
          {(nuevoHistorico.clase==='ventas'||nuevoHistorico.tipo!=='Cobranza') && <label className="block text-sm">Kilogramos
            <input inputMode="decimal" type="number" min="0" step="any" className="border rounded p-2 w-full" value={nuevoHistorico.kg} onChange={e=>setNuevoHistorico(p=>({...p,kg:e.target.value}))}/>
          </label>}
          {(nuevoHistorico.clase==='ventas'||nuevoHistorico.tipo==='Cobranza') && <label className="block text-sm">Importe en pesos
            <input inputMode="decimal" type="number" min="0" step="any" className="border rounded p-2 w-full" value={nuevoHistorico.pesos} onChange={e=>setNuevoHistorico(p=>({...p,pesos:e.target.value}))}/>
          </label>}
          <div className="flex gap-2">
            <button type="button" className="bg-green-600 text-white rounded p-2 flex-1" onClick={guardarHistorico}>Guardar movimiento</button>
            <button type="button" className="bg-gray-200 rounded p-2" onClick={()=>setNuevoHistorico(null)}>Cancelar</button>
          </div>
        </div>
      </div>}

      {editorResumenProduccion && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3">
          <h2 className="font-bold text-lg">Corregir total de producción</h2>
          <p className="text-sm text-gray-600">{editorResumenProduccion.fecha} · {editorResumenProduccion.campo}</p>
          <p className="text-xs text-amber-700">Corrección del resumen guardado. No se inventarán movimientos ni horas anteriores.</p>
          <input type="number" min="0" step="any" className="border rounded p-2 w-full" value={editorResumenProduccion.valor} onChange={e=>setEditorResumenProduccion(prev=>({...prev,valor:e.target.value}))}/>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white rounded p-2 flex-1" onClick={guardarResumenProduccion}>Guardar</button>
            <button className="bg-gray-200 rounded p-2" onClick={()=>setEditorResumenProduccion(null)}>Cancelar</button>
          </div>
        </div>
      </div>}

      {editorProduccion && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3">
          <h2 className="font-bold text-lg">Corregir producción</h2>
          <p className="text-sm text-gray-600">{editorProduccion.mov.tipo} · {editorProduccion.mov.fecha} · {editorProduccion.mov.hora}</p>
          <input className="border rounded p-2 w-full" type="number" min="0" step="any" value={valorProduccion} onChange={e=>setValorProduccion(e.target.value)}/>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white rounded p-2 flex-1" onClick={()=>corregirProduccion(false)}>Guardar</button>
            <button className="bg-red-600 text-white rounded p-2" onClick={()=>corregirProduccion(true)}>Eliminar</button>
            <button className="bg-gray-200 rounded p-2" onClick={()=>setEditorProduccion(null)}>Cancelar</button>
          </div>
        </div>
      </div>}

      {editor && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3">
          <h2 className="font-bold text-lg">Corregir movimiento</h2>
          <p className="text-sm text-gray-600">{editor.fecha} · {editor.original.hora || 'Hora no disponible'} · {editor.original.cliente || 'Venta al público'}</p>
          {editor.kind==='reparto' && <select className="border p-2 rounded w-full" value={editTipo} onChange={e=>setEditTipo(e.target.value)}>
            <option value="Entrega">Entrega (kg)</option><option value="Devolución">Devolución (kg)</option><option value="Cobranza">Cobranza ($)</option>
          </select>}
          {editor.kind==='reparto' && <><label className="block text-sm font-medium">Repartidor responsable</label><select className="border p-2 rounded w-full" value={responsableEdicion} onChange={e=>setResponsableEdicion(e.target.value)}>{opcionesRepartidores}{repartidores.filter(r=>r.activo===false).map(r=><option key={r.id} value={r.id}>{r.nombre} (inactivo)</option>)}</select></>}
          <label className="block text-sm font-medium">{editor.kind==='venta'||editTipo!=='Cobranza'?'Cantidad de kilos':'Importe cobrado ($)'}</label>
          <input className="border p-2 rounded w-full" inputMode="decimal" value={editValor} onChange={e=>setEditValor(e.target.value)}/>
          <div className="flex gap-2"><button className="bg-blue-600 text-white p-2 rounded flex-1" onClick={()=>commitEdit(false)}>Guardar cambios</button>
          <button className="bg-red-600 text-white p-2 rounded" onClick={()=>commitEdit(true)}>Eliminar</button></div>
          <button className="border rounded p-2 w-full" onClick={()=>setEditor(null)}>Cancelar</button>
        </div>
      </div>}

      {/* CONTROL */}
      {tab==='control' && (
        <div className="bg-white p-4 rounded-2xl shadow space-y-3">

          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Bultos" value={inputBultos}
              onChange={e=>setInputBultos(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                const valor=Number(inputBultos);
                if(!Number.isFinite(valor)||valor<=0)return;
                setBultos(prev=>prev+valor);
                setMovimientosProduccion(prev=>[...prev,{id:makeId(),tipo:'Bultos',cantidad:valor,...timestampLocal()}]);
                setInputBultos('');
              }}>Agregar</button>
          </div>

          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Gastos diarios" value={inputGastos}
              onChange={e=>setInputGastos(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                setGastosDiarios(prev=>prev+Number(inputGastos||0));
                setHistorialGastos(prev=>[...prev,{monto:Number(inputGastos||0),hora:new Date().toLocaleTimeString()}]);
                setInputGastos('');
              }}>Agregar</button>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl">
            <h2 className="font-bold text-center mb-2">Empleados activos</h2>

            <div className="grid grid-cols-5 text-center gap-2">
              {[1,2,3,4,5].map((n,i)=>(
                <div key={i} className="font-bold">{n}</div>
              ))}
            </div>

            <div className="grid grid-cols-5 text-center gap-2 mt-2">
              {empleados.map((e,i)=>(
                <div key={i}>
                  <input
                    type="checkbox"
                    checked={e.activo}
                    onChange={()=>setEmpleados(prev=>prev.map((emp,idx)=> idx===i?{...emp,activo:!emp.activo}:emp))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-100 p-2 rounded">

          <div className="flex gap-2 mb-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Kg recuperados" value={inputKgRec}
              onChange={e=>setInputKgRec(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                const valor=Number(inputKgRec);
                if(!Number.isFinite(valor)||valor<0||inputKgRec.trim()==='')return;
                setKgRecuperados(valor);
                setMovimientosProduccion(prev=>[...prev,{id:makeId(),tipo:'Recuperados',cantidad:valor,...timestampLocal()}]);
                setInputKgRec('');
              }}>Guardar</button>
          </div>

          <div className="flex gap-2 mb-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Merma Kg" value={inputMerma}
              onChange={e=>setInputMerma(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                const valor=Number(inputMerma);
                if(!Number.isFinite(valor)||valor<0||inputMerma.trim()==='')return;
                setMermaKg(valor);
                setMovimientosProduccion(prev=>[...prev,{id:makeId(),tipo:'Merma',cantidad:valor,...timestampLocal()}]);
                setInputMerma('');
              }}>Guardar</button>
          </div>
            <p>Bultos: {bultos}</p>
            <p>Kg totales: {kgTotales.toFixed(2)}</p>
            <p>Kg esperados: {kgEsperados}</p>
            <p>Kg recuperados: {kgRecuperados}</p>
            <p>Merma Kg: {mermaKg}</p>
            <p className="font-bold">Rendimiento: {rendimientoReal} kg/bulto</p>
          </div>

          <div>
            <h2 className="font-bold">Historial de gastos</h2>
            {historialGastos.map((g,i)=>(
              <p key={i} className="text-sm">{g.hora} - $ {g.monto}</p>
            ))}
          </div>

          <p>Ingreso: ${ingresoTotal}</p>
          <p>Costos: ${costoBase + sueldosActivos}</p>
          <p>Gastos: ${Number(gastosDiarios||0)}</p>
          <p className="font-bold">Utilidad: ${utilidad}</p>

          <div className="pt-4 border-t">
            <input type="date" value={fechaReporte} onChange={e=>setFechaReporte(e.target.value)} className="border p-2 rounded w-full" />
            <button className="bg-red-500 text-white p-2 rounded-xl w-full mt-2" onClick={generarPDF}>Generar PDF</button>
          </div>
        </div>
      )}

      {/* CONFIG */}
      {tab==='config' && (
        <div className="bg-white p-4 rounded-2xl shadow space-y-3">

          <h2 className="font-bold">Repartidores</h2>
          <p className="text-xs text-gray-600">Puedes desactivarlos sin borrar su historial ni las deudas de las tiendas.</p>
          <div className="flex gap-2">
            <input className="border rounded p-2 w-full" placeholder="Nombre del repartidor" value={nuevoRepartidor} onChange={e=>setNuevoRepartidor(e.target.value)}/>
            <button className="bg-blue-500 text-white px-3 rounded" onClick={()=>{const nombre=nuevoRepartidor.trim();if(!nombre)return;setRepartidores(prev=>[...prev,{id:makeId(),nombre,activo:true}]);setNuevoRepartidor('');}}>Agregar</button>
          </div>
          <select className="border rounded p-2 w-full" value={repartidorElegido} onChange={e=>{setRepartidorElegido(e.target.value);setNombreRepartidor(repartidores.find(r=>r.id===e.target.value)?.nombre||'');}}>
            <option value="">Selecciona un repartidor</option>
            {repartidores.map(r=><option key={r.id} value={r.id}>{r.nombre}{r.activo===false?' (inactivo)':''}</option>)}
          </select>
          {repartidorElegido && repartidores.some(r=>r.id===repartidorElegido) && <div className="space-y-2">
            <input className="border rounded p-2 w-full" placeholder="Nuevo nombre" value={nombreRepartidor} onChange={e=>setNombreRepartidor(e.target.value)}/>
            <div className="flex gap-2">
              <button className="bg-green-600 text-white rounded p-2 flex-1" onClick={()=>{const nombre=nombreRepartidor.trim();if(!nombre)return;setRepartidores(prev=>prev.map(r=>r.id===repartidorElegido?{...r,nombre}:r));}}>Renombrar</button>
              <button className="bg-amber-500 text-white rounded p-2 flex-1" onClick={()=>setRepartidores(prev=>prev.map(r=>r.id===repartidorElegido?{...r,activo:!r.activo}:r))}>{repartidores.find(r=>r.id===repartidorElegido)?.activo===false?'Reactivar':'Desactivar'}</button>
              <button className="bg-red-600 text-white rounded p-2" onClick={()=>{if(!window.confirm('¿Eliminar este repartidor? Sus movimientos históricos conservarán el nombre.'))return;setRepartidores(prev=>prev.filter(r=>r.id!==repartidorElegido));setClientes(prev=>prev.map(c=>c.repartidorId===repartidorElegido?{...c,repartidorId:''}:c));setMovimientosReparto(prev=>prev.map(m=>m.repartidorId===repartidorElegido?{...m,repartidorNombre:m.repartidorNombre||nombreResponsable(repartidorElegido)}:m));setRepartidorElegido('');setNombreRepartidor('');}}>Eliminar</button>
            </div>
          </div>}
          <h2 className="font-bold">Clientes</h2>
          <div className="flex gap-2">
            <input className="border p-2 w-full rounded" placeholder="Nuevo cliente" value={nuevoCliente}
              onChange={e=>setNuevoCliente(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                if(!nuevoCliente) return;
                setClientes([...clientes,{nombre:nuevoCliente,deuda:0,kg:0,hoy:0,ayer:0,precio:precioKg,pagadoHoy:0}]);
                setNuevoCliente('');
              }}>Agregar</button>
          </div>

          <select className="border p-2 w-full rounded" value={selectedCliente}
            onChange={e=>setSelectedCliente(Number(e.target.value))}>
            {clientes.map((c,i)=>(<option key={i} value={i}>{c.nombre}</option>))}
          </select>

          <div className="flex gap-2">
            <input className="border p-2 w-full rounded" placeholder="Nuevo nombre" value={nuevoNombreCliente}
              onChange={e=>setNuevoNombreCliente(e.target.value)} />
            <button className="bg-green-500 text-white px-3 rounded"
              onClick={()=>{
                if(!nuevoNombreCliente) return;
                setClientes(prev=>prev.map((c,i)=> i===selectedCliente?{...c,nombre:nuevoNombreCliente}:c));
                setNuevoNombreCliente('');
              }}>Renombrar</button>
            <button className="bg-red-500 text-white px-3 rounded"
              onClick={()=>{
                setClientes(prev=>prev.filter((_,i)=>i!==selectedCliente));
              }}>Eliminar</button>
          </div>

          <h2 className="font-bold">Precios</h2>
          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Nuevo precio cliente"
              onChange={e=>setNuevoPrecio(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                setClientes(prev=>prev.map((c,i)=> i===selectedCliente?{...c,precio:Number(nuevoPrecio||0)}:c));
                setNuevoPrecio('');
              }}>Guardar</button>
          </div>

          <h2 className="font-bold">Costos</h2>

          <select className="border p-2 w-full rounded" value={temp.tipoCosto||"harina"}
            onChange={e=>setTemp({...temp,tipoCosto:e.target.value})}>
            <option value="harina">Bulto de harina</option>
            <option value="gas">Litro de gas</option>
            <option value="tortilla">Kg tortilla</option>
          </select>

          <div className="flex gap-2">
            <input
              inputMode="decimal"
              className="border p-2 w-full rounded"
              value={temp.valorCosto ?? (
                temp.tipoCosto==="gas" ? precioGas :
                temp.tipoCosto==="tortilla" ? precioKg :
                precioHarina
              )}
              onChange={e=>setTemp({...temp,valorCosto:e.target.value})}
            />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                const v=Number(temp.valorCosto||0);
                if(temp.tipoCosto==="gas") setPrecioGas(v);
                else if(temp.tipoCosto==="tortilla") setPrecioKg(v);
                else setPrecioHarina(v);
              }}>
              Guardar
            </button>
          </div>

          

          

          <h2 className="font-bold">Sueldos</h2>
          <select className="border p-2 w-full rounded" value={selectedEmpleado}
            onChange={e=>setSelectedEmpleado(Number(e.target.value))}>
            {empleados.map((e,i)=>(<option key={i} value={i}>{e.nombre}</option>))}
          </select>

          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Nuevo sueldo"
              onChange={e=>setNuevoSueldo(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                setEmpleados(prev=>prev.map((e,i)=> i===selectedEmpleado?{...e,sueldo:Number(nuevoSueldo||0)}:e));
                setNuevoSueldo('');
              }}>Guardar</button>
          </div>

        </div>
      )}
      </main>
      <nav className="tc-bottom" aria-label="Navegación principal">
        {navigation.map(([key,symbol,label])=><button key={key} className={`tc-nav ${tab===key?'active':''}`} onClick={()=>{setTab(key);window.scrollTo(0,0)}} aria-current={tab===key?'page':undefined}><span className="tc-symbol" aria-hidden="true">{symbol}</span><span>{label}</span></button>)}
      </nav>
    </div>
  )
}
