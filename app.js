var sectorActivo = "";
var inventarioCompleto = [];
var listaSalida = [];

// Variables para la lógica de firmas
var canvasEntrega, ctxEntrega;
var canvasRecibe, ctxRecibe;
var dibujando = false;

const USUARIOS = {
    "brus laguna": "enee2026", "choluteca": "enee2026", "comayagua": "enee2026",
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
                codigo: c[2], 
                nombre: c[3], 
                unidad: c[4], 
                stock: parseInt(c[5]) || 0, 
                tipo: c[6] 
            };
        });
        llenarTipos();
    } catch (e) { alert("Error cargando Inventario"); }
}

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;
    const errorDiv = document.getElementById('login-error');

    if (USUARIOS[u] && USUARIOS[u] === p) {
        if(errorDiv) errorDiv.style.display = 'none';
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-traslado-container').style.display = 'block';
        document.getElementById('user-display').innerText = "SECTOR: " + sectorActivo;
        cargarDatosGoogleSheets();
        setTimeout(prepararCanvases, 500); 
    } else { 
        if(errorDiv) errorDiv.style.display = 'block';
        document.getElementById('pass').value = "";
    }
}

function llenarTipos() {
    const select = document.getElementById('filtro-tipo');
    const tipos = [...new Set(inventarioCompleto.map(i => i.tipo))].sort();
    select.innerHTML = '<option value="">Seleccione Tipo...</option>';
    tipos.forEach(t => { if(t) select.innerHTML += `<option value="${t}">${t}</option>`; });
}

// CORREGIDO: Ahora vuelve a mostrar el Stock en el selector junto con la unidad
function filtrarMateriales() {
    const tipo = document.getElementById('filtro-tipo').value;
    const select = document.getElementById('seleccion-material');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">[${i.codigo}] - ${i.nombre} (${i.unidad}) - Stock: ${i.stock}</option>`;
    });
}

function agregarALista() {
    const cod = document.getElementById('seleccion-material').value;
    const cant = parseInt(document.getElementById('cantidad-input').value);
    const item = inventarioCompleto.find(i => i.codigo === cod);
    if (!item || isNaN(cant) || cant <= 0) return alert("Datos inválidos");
    
    if (cant > item.stock) {
        alert(`AVISO: La cantidad (${cant}) supera el stock (${item.stock}). Se registrará por posible desfase.`);
    }
    
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
    let html = `
        <div style="display: grid; grid-template-columns: 0.5fr 1fr 2fr 1fr 1fr 0.5fr; gap: 5px; align-items: center; border-bottom: 2px solid var(--accent); padding-bottom: 5px; font-size: 0.65rem; font-weight: bold; text-align: center;">
            <div>ITEM</div><div>CÓDIGO</div><div>DESCRIPCIÓN</div><div>UNIDAD</div><div>CANT.</div><div></div>
        </div>`;

    html += listaSalida.map((m, index) => `
        <div style="display: grid; grid-template-columns: 0.5fr 1fr 2fr 1fr 1fr 0.5fr; gap: 5px; align-items: center; border-bottom: 1px solid #2c3e50; padding: 8px 0; font-size: 0.7rem; text-align: center;">
            <div style="color: #9aa7b1;">${index + 1}</div>
            <div style="color: var(--accent); font-weight: bold;">${m.codigo}</div>
            <div style="text-align: left; padding-left: 5px;">${m.nombre}</div>
            <div>${m.unidad}</div>
            <div style="font-weight: bold;">${m.cantidadPedida}</div>
            <div onclick="quitar(${index})" style="color:#e74c3c; cursor:pointer;"><i class="fas fa-trash"></i></div>
        </div>
    `).join('');
    div.innerHTML = html;
}

function quitar(idx) { listaSalida.splice(idx, 1); renderLista(); }

function prepararCanvases() {
    canvasEntrega = document.getElementById('canvas-entrega');
    ctxEntrega = configurarCanvas(canvasEntrega);
    canvasRecibe = document.getElementById('canvas-recibe');
    ctxRecibe = configurarCanvas(canvasRecibe);
}

