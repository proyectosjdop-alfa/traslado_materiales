var mapP, markerP;
var gpsIni = "No marcado", gpsFin = "No marcado";
var latIni = null, lngIni = null;
var latFin = null, lngFin = null;
var sectorActivo = "";

// CREDENCIALES
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

function validarLogin() {
    const u = document.getElementById('user').value.toLowerCase();
    const p = document.getElementById('pass').value;

    if (USUARIOS[u] && USUARIOS[u] === p) {
        sectorActivo = u.toUpperCase();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-poda-container').style.display = 'block';
        document.getElementById('user-display').innerText = "Sector: " + sectorActivo;
        initMapPoda();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function initMapPoda() {
    if (mapP) mapP.remove();
    mapP = L.map('map-poda').setView([14.65, -86.21], 15);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(mapP);
    markerP = L.marker([14.65, -86.21], { draggable: true }).addTo(mapP);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;
            actualizarMarcador(lat, lng);
        }, () => {}, {enableHighAccuracy: true});
    }
    setTimeout(() => mapP.invalidateSize(), 300);
}

function actualizarMarcador(lat, lng) {
    mapP.setView([lat, lng], 17);
    markerP.setLatLng([lat, lng]);
}

function ingresarManual() {
    const lat = parseFloat(document.getElementById('manual-lat').value);
    const lng = parseFloat(document.getElementById('manual-lng').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        actualizarMarcador(lat, lng);
    } else {
        alert("Por favor, ingrese valores numéricos válidos para Latitud y Longitud.");
    }
}

function marcarGPS(tipo) {
    let p = markerP.getLatLng();
    let lat = Number(p.lat.toFixed(6));
    let lng = Number(p.lng.toFixed(6));
    let c = lat + ", " + lng;
    if (tipo === 'ini') { gpsIni = c; latIni = lat; lngIni = lng; } 
    else { gpsFin = c; latFin = lat; lngFin = lng; }
    document.getElementById('coords-display').innerText = `Inicio: ${gpsIni} | Fin: ${gpsFin}`;
}

async function generarPDFPoda() {
    try { enviarDatosCloudflare(); } catch(e) {}

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = "https://raw.githubusercontent.com/josueortizp87-code/App-Cuadrillas-Distribucion/refs/heads/main/imagenes/UTCD%20Vertical.png";

    // Función para obtener la imagen y convertirla a base64
    const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = url;
        });
    };

    const logoImg = await getLogoBase64(logoUrl);

    const dibujarEstructuraInstitucional = () => {
        // Marco de la hoja
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(5, 5, 200, 287); 

        // Cajetín encabezado
        doc.setLineWidth(0.3);
        doc.rect(10, 10, 190, 25); 
        
        doc.line(60, 10, 60, 35);  
        doc.line(150, 10, 150, 35); 
        doc.line(170, 10, 170, 35);
        doc.line(150, 18, 200, 18);
        doc.line(150, 26, 200, 26);

        // Logo insertado en la celda izquierda
        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 12, 12, 45, 20);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("INFORME DE PODA COMUNITARIA", 105, 19, {align: "center"});
        doc.text("SECTOR: " + sectorActivo, 105, 27, {align: "center"});

        doc.setFontSize(8);
        doc.text("Código", 152, 15);
        doc.text("Versión", 152, 23);
        doc.setFont("helvetica", "normal");
        doc.text("1", 185, 23, {align: "center"}); 
        doc.setFont("helvetica", "bold");
        doc.text("Fecha", 152, 31);
    };

    const leerFoto = (id) => {
        const file = document.getElementById(id).files[0];
        if (!file) return null;
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    // PÁGINA 1
    dibujarEstructuraInstitucional();
    
    doc.setLineWidth(0.2);
    doc.rect(10, 40, 190, 45);
    doc.setFontSize(9);
    let yD = 47;

    const escribirLinea = (label, value, y) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), 52, y);
    };

    escribirLinea("CIRCUITO:", document.getElementById('poda-circuito').value, yD); yD += 6;
    escribirLinea("ZONA DE TRABAJO:", document.getElementById('poda-zona').value, yD); yD += 6;
    escribirLinea("HORARIO:", `INICIO ${document.getElementById('h-ini').value} / FINAL ${document.getElementById('h-fin').value}`, yD); yD += 6;
    escribirLinea("TRABAJO:", `Brecha ${document.getElementById('m-brecha').value}m, Poda ${document.getElementById('m-poda').value}m, Postes ${document.getElementById('m-postes').value}`, yD); yD += 6;
    escribirLinea("PAGOS:", `M.O. L. ${document.getElementById('pago-mo').value} / Trans. L. ${document.getElementById('pago-trans').value} / Personal: ${document.getElementById('poda-personas').value}`, yD); yD += 6;
    escribirLinea("GPS:", `Inicio ${gpsIni} | Fin ${gpsFin}`, yD); yD += 6;
    escribirLinea("RESPONSABLES:", `${document.getElementById('resp-super').value} / ${document.getElementById('resp-activ').value}`, yD);

    const fGrupo = await leerFoto('f-grupo');
    const fVehiculo = await leerFoto('f-vehiculo');

    if (fGrupo) {
        doc.setFont("helvetica", "bold"); doc.text("FOTO GRUPO", 15, 93);
        doc.addImage(fGrupo, 'JPEG', 15, 95, 180, 85);
        doc.rect(15, 95, 180, 85);
    }
    if (fVehiculo) {
        doc.setFont("helvetica", "bold"); doc.text("FOTO VEHÍCULO", 15, 193);
        doc.addImage(fVehiculo, 'JPEG', 15, 195, 180, 85);
        doc.rect(15, 195, 180, 85);
    }

    // --- PÁGINA 2: DNI LÍDER (Centrado y tamaño ID) ---
