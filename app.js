var sectorActivo = "";
var inventarioCompleto = [];
var listaSalida = [];       // lista para traslado
var listaSolicitud = [];    // lista para solicitud

// ── Reemplaza con la URL de tu Worker tras desplegarlo ──────────────────────
const WORKER_URL = "https://traslados-api.projects-jdop.workers.dev";

async function enviarACloudflare(endpoint, formData) {
    try {
        const res = await fetch(`${WORKER_URL}${endpoint}`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!data.ok) console.error("Error Cloudflare:", data.error);
        return data;
    } catch (e) {
        console.error("No se pudo conectar al Worker:", e);
        return { ok: false };
    }
}

var canvasEntrega, ctxEntrega;
var canvasRecibe,  ctxRecibe;
var canvasTecnico, ctxTecnico;
var dibujando = false;

const USUARIOS = {
    "brus laguna": "enee2026", "choluteca": "enee2026", "comayagua": "enee2026",
    "danli": "enee2026", "el progreso": "enee2026", "juticalpa": "enee2026", "la ceiba": "enee2026",
    "san pedro sula": "enee2026", "santa barbara": "enee2026", "santa rosa": "enee2026",
    "santa cruz": "enee2026", "tegucigalpa": "enee2026", "tocoa": "enee2026"
};

const SHEET_ID = "15FfY5O9CXIBA0RUcwqJMqHLbrOFRmu4ssgZ9xhPa44A";

// ─── TOGGLE OJO CONTRASEÑA ───────────────────────────────────────────────────
function togglePassword() {
    const input = document.getElementById('pass');
    const icon  = document.getElementById('eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ─── NAVEGACIÓN ──────────────────────────────────────────────────────────────
function irA(modulo) {
    document.getElementById('submenu-container').style.display = 'none';
    if (modulo === 'traslado') {
        document.getElementById('form-traslado-container').style.display = 'block';
        document.getElementById('user-display').innerText = "SECTOR: " + sectorActivo;
    } else {
        document.getElementById('form-solicitud-container').style.display = 'block';
        document.getElementById('user-display-sol').innerText = "SECTOR: " + sectorActivo;
    }
}

function volverMenu() {
    document.getElementById('form-traslado-container').style.display  = 'none';
    document.getElementById('form-solicitud-container').style.display = 'none';
    document.getElementById('submenu-container').style.display        = 'block';
}

// ─── GOOGLE SHEETS ───────────────────────────────────────────────────────────
async function fetchSheetData(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res  = await fetch(url);
    const data = await res.text();
    return data.split('\n').slice(1).map(f => {
        return f.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/"/g, '').trim());
    });
}

async function cargarTodoDesdeGoogle() {
    try {
        // Materiales
        const filasMat = await fetchSheetData("Stock_Materiales");
        inventarioCompleto = filasMat
            .map(c => ({
                sector: c[0], codigo: c[3], nombre: c[4],
                unidad: c[5], stock: parseInt(c[6]) || 0, tipo: c[7]
            }))
            .filter(i => i.sector && i.sector.toUpperCase() === sectorActivo);

        // Encargados (solo traslado)
        const filasEnc = await fetchSheetData("ENC_ASIG");
        const selectEnc = document.getElementById('resp-traslado');
        selectEnc.innerHTML = '<option value="">Seleccione Encargado...</option>';
        filasEnc.forEach(c => {
            if (c[0] && c[0].toUpperCase() === sectorActivo)
                selectEnc.innerHTML += `<option value="${c[1]}">${c[1]}</option>`;
        });

        // Cuadrillas (traslado + solicitud)
        const filasCuad = await fetchSheetData("CUADRILLAS");
        const selectCuad    = document.getElementById('cuadrilla-recibe');
        const selectSolicita = document.getElementById('cuadrilla-solicita');
        selectCuad.innerHTML     = '<option value="">Seleccione Cuadrilla...</option>';
        selectSolicita.innerHTML = '<option value="">Seleccione Cuadrilla...</option>';
        filasCuad.forEach(c => {
            if (c[0] && c[0].toUpperCase() === sectorActivo) {
                const opt = `<option value="${c[1]}">${c[1]}</option>`;
                selectCuad.innerHTML     += opt;
                selectSolicita.innerHTML += opt;
            }
        });

        llenarTipos();

    } catch (e) {
        console.error(e);
        alert("Error cargando datos del Sector");
    }
}

function llenarTipos() {
    const tipos = [...new Set(inventarioCompleto.map(i => i.tipo))].filter(t => t).sort();
    const base  = '<option value="">Seleccione Tipo...</option>';
    const opts  = tipos.length === 0
        ? '<option value="">No hay materiales para este sector</option>'
        : tipos.map(t => `<option value="${t}">${t}</option>`).join('');

    document.getElementById('filtro-tipo').innerHTML     = base + opts;
    document.getElementById('filtro-tipo-sol').innerHTML = base + opts;
}

function filtrarMateriales() {
    const tipo   = document.getElementById('filtro-tipo').value;
    const select = document.getElementById('seleccion-material');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">[${i.codigo}] - ${i.nombre} (${i.unidad}) - Stock: ${i.stock}</option>`;
    });
}

