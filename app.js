var sectorActivo = "";
var inventarioCompleto = [];
var listaSalida = [];

const USUARIOS = {
    "admin": "admin123", "brus laguna": "enee2026", "choluteca": "enee2026", "comayagua": "enee2026",
    "danli": "enee2026", "el progreso": "enee2026", "juticalpa": "enee2026", "la ceiba": "enee2026",
    "san pedro sula": "enee2026", "santa barbara": "enee2026", "santa rosa": "enee2026",
    "santa cruz": "enee2026", "tegucigalpa": "enee2026", "tocoa": "enee2026"
};

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
            <div style="color: var(--accent);">${m.codigo}</div>
            <div style="text-align: left;">${m.nombre}</div>
            <div>${m.cantidadPedida}</div>
            <div onclick="quitar(${index})" style="color:#e74c3c; cursor:pointer;"><i class="fas fa-trash"></i></div>
        </div>
    `).join('');
}

function quitar(idx) { listaSalida.splice(idx, 1); renderLista(); }

async function generarPDFTraslado() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/traslado_materiales/refs/heads/main/imagenes/UTCD%20Vertical.png";

    if (listaSalida.length === 0) return alert("Agregue materiales");

    // 1. MARCO EXTERIOR (Como en Poda)
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287); 

    // 2. ENCABEZADO CON LOGO CENTRADO
    try { doc.addImage(logoUrl, 'PNG', 85, 12, 40, 22); } catch (e) {}
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("UNIDAD TÉCNICA DE CONTROL DE DISTRIBUCIÓN", 105, 42, {align: 'center'});
    doc.setFontSize(12);
    doc.text("COMPROBANTE DE TRASLADO DE MATERIALES", 105, 48, {align: 'center'});

    // 3. BLOQUE DE INFORMACIÓN (Con recuadro gris suave)
    doc.setFillColor(240, 240, 240); doc.rect(10, 55, 190, 25, 'F');
    doc.setDrawColor(150); doc.rect(10, 55, 190, 25);
    
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`SECTOR ORIGEN: ${sectorActivo}`, 15, 62);
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 130, 62);
    doc.text(`ENCARGADO ASIGNACIÓN: ${encargado.toUpperCase()}`, 15, 69);
    doc.text(`CUADRILLA / RECIBE: ${cuadrilla.toUpperCase()}`, 15, 76);

    // 4. TABLA DE MATERIALES
    const tablaBody = listaSalida.map(m => [m.codigo, m.nombre, m.cantidadPedida]);
    doc.autoTable({
        startY: 85,
        head: [['CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'CANTIDAD']],
        body: tablaBody,
        theme: 'grid',
        headStyles: { fillColor: [244, 196, 48], textColor: 0, halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 35 }, 2: { halign: 'center', cellWidth: 25 } },
        margin: { left: 10, right: 10 }
    });

    // 5. ÁREA DE FIRMAS
    const finalY = Math.max(doc.lastAutoTable.finalY + 30, 250);
    doc.line(30, finalY, 90, finalY);
    doc.text("ENTREGADO POR", 60, finalY + 5, {align: 'center'});
    
    doc.line(120, finalY, 180, finalY);
    doc.text("RECIBIDO CONFORME", 150, finalY + 5, {align: 'center'});

    doc.save(`Traslado_ENEE_${sectorActivo}.pdf`);
}
