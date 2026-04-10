import { useState, useEffect } from "react";
import jsPDF from "jspdf";

function getTodayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
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

export default function App(){

  // LOAD LOCAL STORAGE
useEffect(()=>{
  try{
    const data = localStorage.getItem('tortilleria_app');
    if(data){
      const s = JSON.parse(data);

      if(s.clientes) setClientes(s.clientes);
      if(s.empleados) setEmpleados(s.empleados);
      if(s.totalPesos) setTotalPesos(s.totalPesos);
      if(s.historialVentas) setHistorialVentas(s.historialVentas);
      if(s.gastosDiarios) setGastosDiarios(s.gastosDiarios);
      if(s.historialGastos) setHistorialGastos(s.historialGastos);
      if(s.bultos) setBultos(s.bultos);
      if(s.precioKg) setPrecioKg(s.precioKg);
      if(s.precioHarina) setPrecioHarina(s.precioHarina);
      if(s.precioGas) setPrecioGas(s.precioGas);
      if(s.gasPorBulto) setGasPorBulto(s.gasPorBulto);
      if(s.kgRecuperados) setKgRecuperados(s.kgRecuperados);
      if(s.mermaKg) setMermaKg(s.mermaKg);
    }
  }catch(e){
    console.log("Error cargando datos", e);
    localStorage.removeItem('tortilleria_app');
  }
},[]);

  // SAVE LOCAL STORAGE
  useEffect(()=>{
    const data = {
      clientes,
      empleados,
      totalPesos,
      historialVentas,
      gastosDiarios,
      historialGastos,
      bultos,
      precioKg,
      precioHarina,
      precioGas,
      gasPorBulto,
      kgRecuperados,
      mermaKg
    };
    localStorage.setItem('tortilleria_app', JSON.stringify(data));
  },[clientes,empleados,totalPesos,historialVentas,gastosDiarios,historialGastos,bultos,precioKg,precioHarina,precioGas,gasPorBulto,kgRecuperados,mermaKg]);
  const [tab,setTab]=useState('venta');
  const [precioKg,setPrecioKg]=useState(24);

  const [clientes,setClientes]=useState(generarClientes());
  const [empleados,setEmpleados]=useState(generarEmpleados());

  const [temp,setTemp]=useState({});

  const [ventaKg,setVentaKg]=useState('');
  const [ventaPesos,setVentaPesos]=useState('');
  const [totalPesos,setTotalPesos]=useState(0);
  const [historialVentas,setHistorialVentas]=useState([]);

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

  useEffect(()=>{
    const i=setInterval(()=>{
      const today=getTodayKey();
      if(today!==dayKey){
        setClientes(prev=>prev.map(c=>({...c,ayer:c.hoy,hoy:0,pagadoHoy:0,devHoy:0})));
        setHistorialVentas([]);
        setTotalPesos(0);
        setDayKey(today);
      }
    },60000);
    return ()=>clearInterval(i);
  },[dayKey]);

  const registrarVenta=()=>{
    if(!ventaKg && !ventaPesos) return;
    const pesos=Number(ventaPesos||0);
    const kg=Number(ventaKg||0);
    if(pesos===0 && kg===0) return;

    setTotalPesos(p=>p+pesos);
    setHistorialVentas(prev=>[...prev,{kg,pesos,hora:new Date().toLocaleTimeString()}]);

    setVentaKg('');
    setVentaPesos('');
  }

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
    const doc=new jsPDF();
    doc.text(`Reporte ${fechaReporte}`,10,10);
    doc.text(`Ingreso: $${ingresoTotal}`,10,20);
    doc.text(`Costos: $${costoTotal}`,10,30);
    doc.text(`Utilidad: $${utilidad}`,10,40);
    doc.text(`Bultos: ${bultos}`,10,50);
    doc.text(`Kg totales: ${kgTotales.toFixed(2)}`,10,60);
    doc.save(`reporte_${fechaReporte}.pdf`);

  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen space-y-4">
      <h1 className="text-2xl font-bold">Tortillería</h1>

      <div className="flex gap-2">
        {['venta','reparto','control','config'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 p-2 rounded-xl ${tab===t?'bg-blue-500 text-white':'bg-white shadow'}`}>
            {t}
          </button>
        ))}
      </div>

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
          <p className="font-bold">Total: ${totalPesos}</p>

          <div>
            <h2 className="font-bold">Historial</h2>
            {historialVentas.map((v,i)=>(
              <p key={i} className="text-sm">{v.hora} - {v.kg}kg - ${v.pesos}</p>
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

          {clientes.map((c,i)=>(
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

              <button className="bg-green-500 text-white w-full p-2 rounded-xl"
                onClick={()=>{
                  const d=temp[i]||{};
                  const ent=Number(d.ent||0);
                  const pag=Number(d.pag||0);
                  const dev=Number(d.dev||0);

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

      {/* CONTROL */}
      {tab==='control' && (
        <div className="bg-white p-4 rounded-2xl shadow space-y-3">

          <div className="flex gap-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Bultos" value={inputBultos}
              onChange={e=>setInputBultos(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                setBultos(prev=>prev+Number(inputBultos||0));
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
                setKgRecuperados(Number(inputKgRec||0));
                setInputKgRec('');
              }}>Guardar</button>
          </div>

          <div className="flex gap-2 mb-2">
            <input inputMode="decimal" className="border p-2 w-full rounded" placeholder="Merma Kg" value={inputMerma}
              onChange={e=>setInputMerma(e.target.value)} />
            <button className="bg-blue-500 text-white px-3 rounded"
              onClick={()=>{
                setMermaKg(Number(inputMerma||0));
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

    </div>
  )
}