function filtrarMaterialesSol() {
    const tipo   = document.getElementById('filtro-tipo-sol').value;
    const select = document.getElementById('seleccion-material-sol');
    select.innerHTML = '<option value="">Seleccione Material...</option>';
    inventarioCompleto.filter(i => i.tipo === tipo).forEach(i => {
        select.innerHTML += `<option value="${i.codigo}">[${i.codigo}] - ${i.nombre} (${i.unidad}) - Stock: ${i.stock}</option>`;
    });
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;
    const errorDiv = document.getElementById('login-error');

    if (USUARIOS[u] && USUARIOS[u] === p) {
        if (errorDiv) errorDiv.style.display = 'none';
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display   = 'none';
        document.getElementById('submenu-container').style.display = 'block';
        document.getElementById('submenu-sector').innerText        = "SECTOR: " + sectorActivo;
        cargarTodoDesdeGoogle();
        setTimeout(prepararCanvases, 500);
    } else {
        if (errorDiv) errorDiv.style.display = 'block';
        document.getElementById('pass').value = "";
    }
}

// ─── LISTAS ──────────────────────────────────────────────────────────────────
function agregarALista(modulo) {
    const codId  = modulo === 'traslado' ? 'seleccion-material'   : 'seleccion-material-sol';
    const cantId = modulo === 'traslado' ? 'cantidad-input'        : 'cantidad-input-sol';
    const lista  = modulo === 'traslado' ? listaSalida            : listaSolicitud;

    const cod  = document.getElementById(codId).value;
    const cant = parseInt(document.getElementById(cantId).value);
    const item = inventarioCompleto.find(i => i.codigo === cod);

    if (!item || isNaN(cant) || cant <= 0) return alert("Datos inválidos");
    if (cant > item.stock) {
        alert(`AVISO: La cantidad (${cant}) supera el stock (${item.stock}). Se registrará por posible desfase.`);
    }

    lista.push({ ...item, cantidadPedida: cant });
    renderLista(modulo);
    document.getElementById(cantId).value = "";
}

function renderLista(modulo) {
    const lista  = modulo === 'traslado' ? listaSalida  : listaSolicitud;
    const divId  = modulo === 'traslado' ? 'lista-previa' : 'lista-previa-sol';
    const div    = document.getElementById(divId);

    if (lista.length === 0) {
        div.innerHTML = '<p style="font-size:0.7rem;color:#9aa7b1;text-align:center;">Lista vacía</p>';
        return;
    }
    let html = `
        <div style="display:grid;grid-template-columns:0.5fr 1fr 2fr 1fr 1fr 0.5fr;gap:5px;align-items:center;border-bottom:2px solid var(--accent);padding-bottom:5px;font-size:0.65rem;font-weight:bold;text-align:center;">
            <div>ITEM</div><div>CÓDIGO</div><div>DESCRIPCIÓN</div><div>UNIDAD</div><div>CANT.</div><div></div>
        </div>`;
    html += lista.map((m, i) => `
        <div style="display:grid;grid-template-columns:0.5fr 1fr 2fr 1fr 1fr 0.5fr;gap:5px;align-items:center;border-bottom:1px solid #2c3e50;padding:8px 0;font-size:0.7rem;text-align:center;">
            <div style="color:#9aa7b1;">${i + 1}</div>
            <div style="color:var(--accent);font-weight:bold;">${m.codigo}</div>
            <div style="text-align:left;padding-left:5px;">${m.nombre}</div>
            <div>${m.unidad}</div>
            <div style="font-weight:bold;">${m.cantidadPedida}</div>
            <div onclick="quitar('${modulo}',${i})" style="color:#e74c3c;cursor:pointer;"><i class="fas fa-trash"></i></div>
        </div>
    `).join('');
    div.innerHTML = html;
}

function quitar(modulo, idx) {
    if (modulo === 'traslado') listaSalida.splice(idx, 1);
    else listaSolicitud.splice(idx, 1);
    renderLista(modulo);
}

// ─── CANVAS / FIRMAS ─────────────────────────────────────────────────────────
function prepararCanvases() {
    canvasEntrega = document.getElementById('canvas-entrega');
    ctxEntrega    = configurarCanvas(canvasEntrega);
    canvasRecibe  = document.getElementById('canvas-recibe');
    ctxRecibe     = configurarCanvas(canvasRecibe);
    canvasTecnico = document.getElementById('canvas-tecnico');
    ctxTecnico    = configurarCanvas(canvasTecnico);
}

