var sectorActivo = "";
var inventarioCompleto = [];
var listaSalida = [];

const USUARIOS = {
    "admin": "admin123", "brus laguna": "enee2026", "choluteca": "enee2026", "comayagua": "enee2026",
    "danli": "enee2026", "el progreso": "enee2026", "juticalpa": "enee2026", "la ceiba": "enee2026",
    "san pedro sula": "enee2026", "santa barbara": "enee2026", "santa rosa": "enee2026",
    "santa cruz": "enee2026", "tegucigalpa": "enee2026", "tocoa": "enee2026"
};

// Carga el inventario desde Google Sheets
async function cargarDatosGoogleSheets() {
    const sheetID = "15FfY5O9CXIBA0RUcwqJMqHLbrOFRmu4ssgZ9xhPa44A";
    const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv`;
    try {
        const res = await fetch(url);
        const data = await res.text();
        const filas = data.split('\n').slice(1);
        inventarioCompleto = filas.map(f => {
            const c = f.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, ''));
            return { codigo: c[2], nombre: c[3], stock: parseInt(c[5]) || 0, tipo: c[6] };
        });
        llenarTipos();
    } catch (e) { alert("Error cargando Inventario"); }
}

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;
    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-traslado-container').style.display = 'block';
        document.getElementById('user-display').innerText = "SECTOR: " + sectorActivo;
        cargarDatosGoogleSheets();
    } else { document.getElementById('login-error').style.display = 'block'; }
}

function llenarTipos() {
    const select = document.getElementById('filtro-tipo');
    const tipos = [...new Set(inventarioCompleto.map(i => i.tipo))].sort();
    select.innerHTML = '<option value="">Seleccione Tipo...</option>';
    tipos.forEach(t => { if(t) select.innerHTML += `<option value="${t}">${t}</option>`; });
}

function filtrarMateriales() {
    const tipo = document.getElementById('filtro-tipo').value;
    const select = document.getElementById('seleccion-material');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">[${i.codigo}] - ${i.nombre} (Stock: ${i.stock})</option>`;
    });
}

function agregarALista() {
    const cod = document.getElementById('seleccion-material').value;
    const cant = parseInt(document.getElementById('cantidad-input').value);
    const item = inventarioCompleto.find(i => i.codigo === cod);
    if (!item || isNaN(cant) || cant <= 0) return alert("Datos inválidos");
    if (cant > item.stock) return alert(`Stock insuficiente (${item.stock})`);
    listaSalida.push({ ...item, cantidadPedida: cant });
    renderLista();
    document.getElementById('cantidad-input').value = "";
}

function renderLista() {
    const div = document.getElementById('lista-previa');
    if (listaSalida.length === 0) {
        div.innerHTML = '<p style="font-size: 0.7rem; color: #9aa7b1; text-align: center;">Lista vacía</p>';
        return;
    }
    div.innerHTML = listaSalida.map((m, index) => `
        <div style="display: grid; grid-template-columns: 2fr 4fr 2fr 1fr; gap: 5px; align-items: center; border-bottom: 1px solid #2c3e50; padding: 8px 0; font-size: 0.7rem; text-align: center;">
            <div style="color: var(--accent); font-weight: bold;">${m.codigo}</div>
            <div style="text-align: left; padding-left: 5px;">${m.nombre}</div>
            <div>${m.cantidadPedida}</div>
            <div onclick="quitar(${index})" style="color:#e74c3c; cursor:pointer;"><i class="fas fa-trash"></i></div>
        </div>
    `).join('');
}

function quitar(idx) { listaSalida.splice(idx, 1); renderLista(); }

// ============================================================
// FUNCIÓN PARA GENERAR EL PDF BASADO EN EL DISEÑO EXCEL
// ============================================================
async function generarPDFTraslado() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/traslado_materiales/refs/heads/main/imagenes/UTCD%20Vertical.png";

    if (listaSalida.length === 0) return alert("Agregue materiales a la lista");

    // 1. MARCO PERIMETRAL (Rectángulo que encierra toda la hoja)
    doc.setDrawColor(0); 
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277); 

    // 2. CAJETÍN SUPERIOR (Dividido en 3 partes como el Excel)
    // Parte 1: LOGO (Izquierda)
    doc.rect(10, 10, 60, 30); 
    try { doc.addImage(logoUrl, 'PNG', 15, 13, 50, 24); } catch (e) {}

    // Parte 2: TÍTULO Y SECTOR (Centro)
    doc.rect(70, 10, 75, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TRASLADO DE MATERIALES", 107.5, 22, {align: 'center'});
    doc.setFontSize(10);
    doc.text(`SECTOR ${sectorActivo}`, 107.5, 28, {align: 'center'});

    // Parte 3: CONTROL (Derecha - Código, Versión, Fecha)
     // El cuadro principal mide 55 de ancho (25 + 30) y 30 de alto (10 + 10 + 10)
    doc.rect(145, 10, 55, 30); 
    
    // Línea vertical que divide las dos columnas (145 + 25 = 170)
    doc.line(170, 10, 170, 40);

    // Líneas horizontales para crear las 3 filas de 10mm de alto
    doc.line(145, 20, 200, 20); // Primera división
    doc.line(145, 30, 200, 30); // Segunda división

    doc.setFontSize(8);
    
    // Fila 1: Código
    doc.text("Código:", 147, 16); 
    doc.text("", 172, 16); // Espacio vacío columna 2
    
    // Fila 2: Versión
    doc.text("Versión:", 147, 26); 
    doc.text("1", 172, 26);    // Valor "1" en columna 2
    
    // Fila 3: Fecha
    doc.text("Fecha:", 147, 36); 
    doc.text("", 172, 36); // Fecha actual en columna 2

    // 3. BLOQUE DE INFORMACIÓN GENERAL
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL TRASLADO:", 15, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 15, 54);
    doc.text(`ENCARGADO ASIGNACIÓN: ${encargado.toUpperCase()}`, 15, 60);
    doc.text(`CUADRILLA / RECIBE: ${cuadrilla.toUpperCase()}`, 15, 66);
    doc.line(10, 70, 200, 70); // Línea de cierre del bloque

    // 4. TABLA DE MATERIALES (Cuerpo del reporte)
    const tablaBody = listaSalida.map(m => [m.codigo, m.nombre, m.cantidadPedida]);
    doc.autoTable({
        startY: 75,
        head: [['CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'CANTIDAD']],
        body: tablaBody,
        theme: 'grid',
        headStyles: { fillColor: [244, 196, 48], textColor: 0, halign: 'center', fontSize: 9 },
        columnStyles: { 0: { halign: 'center', cellWidth: 35 }, 2: { halign: 'center', cellWidth: 25 } },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
    });

    // 5. SECCIÓN DE FIRMAS (Al final del marco)
    const finalY = 270;
    doc.line(30, finalY, 90, finalY);
    doc.text("ENTREGADO POR (ASIGNADO)", 60, finalY + 5, {align: 'center'});
    
    doc.line(120, finalY, 180, finalY);
    doc.text("RECIBIDO CONFORME (CUADRILLA)", 150, finalY + 5, {align: 'center'});

    doc.save(`Traslado_Material_${sectorActivo}.pdf`);
}
