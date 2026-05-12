var sectorActivo = "";
var inventarioCompleto = [];
var listaSalida = [];

const USUARIOS = {
    "admin": "admin123",
    "brus laguna": "enee2026",
    "choluteca": "enee2026",
    "comayagua": "enee2026",
    "danli": "enee2026",
    "el progreso": "enee2026",
    "juticalpa": "enee2026",
    "la ceiba": "enee2026",
    "san pedro sula": "enee2026",
    "santa barbara": "enee2026",
    "santa rosa": "enee2026",
    "santa cruz": "enee2026",
    "tegucigalpa": "enee2026",
    "tocoa": "enee2026"
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
            // Esta línea limpia los datos que vienen del CSV de Google
            const c = f.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, ''));
            return {
                codigo: c[2], 
                nombre: c[3], 
                stock: parseInt(c[5]) || 0, 
                tipo: c[6] 
            };
        });
        
        llenarTipos();
    } catch (e) { 
        alert("Error: No se pudo conectar con el inventario de Google Sheets."); 
    }
}

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;

    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-traslado-container').style.display = 'block';
        document.getElementById('user-display').innerText = "SECTOR: " + sectorActivo;
        cargarDatosGoogleSheets(); // Cargar inventario al entrar
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function llenarTipos() {
    const select = document.getElementById('filtro-tipo');
    const tipos = [...new Set(inventarioCompleto.map(i => i.tipo))].sort();
    select.innerHTML = '<option value="">Seleccione Tipo...</option>';
    tipos.forEach(t => {
        if(t) select.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

function filtrarMateriales() {
    const tipo = document.getElementById('filtro-tipo').value;
    const select = document.getElementById('seleccion-material');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        // MEJORA: Se muestra [CÓDIGO] antes del nombre
        let visual = `[${i.codigo}] - ${i.nombre}`;
        select.innerHTML += `<option value="${i.codigo}">${visual} (Stock: ${i.stock})</option>`;
    });
}

function agregarALista() {
    const cod = document.getElementById('seleccion-material').value;
    const cant = parseInt(document.getElementById('cantidad-input').value);
    const item = inventarioCompleto.find(i => i.codigo === cod);

    if (!item || isNaN(cant) || cant <= 0) {
        alert("Por favor seleccione un material y una cantidad válida.");
        return;
    }

    if (cant > item.stock) {
        alert(`¡ALERTA! La cantidad solicitada (${cant}) es mayor al stock disponible (${item.stock}).`);
        return;
    }

    listaSalida.push({ ...item, cantidadPedida: cant });
    renderLista();
    
    // Limpiar campos para el siguiente
    document.getElementById('cantidad-input').value = "";
}

function renderLista() {
    const div = document.getElementById('lista-previa');
    if (listaSalida.length === 0) {
        div.innerHTML = '<p style="font-size: 0.7rem; color: #9aa7b1; text-align: center;">No hay materiales agregados</p>';
        return;
    }

    div.innerHTML = listaSalida.map((m, index) => `
        <div style="display: grid; grid-template-columns: 2fr 4fr 2fr 1fr; gap: 5px; align-items: center; border-bottom: 1px solid #2c3e50; padding: 8px 0; font-size: 0.7rem; text-align: center;">
            <div style="color: var(--accent); font-weight: bold;">${m.codigo}</div>
            <div style="text-align: left; padding-left: 5px;">${m.nombre}</div>
            <div style="font-weight: bold;">${m.cantidadPedida}</div>
            <div onclick="quitar(${index})" style="color: #e74c3c; cursor: pointer;"><i class="fas fa-trash"></i></div>
        </div>
    `).join('');
}

function quitar(idx) {
    listaSalida.splice(idx, 1);
    renderLista();
}

async function generarPDFTraslado() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;
    const logoUrl = "https://github.com/proyectosjdop-alfa/app_poda/blob/main/imagenes/UTCD%20Vertical.png?raw=true";

    if (listaSalida.length === 0) {
        alert("Debe agregar al menos un material a la lista.");
        return;
    }

    // 1. Logo Centrado
    try {
        doc.addImage(logoUrl, 'PNG', 82, 10, 45, 25); 
    } catch (e) { console.error("Error cargando logo"); }

    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TRASLADO DE MATERIALES - UTCD", 105, 45, {align: 'center'});

    // Encabezado de información
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`SECTOR: ${sectorActivo}`, 15, 55);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 150, 55);
    doc.text(`ENCARGADO DE ASIGNAR: ${encargado.toUpperCase()}`, 15, 62);
    doc.text(`CUADRILLA QUE RECIBE: ${cuadrilla.toUpperCase()}`, 15, 69);

    // 2. Tabla de Materiales (Librería autoTable)
    const tablaBody = listaSalida.map(m => [m.codigo, m.nombre, m.cantidadPedida]);
    
    doc.autoTable({
        startY: 75,
        head: [['CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'CANTIDAD']],
        body: tablaBody,
        theme: 'grid',
        headStyles: { fillColor: [244, 196, 48], textColor: 0, halign: 'center', fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 35 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 30 }
        },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    // 3. Firmas al final
    const finalY = doc.lastAutoTable.finalY + 35;
    doc.line(20, finalY, 85, finalY);
    doc.text("Firma Entrega (Asignado)", 52.5, finalY + 5, {align: 'center'});
    
    doc.line(125, finalY, 190, finalY);
    doc.text("Firma Recibe (Cuadrilla)", 157.5, finalY + 5, {align: 'center'});

    doc.save(`Traslado_${sectorActivo}_${new Date().toLocaleDateString()}.pdf`);
}