function configurarCanvas(canv) {
    if (!canv) return;
    const ctx = canv.getContext('2d');
    canv.width  = canv.offsetWidth;
    canv.height = canv.offsetHeight;
    ctx.lineWidth    = 2;
    ctx.lineCap      = 'round';
    ctx.strokeStyle  = '#000';
    const pos = (e) => {
        const r = canv.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: cx - r.left, y: cy - r.top };
    };
    const ini = (e) => { dibujando = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); if (e.touches) e.preventDefault(); };
    const mov = (e) => { if (!dibujando) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); if (e.touches) e.preventDefault(); };
    canv.addEventListener('mousedown', ini);
    canv.addEventListener('mousemove', mov);
    canv.addEventListener('touchstart', ini, { passive: false });
    canv.addEventListener('touchmove',  mov, { passive: false });
    window.addEventListener('mouseup',  () => dibujando = false);
    window.addEventListener('touchend', () => dibujando = false);
    return ctx;
}

function abrirFirma(modulo) {
    if (modulo === 'traslado') {
        if (listaSalida.length === 0) return alert("Agregue materiales");
        if (!document.getElementById('resp-traslado').value || !document.getElementById('cuadrilla-recibe').value)
            return alert("Seleccione Encargado y Cuadrilla");
        document.getElementById('modal-firma').style.display = 'flex';
    } else {
        if (listaSolicitud.length === 0) return alert("Agregue materiales");
        if (!document.getElementById('cuadrilla-solicita').value)
            return alert("Seleccione la Cuadrilla que solicita");
        document.getElementById('modal-firma-sol').style.display = 'flex';
    }
    setTimeout(prepararCanvases, 200);
}

function cerrarFirma(modulo) {
    if (modulo === 'traslado') document.getElementById('modal-firma').style.display     = 'none';
    else                       document.getElementById('modal-firma-sol').style.display = 'none';
}

function limpiarFirma(tipo) {
    if (tipo === 'entrega') ctxEntrega.clearRect(0, 0, canvasEntrega.width, canvasEntrega.height);
    else if (tipo === 'recibe')   ctxRecibe.clearRect(0, 0, canvasRecibe.width, canvasRecibe.height);
    else if (tipo === 'tecnico')  ctxTecnico.clearRect(0, 0, canvasTecnico.width, canvasTecnico.height);
}

function isCanvasVacio(canv) {
    const pixels = canv.getContext('2d').getImageData(0, 0, canv.width, canv.height).data;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] !== 0) return false; }
    return true;
}

function finalizarYGenerar(modulo) {
    if (modulo === 'traslado') {
        if (isCanvasVacio(canvasEntrega)) return alert("La firma del que entrega es obligatoria.");
        const fEnt = canvasEntrega.toDataURL('image/png');
        const fRec = isCanvasVacio(canvasRecibe) ? null : canvasRecibe.toDataURL('image/png');
        cerrarFirma('traslado');
        generarPDFTraslado(fEnt, fRec);
    } else {
        if (isCanvasVacio(canvasTecnico)) return alert("La firma del Técnico es obligatoria.");
        const fTec = canvasTecnico.toDataURL('image/png');
        cerrarFirma('solicitud');
        generarPDFSolicitud(fTec);
    }
}

