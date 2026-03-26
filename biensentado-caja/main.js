document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementos del DOM
    const form = document.getElementById('registroForm');
    const tipoMovimiento = document.getElementById('tipoMovimiento');
    const categoriaSelect = document.getElementById('categoria');
    const fechaInput = document.getElementById('fecha');
    
    const cajaSection = document.getElementById('cajaSection');
    const tablaMovimientos = document.getElementById('tablaMovimientos');
    const balanceTotalEl = document.getElementById('balanceTotal');
    
    // Categorías según tipo
    const categorias = {
        ingreso: ['Sillas', 'Mesas', 'Sillones', 'Otros'],
        egreso: ['Proveedores', 'Flete', 'Servicios (Luz/Agua)', 'Sueldos', 'Publicidad', 'Varios']
    };

    // Estado local de movimientos
    let movimientos = [];

    // 2. Inicialización
    
    // Setear fecha hoy por defecto
    const hoy = new Date();
    // Ajustar por zona horaria local para no tener un desfase de 1 día
    const offset = hoy.getTimezoneOffset();
    const localDate = new Date(hoy.getTime() - (offset*60*1000));
    const hoyISO = localDate.toISOString().split('T')[0];
    fechaInput.value = hoyISO;

    // Poblar select de categorías inicial
    actualizarCategorias();

    // 3. Event Listeners
    tipoMovimiento.addEventListener('change', actualizarCategorias);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Extraer valores
        const tipo = tipoMovimiento.value;
        const categoria = categoriaSelect.value;
        const detalle = document.getElementById('detalle').value.trim();
        const montoStr = document.getElementById('monto').value;
        const monto = parseFloat(montoStr) || 0;
        const medioPago = document.getElementById('medioPago').value;
        const fechaVal = fechaInput.value;
        
        // Validación
        if (!detalle || monto <= 0 || !fechaVal) {
            alert('Por favor completa todos los campos correctamente.');
            return;
        }

        // Crear objeto de movimiento
        const nMovimiento = {
            id: Date.now(),
            tipo,
            categoria,
            detalle,
            monto,
            medioPago,
            fecha: fechaVal
        };

        // Cargar animación (simulamos que el backend guarda y refresca UI)
        document.activeElement.blur(); // Quitar foco al botón en mobile
        
        // Guardar local
        movimientos.push(nMovimiento);
        
        // Renderizar / Actualizar UI
        renderTabla();
        
        // Reset de campos específicos
        form.reset();
        
        // Restaurar estado base para agilidad en data entry
        tipoMovimiento.value = 'ingreso';
        actualizarCategorias(); 
        fechaInput.value = hoyISO;
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir top para ver todo ok y/o agregar
    });

    // 4. Funciones Auxiliares

    function actualizarCategorias() {
        const tipo = tipoMovimiento.value; 
        const lista = categorias[tipo] || [];
        
        categoriaSelect.innerHTML = '';
        
        lista.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categoriaSelect.appendChild(opt);
        });
    }

    function renderTabla() {
        if (movimientos.length > 0) {
            cajaSection.classList.remove('hidden');
        }

        tablaMovimientos.innerHTML = '';
        let balance = 0;

        const movOrdenados = [...movimientos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);

        movOrdenados.forEach((mov) => {
            if (mov.tipo === 'ingreso') {
                balance += mov.monto;
            } else {
                balance -= mov.monto;
            }

            const tr = document.createElement('tr');
            tr.className = "animate-fade-in";
            
            const [y, m, d] = mov.fecha.split('-');
            const fechaLabel = `${d}/${m}/${y}`;
            
            const textoMontoColor = mov.tipo === 'ingreso' ? 'text-success font-medium' : 'text-danger';
            const signoMonto = mov.tipo === 'ingreso' ? '+ ' : '- ';

            tr.innerHTML = `
                <td class="py-4 whitespace-nowrap text-sm text-gray-500 pr-3 align-top min-w-max">
                    ${fechaLabel}
                </td>
                <td class="py-4 text-sm text-gray-800 pr-3">
                    <span class="block text-gray-900 font-medium whitespace-break-spaces">${mov.detalle}</span>
                    <span class="block text-[11px] text-wood font-medium uppercase tracking-wide mt-1">${mov.categoria}</span>
                </td>
                <td class="py-4 text-sm text-gray-500 hidden sm:table-cell align-top text-center w-32">
                    <span class="inline-block bg-beige-100 px-2 py-1 rounded-md text-xs border border-beige-200">${mov.medioPago}</span>
                </td>
                <td class="py-4 whitespace-nowrap text-sm tracking-wide text-right ${textoMontoColor} align-top">
                    ${signoMonto}${formatearMoneda(mov.monto)}
                </td>
            `;

            tablaMovimientos.appendChild(tr);
        });

        // Actualizar estado Balance
        balanceTotalEl.textContent = formatearMoneda(balance);
        balanceTotalEl.className = 'text-3xl font-bold font-serif transition-colors duration-300 ' + 
            (balance > 0 ? 'text-success' : (balance < 0 ? 'text-danger' : 'text-dark'));
    }

    function formatearMoneda(num) {
        return num.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
});