const fLiderF = await leerFoto('f-lider-f');
const fLiderR = await leerFoto('f-lider-r');

if (fLiderF || fLiderR) {
    doc.addPage();
    dibujarEstructuraInstitucional();
    
    const cardW = 85; // Ancho estándar ID mm
    const cardH = 54; // Alto estándar ID mm
    const centerX = (210 - cardW) / 2;

    if (fLiderF) {
        doc.setFont("helvetica", "bold");
        doc.text("DNI LÍDER - FRONTAL", 105, 55, {align: "center"});
        doc.addImage(fLiderF, 'JPEG', centerX, 60, cardW, cardH);
        doc.rect(centerX, 60, cardW, cardH);
    }

    if (fLiderR) {
        doc.setFont("helvetica", "bold");
        doc.text("DNI LÍDER - REVÉS", 105, 135, {align: "center"});
        doc.addImage(fLiderR, 'JPEG', centerX, 140, cardW, cardH);
        doc.rect(centerX, 140, cardW, cardH);
    }
}

// --- ACTUALIZACIÓN DE IDENTIDADES GRUPALES ---
// Reemplaza tu bucle anterior de 'ids' por este que incluye las 4 fotos:
const identidades = [
    {id:'f-id-f', t:'DNI PERSONAL FRENTE (1)'}, 
    {id:'f-id-r', t:'DNI PERSONAL REVÉS (1)'},
    {id:'f-id-f2', t:'DNI PERSONAL FRENTE (2)'}, 
    {id:'f-id-r2', t:'DNI PERSONAL REVÉS (2)'}
];

for(let p of identidades){
    const img = await leerFoto(p.id);
    if(img) {
        doc.addPage();
        dibujarEstructuraInstitucional();
        doc.setFont("helvetica", "bold");
        doc.text(p.t, 105, 45, {align: "center"});
        doc.addImage(img, 'JPEG', 15, 50, 180, 230); // Estas siguen ocupando la hoja
        doc.rect(15, 50, 180, 230);
    }
}

    doc.addPage();
    dibujarEstructuraInstitucional();
    const secciones = [
        {t:"FOTOS ANTES", ids:['f-ini-1','f-ini-2','f-ini-3']},
        {t:"FOTOS DURANTE", ids:['f-eje-1','f-eje-2','f-eje-3']},
        {t:"FOTOS DESPUÉS", ids:['f-fin-1','f-fin-2','f-fin-3']}
    ];
    let yImg = 45;
    for(let s of secciones){
        doc.setFont("helvetica", "bold"); doc.text(s.t, 15, yImg);
        yImg += 5; let xImg = 10;
        for(let id of s.ids){
            const img = await leerFoto(id);
            if(img){ doc.addImage(img, 'JPEG', xImg, yImg, 62, 70); doc.rect(xImg, yImg, 62, 70); }
            xImg += 64;
        }
        yImg += 75;
    }

    doc.save(`Informe_Poda_${sectorActivo}.pdf`);
}

function previsualizar(input, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = "";
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "100%"; img.style.height = "100%";
            img.style.objectFit = "cover"; img.style.borderRadius = "4px";
            contenedor.appendChild(img);
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function enviarDatosCloudflare() {
    const data = {
        sector: sectorActivo,
        circuito: document.getElementById('poda-circuito').value,
        zona_trabajo: document.getElementById('poda-zona').value,
        fecha_envio: new Date().toISOString()
    };
    fetch("https://api-cuadrillas.cgujuticalpa.workers.dev/", {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).catch(() => {}); 
}
