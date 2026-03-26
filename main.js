document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. CONFIGURACIÓN SUPABASE
    // ==========================================
    const SUPABASE_URL = 'https://vzzjrjniicoodxmsxstr.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_QYY-NkPkLT1DDvGp7EHa6g_YOvVhZev';

    // Inicializar cliente (Solo si las keys válidas están presentes)
    let supabase = null;
    if (SUPABASE_URL !== 'AQUI_TU_URL_SUPABASE') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // ==========================================
    // 2. ELEMENTOS DEL DOM
    // ==========================================
    const form = document.getElementById('registroForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Selects e Inputs form
    const tipoMov = document.getElementById('tipoMovimiento');
    const categoriaCaja = document.getElementById('categoria');
    const productoSelect = document.getElementById('productoSelect');
    const cantidadInput = document.getElementById('cantidad');
    const detalleInput = document.getElementById('detalle');
    const montoInput = document.getElementById('monto');
    const medioPago = document.getElementById('medioPago');
    const fechaInput = document.getElementById('fecha');
    
    // Tabs y Vistas
    const btnTabCaja = document.getElementById('btnTabCaja');
    const btnTabStock = document.getElementById('btnTabStock');
    const viewCaja = document.getElementById('viewCaja');
    const viewStock = document.getElementById('viewStock');

    // Tablas visuales
    const tablaMovimientos = document.getElementById('tablaMovimientos');
    const statusCaja = document.getElementById('statusCaja');
    const balanceTotalEl = document.getElementById('balanceTotal');
    const tablaStockActual = document.getElementById('tablaStockActual');
    const btnActualizarStock = document.getElementById('btnActualizarStock');

    // Elementos Gestión Catálogo
    const btnToggleNuevoProd = document.getElementById('btnToggleNuevoProd');
    const formNuevoProducto = document.getElementById('formNuevoProducto');
    const nuevoProdNombre = document.getElementById('nuevoProdNombre');
    const nuevoProdColor = document.getElementById('nuevoProdColor');
    const nuevoProdCat = document.getElementById('nuevoProdCat');
    const nuevoProdStock = document.getElementById('nuevoProdStock');

    // Categorías de dinero (Similares al anterior)
    const catDinero = {
        INGRESO: ['Venta', 'Aporte Capital', 'Otros Ingresos'],
        EGRESO: ['Proveedores', 'Flete', 'Servicios (Luz/Agua)', 'Sueldos', 'Publicidad', 'Varios']
    };

    // ==========================================
    // 3. INICIO Y ESTADO BÁSICO
    // ==========================================
    // Setear fecha hoy
    const offset = new Date().getTimezoneOffset();
    const hoyISO = new Date(new Date().getTime() - (offset*60*1000)).toISOString().split('T')[0];
    fechaInput.value = hoyISO;

    // Llenar categorías dinámicas (Caja)
    function actCatCaja() {
        const lista = catDinero[tipoMov.value] || [];
        categoriaCaja.innerHTML = '';
        lista.forEach(c => {
            categoriaCaja.appendChild(new Option(c, c));
        });
    }
    actCatCaja();
    tipoMov.addEventListener('change', actCatCaja);

    // Lógica Producto/Cantidad (si no elige nada, la cant se desactiva)
    productoSelect.addEventListener('change', () => {
        if (productoSelect.value === 'NONE') {
            cantidadInput.disabled = true;
            cantidadInput.value = 1;
        } else {
            cantidadInput.disabled = false;
        }
    });

    // Lógica Tabs
    btnTabCaja.addEventListener('click', () => {
        viewCaja.classList.remove('hidden');
        viewStock.classList.add('hidden');
        btnTabCaja.className = "flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-lg bg-white shadow text-dark transition-all";
        btnTabStock.className = "flex-1 py-2 sm:py-3 text-sm sm:text-base font-medium rounded-lg text-gray-500 hover:text-dark transition-all";
    });

    btnTabStock.addEventListener('click', () => {
        viewCaja.classList.add('hidden');
        viewStock.classList.remove('hidden');
        btnTabCaja.className = "flex-1 py-2 sm:py-3 text-sm sm:text-base font-medium rounded-lg text-gray-500 hover:text-dark transition-all";
        btnTabStock.className = "flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-lg bg-white shadow text-dark transition-all";
    });

    // Toggle Form Nuevo Producto
    btnToggleNuevoProd.addEventListener('click', () => {
        formNuevoProducto.classList.toggle('hidden');
    });

    // ==========================================
    // 4. LÓGICA DE BASE DE DATOS (SUPABASE)
    // ==========================================
    
    async function inicializarApp() {
        if (!supabase) {
            alert('¡Atención! Aún no has puesto tus credenciales AQUI_TU_URL y KEY en main.js.\n\nEl sistema funcionará, pero no se guardará en la nube.');
            tablaStockActual.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-danger font-medium">Falta conectar Supabase</td></tr>';
            return;
        }

        // Cargar todo en paralelo
        await Promise.all([cargarProductos(), cargarHistorialCaja()]);
    }

    async function cargarProductos() {
        if (!supabase) return;
        
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('categoria', { ascending: true })
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error cargando catálogo', error);
            return;
        }

        // 1. Llenar Select Formulario
        productoSelect.innerHTML = '<option value="NONE">- Sin Producto (Solo Dinero) -</option>';
        data.forEach(p => {
            productoSelect.appendChild(new Option(`${p.nombre} (Stock: ${p.stock_actual})`, p.id));
        });

        // 2. Dibujar Tabla "Stock Actual"
        dibujarTablaStock(data);
    }

    function dibujarTablaStock(productos = []) {
        if (productos.length === 0) {
            tablaStockActual.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-500">No hay productos cargados en la BD</td></tr>';
            return;
        }

        let html = '';
        productos.forEach(p => {
            const warningClase = p.stock_actual <= 0 ? 'text-danger font-bold' : 'text-success font-semibold';
            
            // Reemplazamos apóstrofes para que no rompa el onclick
            const nombreSeguro = p.nombre.replace(/'/g, "\\'");

            html += `
                <tr class="hover:bg-beige-50 transition-colors">
                    <td class="py-4 text-[13px] sm:text-sm text-gray-800 pr-3 align-middle font-medium">
                        ${p.nombre}
                    </td>
                    <td class="py-4 text-[11px] sm:text-xs text-wood font-medium tracking-wide uppercase hidden sm:table-cell align-middle">
                        ${p.categoria}
                    </td>
                    <td class="py-4 whitespace-nowrap text-sm text-center align-middle px-3">
                        <span class="${warningClase} bg-white px-2.5 py-1 rounded-md border border-beige-200 inline-block w-16 text-center shadow-sm relative group cursor-help">
                            ${p.stock_actual}
                        </span>
                    </td>
                    <td class="py-4 whitespace-nowrap text-right pl-2 pr-2 w-max">
                        <!-- Botón Sumar Stock -->
                        <button onclick="window.ajustarStock('${p.id}', '${nombreSeguro}', 'add')" class="text-gray-400 hover:text-success p-1.5 transition-colors rounded-full hover:bg-green-50 mr-0.5" title="Añadir stock (Reabastecimiento)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <!-- Botón Restar Stock -->
                        <button onclick="window.ajustarStock('${p.id}', '${nombreSeguro}', 'sub')" class="text-gray-400 hover:text-orange-500 p-1.5 transition-colors rounded-full hover:bg-orange-50 mr-0.5" title="Restar stock (Rotura o Pérdida)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <!-- Botón Eliminar Producto -->
                        <button onclick="window.eliminarProducto('${p.id}', '${nombreSeguro}')" class="text-gray-300 hover:text-danger p-1.5 transition-colors rounded-full hover:bg-red-50" title="Eliminar Producto Final">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        tablaStockActual.innerHTML = html;
    }

    async function cargarHistorialCaja() {
        if (!supabase) return;
        statusCaja.textContent = 'Actualizando...';
        
        const { data, error } = await supabase
            .from('operaciones_caja')
            .select('*')
            .order('fecha_operacion', { ascending: false });

        if (error) {
            statusCaja.textContent = 'Error conexión';
            console.error(error);
            return;
        }

        const cajaSection = document.getElementById('cajaSection');
        if (data.length > 0) cajaSection.classList.remove('hidden');

        tablaMovimientos.innerHTML = '';
        let balance = 0;

        data.forEach(mov => {
            // Ajustar balance
            if (mov.tipo_operacion === 'INGRESO') balance += parseFloat(mov.monto);
            if (mov.tipo_operacion === 'EGRESO') balance -= parseFloat(mov.monto);

            const [year, month, day] = mov.fecha_operacion.split('T')[0].split('-');
            const colorMonto = mov.tipo_operacion === 'INGRESO' ? 'text-success font-medium' : 'text-danger';
            const signoMonto = mov.tipo_operacion === 'INGRESO' ? '+ ' : '- ';

            const tr = document.createElement('tr');
            const conceptoSeguro = (mov.concepto || 'Operación').replace(/'/g, "\\'");
            tr.innerHTML = `
                <td class="py-4 whitespace-nowrap text-[11px] sm:text-sm text-gray-500 pr-2 align-top w-20">
                    ${day}/${month}
                </td>
                <td class="py-4 text-xs sm:text-sm text-gray-800 pr-2 pb-5">
                    <span class="block text-gray-900 font-medium whitespace-break-spaces">${mov.concepto}</span>
                    <span class="block text-[10px] text-wood font-medium uppercase mt-1.5">${mov.categoria} - ${mov.medio_pago}</span>
                </td>
                <td class="py-4 whitespace-nowrap text-xs sm:text-sm tracking-wide text-right ${colorMonto} align-top font-semibold">
                    ${signoMonto}${formatearMoneda(mov.monto)}
                </td>
                <td class="py-4 whitespace-nowrap text-right pl-2 pr-2 align-top">
                    <button onclick="window.borrarOperacion('${mov.id}', '${conceptoSeguro}')" class="text-gray-300 hover:text-danger p-1 transition-colors rounded hover:bg-red-50" title="Eliminar Registro">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            tablaMovimientos.appendChild(tr);
        });

        // Ui status y total
        statusCaja.textContent = `${data.length} reg.`;
        balanceTotalEl.textContent = formatearMoneda(balance);
        balanceTotalEl.className = 'text-3xl font-bold font-serif transition-colors ' + 
            (balance > 0 ? 'text-success' : (balance < 0 ? 'text-danger' : 'text-dark'));
    }

    // ==========================================
    // 5. GESTIÓN CATÁLOGO DIRECTO
    // ==========================================
    
    // Crear Nuevo Producto (Con Color y Stock Inicial)
    formNuevoProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let nombreCargado = nuevoProdNombre.value.trim();
        const categoria = nuevoProdCat.value.trim();
        const color = nuevoProdColor.value; 
        const stockIn = parseInt(nuevoProdStock.value, 10) || 0;
        
        if (!nombreCargado || !categoria) return;

        // Si hay color seleccionado, concatenarlo al nombre para manejar variante de stock
        if (color) {
            nombreCargado = `${nombreCargado} (${color})`;
        }

        btnToggleNuevoProd.innerHTML = "Guardando...";

        try {
            // Se inserta en 'productos' con el stock inicial pedido.
            // Para el MVP esto carga el inicio evitando tener que tocar "movimientos_stock"
            const { error } = await supabase.from('productos').insert([{
                nombre: nombreCargado,
                categoria: categoria,
                stock_actual: stockIn
            }]);

            if (error) throw error;

            formNuevoProducto.reset();
            formNuevoProducto.classList.add('hidden');
            await cargarProductos(); // refrescamos interfaz

        } catch (err) {
            alert("Error al crear producto: " + err.message);
        } finally {
            btnToggleNuevoProd.innerHTML = "+ Nuevo Producto";
        }
    });

    // Ajustar Stock (Ingreso o Egreso manual sin dinero)
    window.ajustarStock = async (id, nombre, accion) => {
        const esSuma = accion === 'add';
        const txtPrompt = esSuma ? `Has seleccionado: ${nombre}\n¿Cuántas unidades NUEVAS ingresaron al inventario?` : `Has seleccionado: ${nombre}\n¿Cuántas unidades quieres DAR DE BAJA (por roturas o pérdidas)?`;
        
        const respuesta = prompt(txtPrompt);
        
        if (!respuesta) return; // Canceló o dejó vacío
        
        const cantidadNumerica = parseInt(respuesta, 10);
        if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
            alert("Por favor ingresa un número válido mayor a 0.");
            return;
        }

        const txtConf = esSuma ? `AGREGAR ${cantidadNumerica} unidades` : `REDUCIR ${cantidadNumerica} unidades`;
        const confirmar = confirm(`¿Confirmas que quieres ${txtConf} al inventario de "${nombre}"?\n(Esto no afecta la caja de dinero).`);
        if (!confirmar) return;

        try {
            // Creamos un movimiento_stock de tipo INGRESO o EGRESO. Esto disparará el Trigger y ajustará el stock
            const mv_stock = {
                producto_id: id,
                operacion_caja_id: null, // Sin impacto en caja
                tipo_movimiento: esSuma ? 'INGRESO' : 'EGRESO',
                cantidad: cantidadNumerica,
                detalle: esSuma ? 'Reabastecimiento de stock (Manual)' : 'Baja por rotura/pérdida (Manual)',
                fecha_movimiento: new Date().toISOString()
            };

            const { error } = await supabase.from('movimientos_stock').insert([mv_stock]);

            if (error) {
                if (error.message.includes('stock insuficiente') || error.message.includes('check_stock_positivo')) {
                    throw new Error("No tienes stock suficiente para realizar esta baja.");
                }
                throw error;
            }

            alert(esSuma ? `✅ Stock agregado con éxito.` : `✅ Stock reducido correctamente.`);
            await cargarProductos(); // Refrescar

        } catch (err) {
            alert("Acción fallida:\n\n" + err.message);
        }
    };

    // Eliminar Producto (Global function for inline onclick)
    window.eliminarProducto = async (id, nombre) => {
        const confirmar = confirm(`¿Estás seguro de que deseas eliminar permanentemente "${nombre}" de tu catálogo?`);
        if (!confirmar) return;

        try {
            const { error } = await supabase.from('productos').delete().eq('id', id);

            if (error) {
                if (error.code === '23503') {
                    throw new Error("No puedes eliminar este producto porque ya tiene movimientos de historia asociados. Sugerencia: Mantenlo con stock 0.");
                }
                throw error;
            }

            await cargarProductos();

        } catch (err) {
            alert("Acción denegada:\n\n" + err.message);
        }
    };

    // Borrar Operación de Caja y Devolver Stock si corresponde
    window.borrarOperacion = async (idCaja, concepto) => {
        const confirmar = confirm(`🛑 ¿Seguro que deseas ELIMINAR permanentemente esta operación de tu caja?\n\n"${concepto}"\n\n(Si incluía mercadería, el inventario será devuelto automáticamente).`);
        if (!confirmar) return;

        try {
            loadingOverlay.classList.remove('hidden');

            // 1. Revisar qué movimientos físicos de stock tuvo
            const { data: stockMovs } = await supabase.from('movimientos_stock').select('*').eq('operacion_caja_id', idCaja);

            // 2. Por cada movimiento, devolver la unidad a mano si fue borrada la operación
            if (stockMovs && stockMovs.length > 0) {
                for (const sm of stockMovs) {
                    // Fetch el producto actual para saber cuanto stock le queda
                    const { data: prodData } = await supabase.from('productos').select('stock_actual').eq('id', sm.producto_id).single();
                    
                    if (prodData) {
                        // REVERTIR LÓGICA: Si antes fue EGRESO (Vendimos sillas), ahora RE-SUMAMOS stock.
                        const cantidadARevertir = sm.tipo_movimiento === 'EGRESO' ? sm.cantidad : -sm.cantidad;
                        
                        await supabase.from('productos')
                            .update({ stock_actual: Math.max(0, prodData.stock_actual + cantidadARevertir) })
                            .eq('id', sm.producto_id);
                    }
                    
                    // Obligatorio borrar primero los movimientos foráneos antes de "Caja"
                    await supabase.from('movimientos_stock').delete().eq('id', sm.id);
                }
            }

            // 3. Borrar el registro del fajo de dinero final.
            const { error: errBorrar } = await supabase.from('operaciones_caja').delete().eq('id', idCaja);
            if (errBorrar) throw errBorrar;

            // 4. Éxito
            await Promise.all([cargarHistorialCaja(), cargarProductos()]);

        } catch(err) {
            console.error(err);
            alert("Ups, no se pudo borrar: " + err.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    };

    // ==========================================
    // 6. REGISTRAR OPERACIONES DE CAJA
    // ==========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!supabase) {
            alert("No puedes guardar porque falta el enlace a Supabase en main.js");
            return;
        }

        const operacion = {
            tipo_operacion: tipoMov.value,
            categoria: categoriaCaja.value,
            concepto: detalleInput.value.trim(),
            monto: parseFloat(montoInput.value) || 0,
            medio_pago: medioPago.value,
            fecha_operacion: fechaInput.value + 'T00:00:00Z'
        };

        const prod_id = productoSelect.value; 
        const qty = parseInt(cantidadInput.value, 10) || 1;

        if (operacion.monto <= 0) return alert("El monto debe ser mayor a cero.");

        loadingOverlay.classList.remove('hidden');

        try {
            // 1. Efectivo de caja
            const { data: cajaData, error: cajaError } = await supabase
                .from('operaciones_caja')
                .insert([operacion])
                .select();

            if (cajaError) throw cajaError;
            const operacionCajaId = cajaData[0].id;

            // 2. Transacción de mercancía
            if (prod_id !== 'NONE') {
                const tipoStock = operacion.tipo_operacion === 'INGRESO' ? 'EGRESO' : 'INGRESO';

                const mv_stock = {
                    producto_id: prod_id,
                    operacion_caja_id: operacionCajaId,
                    tipo_movimiento: tipoStock,
                    cantidad: qty,
                    fecha_movimiento: operacion.fecha_operacion
                };

                const { error: stockError } = await supabase
                    .from('movimientos_stock')
                    .insert([mv_stock]);

                if (stockError) {
                    throw new Error("No hay stock suficiente para esta venta. Error: " + stockError.message);
                }
            }

            form.reset();
            fechaInput.value = hoyISO;
            tipoMov.value = 'INGRESO'; actCatCaja();
            productoSelect.value = 'NONE'; cantidadInput.disabled = true;

            await Promise.all([cargarProductos(), cargarHistorialCaja()]);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error(err);
            alert("Error al intentar grabar en la nube:\n\n" + (err.message || JSON.stringify(err)));
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    btnActualizarStock.addEventListener('click', () => {
        btnActualizarStock.classList.add('animate-spin');
        cargarProductos().finally(() => btnActualizarStock.classList.remove('animate-spin'));
    });

    function formatearMoneda(num) {
        return parseFloat(num).toLocaleString('es-AR', {
            style: 'currency', currency: 'ARS', minimumFractionDigits: 2
        });
    }

    inicializarApp();
});