// ─── PDF TRASLADO (igual que antes) ─────────────────────────────────────────
async function generarPDFTraslado(firmaEntrega, firmaRecibe) {
    const { jsPDF } = window.jspdf;
    const doc       = new jsPDF();
    const encargado = document.getElementById('resp-traslado').value;
    const cuadrilla = document.getElementById('cuadrilla-recibe').value;
    const logoUrl   = "https://raw.githubusercontent.com/proyectosjdop-alfa/traslado_materiales/refs/heads/main/imagenes/UTCD%20Vertical.png";

    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);
    doc.rect(10, 10, 60, 30);
    try { doc.addImage(logoUrl, 'PNG', 15, 13, 50, 24); } catch (e) {}
    doc.rect(70, 10, 75, 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("TRASLADO DE MATERIALES", 107.5, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`SECTOR ${sectorActivo}`, 107.5, 28, { align: 'center' });
    doc.rect(145, 10, 55, 30);
    doc.line(170, 10, 170, 40); doc.line(145, 20, 200, 20); doc.line(145, 30, 200, 30);
    doc.setFontSize(8);
    doc.text("Código:", 147, 16); doc.text("Versión:", 147, 26); doc.text("1", 172, 26);
    doc.text("Fecha:", 147, 36);

    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL TRASLADO:", 15, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 15, 54);
    doc.text(`ENCARGADO ASIGNACIÓN: ${encargado.toUpperCase()}`, 15, 60);
    doc.text(`CUADRILLA / RECIBE: ${cuadrilla.toUpperCase()}`, 15, 66);
    doc.line(10, 70, 200, 70);

    doc.autoTable({
        startY: 75,
        head: [['ITEM', 'CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'UNIDAD', 'CANTIDAD']],
        body: listaSalida.map((m, i) => [i + 1, m.codigo, m.nombre, m.unidad, m.cantidadPedida]),
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
    doc.text("ENTREGADO POR (ASIGNADO)", 60, finalY + 5, { align: 'center' });
    if (firmaRecibe) { doc.addImage(firmaRecibe, 'PNG', 125, finalY - 25, 40, 20); }
    doc.line(120, finalY, 180, finalY);
    doc.text("RECIBIDO CONFORME (CUADRILLA)", 150, finalY + 5, { align: 'center' });

    // Descargar localmente
    const fecha = new Date().toLocaleDateString('es-HN').replace(/\//g, '-');
    const nombreArchivo = `Traslado_${fecha}_${sectorActivo}_${cuadrilla}`
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    doc.save(`${nombreArchivo}.pdf`);

    // Enviar a Cloudflare D1 + R2
    const pdfBlob = doc.output('blob');
    const fd = new FormData();
    fd.append("fecha",     fecha);
    fd.append("encargado", encargado);
    fd.append("cuadrilla", cuadrilla);
    fd.append("sector",    sectorActivo);
    fd.append("pdf",       pdfBlob, `${nombreArchivo}.pdf`);
    const resultado = await enviarACloudflare("/guardar-traslado", fd);
    if (resultado.ok) console.log("✅ Traslado guardado en Cloudflare:", resultado.pdf_url);
}

// ─── PDF SOLICITUD ───────────────────────────────────────────────────────────
async function generarPDFSolicitud(firmaTecnico) {
    const { jsPDF } = window.jspdf;
    const doc        = new jsPDF();
    const cuadrilla  = document.getElementById('cuadrilla-solicita').value;
    const logoUrl    = "https://raw.githubusercontent.com/proyectosjdop-alfa/traslado_materiales/refs/heads/main/imagenes/UTCD%20Vertical.png";

    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);
    doc.rect(10, 10, 60, 30);
    try { doc.addImage(logoUrl, 'PNG', 15, 13, 50, 24); } catch (e) {}
    doc.rect(70, 10, 75, 30);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("SOLICITUD DE MATERIALES", 107.5, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`SECTOR ${sectorActivo}`, 107.5, 28, { align: 'center' });
    doc.rect(145, 10, 55, 30);
    doc.line(170, 10, 170, 40); doc.line(145, 20, 200, 20); doc.line(145, 30, 200, 30);
    doc.setFontSize(8);
    doc.text("Código:", 147, 16); doc.text("Versión:", 147, 26); doc.text("1", 172, 26);
    doc.text("Fecha:", 147, 36);

    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("DATOS DE LA SOLICITUD:", 15, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 15, 54);
    doc.text(`CUADRILLA SOLICITANTE: ${cuadrilla.toUpperCase()}`, 15, 60);
    doc.line(10, 65, 200, 65);

    doc.autoTable({
        startY: 70,
        head: [['ITEM', 'CÓDIGO', 'DESCRIPCIÓN DEL MATERIAL', 'UNIDAD', 'CANTIDAD']],
        body: listaSolicitud.map((m, i) => [i + 1, m.codigo, m.nombre, m.unidad, m.cantidadPedida]),
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
    doc.addImage(firmaTecnico, 'PNG', 75, finalY - 25, 60, 20);
    doc.line(65, finalY, 145, finalY);
    doc.text("TÉCNICO DE LA CUADRILLA", 105, finalY + 5, { align: 'center' });

    // Descargar localmente
    const fecha = new Date().toLocaleDateString('es-HN').replace(/\//g, '-');
    const nombreArchivo = `Solicitud_${fecha}_${sectorActivo}_${cuadrilla}`
        .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    doc.save(`${nombreArchivo}.pdf`);

    // Enviar a Cloudflare D1 + R2
    const pdfBlob = doc.output('blob');
    const fd = new FormData();
    fd.append("fecha",     fecha);
    fd.append("cuadrilla", cuadrilla);
    fd.append("sector",    sectorActivo);
    fd.append("pdf",       pdfBlob, `${nombreArchivo}.pdf`);
    const resultado = await enviarACloudflare("/guardar-solicitud", fd);
    if (resultado.ok) console.log("✅ Solicitud guardada en Cloudflare:", resultado.pdf_url);
}