function configurarCanvas(canv) {
    if(!canv) return;
    const context = canv.getContext('2d');
    canv.width = canv.offsetWidth;
    canv.height = canv.offsetHeight;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#000';
    const obtenerPos = (e) => {
        const rect = canv.getBoundingClientRect();
        const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
        const clienteY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clienteX - rect.left, y: clienteY - rect.top };
    }
    const iniciar = (e) => { dibujando = true; const p = obtenerPos(e); context.beginPath(); context.moveTo(p.x, p.y); if(e.touches) e.preventDefault(); }
    const mover = (e) => { if(!dibujando) return; const p = obtenerPos(e); context.lineTo(p.x, p.y); context.stroke(); if(e.touches) e.preventDefault(); }
    canv.addEventListener('mousedown', iniciar);
    canv.addEventListener('mousemove', mover);
    canv.addEventListener('touchstart', iniciar, {passive: false});
    canv.addEventListener('touchmove', mover, {passive: false});
    window.addEventListener('mouseup', () => dibujando = false);
    window.addEventListener('touchend', () => dibujando = false);
    return context;
}

function abrirFirma() {
    if(listaSalida.length === 0) return alert("Agregue materiales");
    document.getElementById('modal-firma').style.display = 'flex';
    setTimeout(prepararCanvases, 200);
}

function cerrarFirma() { document.getElementById('modal-firma').style.display = 'none'; }

function limpiarFirma(tipo) {
    if(tipo === 'entrega') ctxEntrega.clearRect(0, 0, canvasEntrega.width, canvasEntrega.height);
    else ctxRecibe.clearRect(0, 0, canvasRecibe.width, canvasRecibe.height);
}

function finalizarYGenerar() {
    if (isCanvasVacio(canvasEntrega)) return alert("La firma del que entrega es obligatoria.");
    const fEnt = canvasEntrega.toDataURL('image/png');
    const fRec = isCanvasVacio(canvasRecibe) ? null : canvasRecibe.toDataURL('image/png');
    cerrarFirma();
    generarPDFTraslado(fEnt, fRec);
}

function isCanvasVacio(canv) {
    const ctx = canv.getContext('2d');
    const pixels = ctx.getImageData(0,0,canv.width, canv.height).data;
    for(let i=3; i<pixels.length; i+=4) { if(pixels[i] !== 0) return false; }
    return true;
}

async function generarPDFTraslado(firmaEntrega, firmaRecibe) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;
    const logoUrl = "https://raw.githubusercontent.com/proyectosjdop-alfa/traslado_materiales/refs/heads/main/imagenes/UTCD%20Vertical.png";

    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277); 
    doc.rect(10, 10, 60, 30); 
    try { doc.addImage(logoUrl, 'PNG', 15, 13, 50, 24); } catch (e) {}
    doc.rect(70, 10, 75, 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("TRASLADO DE MATERIALES", 107.5, 22, {align: 'center'});
    doc.setFontSize(10);
    doc.text(`SECTOR ${sectorActivo}`, 107.5, 28, {align: 'center'});
    doc.rect(145, 10, 55, 30); 
    doc.line(170, 10, 170, 40); doc.line(145, 20, 200, 20); doc.line(145, 30, 200, 30);
    doc.setFontSize(8);
    doc.text("Código:", 147, 16); doc.text("Versión:", 147, 26); doc.text("1", 172, 26); 
    doc.text("Fecha:", 147, 36); doc.text(new Date().toLocaleDateString(), 172, 36);

    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL TRASLADO:", 15, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 15, 54);
    doc.text(`ENCARGADO ASIGNACIÓN: ${encargado.toUpperCase()}`, 15, 60);
    doc.text(`CUADRILLA / RECIBE: ${cuadrilla.toUpperCase()}`, 15, 66);
    doc.line(10, 70, 200, 70);

    const tablaBody = listaSalida.map((m, index) => [
        index + 1,
        m.codigo,
        m.nombre,
        m.unidad,
        m.cantidadPedida
    ]);

    doc.autoTable({
        startY: 75,
        head: [['ITEM', 'CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'UNIDAD', 'CANTIDAD']],
        body: tablaBody,
        theme: 'grid',
        headStyles: { fillColor: [244, 196, 48], textColor: 0, halign: 'center', fontSize: 9 },
        columnStyles: { 
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'left' },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 25 }
        },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
    });

    const finalY = 270;
    doc.addImage(firmaEntrega, 'PNG', 35, finalY - 25, 40, 20);
    doc.line(30, finalY, 90, finalY);
    doc.text("ENTREGADO POR (ASIGNADO)", 60, finalY + 5, {align: 'center'});
    if(firmaRecibe) { doc.addImage(firmaRecibe, 'PNG', 125, finalY - 25, 40, 20); }
    doc.line(120, finalY, 180, finalY);
    doc.text("RECIBIDO CONFORME (CUADRILLA)", 150, finalY + 5, {align: 'center'});

    doc.save(`Traslado_Material_${sectorActivo}.pdf`);
}
