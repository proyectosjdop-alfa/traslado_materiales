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
            return {
                codigo: c[2], // CODIGOMATERIAL
                nombre: c[3], // NOMBREMATERIAL
                stock: parseInt(c[5]) || 0, // CANTIDADACTUAL
                tipo: c[6] // NOMBRETIPOMATERIAL
            };
        });
        
        llenarTipos();
    } catch (e) { alert("Error conectando con el Inventario"); }
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
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function llenarTipos() {
    const select = document.getElementById('filtro-tipo');
    const tipos = [...new Set(inventarioCompleto.map(i => i.tipo))].sort();
    select.innerHTML = '<option value="">Seleccione Tipo...</option>';
    tipos.forEach(t => select.innerHTML += `<option value="${t}">${t}</option>`);
}

function filtrarMateriales() {
    const tipo = document.getElementById('filtro-tipo').value;
    const select = document.getElementById('seleccion-material');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">${i.nombre} (Stock: ${i.stock})</option>`;
    });
}

function agregarALista() {
    const cod = document.getElementById('seleccion-material').value;
    const cant = parseInt(document.getElementById('cantidad-input').value);
    const item = inventarioCompleto.find(i => i.codigo === cod);

    if (!item || isNaN(cant) || cant <= 0) return alert("Ingrese datos válidos");
    if (cant > item.stock) return alert(`¡ALERTA! La cantidad (${cant}) supera el stock disponible (${item.stock})`);

    listaSalida.push({ ...item, cantidadPedida: cant });
    renderLista();
    document.getElementById('cantidad-input').value = "";
}

function renderLista() {
    const div = document.getElementById('lista-previa');
    div.innerHTML = listaSalida.map((m, index) => `
        <div class="item-agregado">
            <span><b>${m.cantidadPedida}</b> x ${m.nombre}</span>
            <i class="fas fa-trash" onclick="quitar(${index})" style="color:#e74c3c; cursor:pointer;"></i>
        </div>
    `).join('');
}

function quitar(idx) { listaSalida.splice(idx, 1); renderLista(); }

function generarPDFTraslado() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;

    if (listaSalida.length === 0) return alert("Agregue materiales primero");

    // Encabezado
    doc.setFillColor(22, 35, 47); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(244, 196, 48); doc.setFontSize(18); doc.text("TRASLADO DE MATERIALES - ENEE", 105, 25, {align: 'center'});
    
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text(`SECTOR: ${sectorActivo}`, 15, 50);
    doc.text(`ENCARGADO: ${encargado}`, 15, 57);
    doc.text(`RECIBE: ${cuadrilla}`, 15, 64);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 150, 50);

    const body = listaSalida.map(m => [m.codigo, m.nombre, m.cantidadPedida]);
    doc.autoTable({
        startY: 75,
        head: [['Código', 'Descripción del Material', 'Cantidad']],
        body: body,
        headStyles: { fillColor: [244, 196, 48], textColor: 0 },
    });

    doc.save(`Traslado_Materiales_${sectorActivo}.pdf`);
}
