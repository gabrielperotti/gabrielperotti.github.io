const establecimientoInput = document.getElementById("establecimiento");
const pacienteInput = document.getElementById("paciente");
const fechaInput = document.getElementById("fecha");
const dniInput = document.getElementById("dni");
const profesionalInput = document.getElementById("profesional");
const observacionesInput = document.getElementById("observaciones");
const imagenesInput = document.getElementById("imagenes");

const previewEstablecimiento = document.getElementById("previewEstablecimiento");
const previewPaciente = document.getElementById("previewPaciente");
const previewFecha = document.getElementById("previewFecha");
const previewDni = document.getElementById("previewDni");
const previewProfesional = document.getElementById("previewProfesional");
const previewObservaciones = document.getElementById("previewObservaciones");

const previewImagenes = document.getElementById("previewImagenes");
const listaImagenes = document.getElementById("listaImagenes");
const contadorImagenes = document.getElementById("contadorImagenes");

const btnImprimir = document.getElementById("btnImprimir");
const btnPdf = document.getElementById("btnPdf");
const btnWhatsapp = document.getElementById("btnWhatsapp");
const btnLimpiar = document.getElementById("btnLimpiar");

let imagenes = [];


/* =========================================
   ESTABLECIMIENTO - LOCAL STORAGE
   ========================================= */

const establecimientoGuardado =
    localStorage.getItem("establecimiento");

if (establecimientoGuardado) {
    establecimientoInput.value = establecimientoGuardado;
}

establecimientoInput.addEventListener("input", () => {

    localStorage.setItem(
        "establecimiento",
        establecimientoInput.value
    );

    actualizarPreview();
});


/* =========================================
   FECHA ACTUAL
   ========================================= */

function establecerFechaActual() {

    const hoy = new Date();

    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");

    fechaInput.value = `${year}-${month}-${day}`;
}

establecerFechaActual();


/* =========================================
   PREVIEW
   ========================================= */

function actualizarPreview() {

    previewEstablecimiento.textContent =
        establecimientoInput.value.trim() ||
        "Establecimiento";

    previewPaciente.textContent =
        pacienteInput.value.trim() || "—";

    previewDni.textContent =
        dniInput.value.trim() || "—";

    previewProfesional.textContent =
        profesionalInput.value.trim() || "—";

    previewObservaciones.textContent =
        observacionesInput.value.trim() || "—";


    if (fechaInput.value) {

        const [year, month, day] =
            fechaInput.value.split("-");

        previewFecha.textContent =
            `${day}/${month}/${year}`;

    } else {

        previewFecha.textContent = "";

    }
}


[
    pacienteInput,
    fechaInput,
    dniInput,
    profesionalInput,
    observacionesInput

].forEach(elemento => {

    elemento.addEventListener(
        "input",
        actualizarPreview
    );

});

actualizarPreview();


/* =========================================
   SELECCIÓN DE IMÁGENES
   ========================================= */

imagenesInput.addEventListener("change", event => {

    const archivos = Array.from(event.target.files);

    archivos.forEach(archivo => {

        const reader = new FileReader();

        reader.onload = e => {

            imagenes.push({
                nombre: archivo.name,
                data: e.target.result
            });

            renderImagenes();
        };

        reader.readAsDataURL(archivo);
    });

    imagenesInput.value = "";
});


/* =========================================
   RENDER DE IMÁGENES
   ========================================= */

function renderImagenes() {

    renderListaImagenes();
    renderPreviewImagenes();

    contadorImagenes.textContent =
        `${imagenes.length} ${imagenes.length === 1
            ? "imagen"
            : "imágenes"
        }`;
}


function renderListaImagenes() {

    listaImagenes.innerHTML = "";

    if (!imagenes.length) {

        listaImagenes.innerHTML = `
      <div class="empty-images">
        No hay imágenes seleccionadas
      </div>
    `;

        return;
    }


    imagenes.forEach((imagen, index) => {

        const item = document.createElement("div");

        item.className = "image-item";

        item.innerHTML = `
      <img src="${imagen.data}">

      <div class="image-item-name">
        ${imagen.nombre}
      </div>

      <button
        class="remove-image"
        title="Quitar imagen"
      >
        ×
      </button>
    `;

        item
            .querySelector(".remove-image")
            .addEventListener("click", () => {

                imagenes.splice(index, 1);

                renderImagenes();
            });

        listaImagenes.appendChild(item);
    });
}


function renderPreviewImagenes() {

    previewImagenes.innerHTML = "";

    if (!imagenes.length) {

        previewImagenes.innerHTML = `
      <div class="preview-empty">

        <div class="preview-empty-icon">
          🖼️
        </div>

        <strong>
          Todavía no hay imágenes
        </strong>

        <span>
          Seleccione las imágenes desde
          el panel izquierdo.
        </span>

      </div>
    `;

        return;
    }


    imagenes.forEach(imagen => {

        const container =
            document.createElement("div");

        container.className = "preview-image";

        const img =
            document.createElement("img");

        img.src = imagen.data;

        container.appendChild(img);

        previewImagenes.appendChild(container);
    });
}


/* =========================================
   LIMPIAR
   ========================================= */

btnLimpiar.addEventListener("click", () => {

    const tieneDatos =
        pacienteInput.value.trim() ||
        dniInput.value.trim() ||
        profesionalInput.value.trim() ||
        observacionesInput.value.trim() ||
        imagenes.length > 0;

    if (tieneDatos) {

        const confirmar = confirm(
            "¿Desea limpiar el informe actual?"
        );

        if (!confirmar) {
            return;
        }
    }


    /*
     IMPORTANTE:
     No limpiamos establecimiento.
    */

    pacienteInput.value = "";
    dniInput.value = "";
    profesionalInput.value = "";
    observacionesInput.value = "";

    imagenes = [];

    establecerFechaActual();

    actualizarPreview();
    renderImagenes();

    pacienteInput.focus();
});


/* =========================================
   IMPRIMIR
   ========================================= */

btnImprimir.addEventListener("click", () => {
    window.print();
});


/* =========================================
   GENERAR PDF
   ========================================= */

async function generarPDF() {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });


    /*
     El contenido normal comienza más
     alejado del borde izquierdo.
    */

    const margenIzquierdo = 25;
    const anchoContenido = 160;

    let y = 22;


    /* =====================================
       ESTABLECIMIENTO
       ===================================== */

    const establecimiento =
        establecimientoInput.value.trim() ||
        "Establecimiento";

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(20);

    /*
     105 mm = centro de una hoja A4.
    */

    pdf.text(
        establecimiento,
        105,
        y,
        {
            align: "center"
        }
    );


    /* =====================================
       TÍTULO
       ===================================== */

    y = 45;

    pdf.setFontSize(15);

    pdf.text(
        "Informe del paciente",
        margenIzquierdo,
        y
    );

    y += 8;


    /* Línea separadora */

    pdf.setDrawColor(100);

    pdf.line(
        margenIzquierdo,
        y,
        185,
        y
    );

    y += 13;


    /* =====================================
       DATOS
       ===================================== */

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(10);


    const paciente =
        pacienteInput.value.trim() || "-";

    const dni =
        dniInput.value.trim() || "-";

    const profesional =
        profesionalInput.value.trim() || "-";


    pdf.text(
        `Paciente: ${paciente}`,
        margenIzquierdo,
        y
    );

    y += 7;


    pdf.text(
        `DNI: ${dni}`,
        margenIzquierdo,
        y
    );

    y += 7;


    pdf.text(
        `Profesional: ${profesional}`,
        margenIzquierdo,
        y
    );

    y += 7;


    if (fechaInput.value) {

        const [year, month, day] =
            fechaInput.value.split("-");

        pdf.text(
            `Fecha: ${day}/${month}/${year}`,
            margenIzquierdo,
            y
        );

        y += 12;
    }


    /* =====================================
       OBSERVACIONES
       ===================================== */

    const observaciones =
        observacionesInput.value.trim();

    if (observaciones) {

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.text(
            "Observaciones:",
            margenIzquierdo,
            y
        );

        y += 7;


        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(9);

        const lineas =
            pdf.splitTextToSize(
                observaciones,
                anchoContenido
            );

        pdf.text(
            lineas,
            margenIzquierdo,
            y
        );

        y += lineas.length * 5 + 10;
    }


    /* =====================================
       IMÁGENES
       ===================================== */

    for (const imagen of imagenes) {

        const img = new Image();

        img.src = imagen.data;

        await new Promise(resolve => {

            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
            }

        });


        const maxWidth = 160;
        const maxHeight = 235;

        let width = img.width;
        let height = img.height;

        const ratio =
            Math.min(
                maxWidth / width,
                maxHeight / height,
                1
            );

        width *= ratio;
        height *= ratio;


        /*
         Si no entra completa, pasa
         automáticamente a otra página.
        */

        if (y + height > 280) {

            pdf.addPage();

            y = 15;
        }


        let formato = "JPEG";

        if (
            imagen.data.startsWith(
                "data:image/png"
            )
        ) {
            formato = "PNG";
        }


        /*
         Centramos también la imagen
         dentro del área disponible.
        */

        const imageX =
            margenIzquierdo +
            (maxWidth - width) / 2;


        pdf.addImage(
            imagen.data,
            formato,
            imageX,
            y,
            width,
            height
        );

        y += height + 10;
    }


    return pdf;
}


/* =========================================
   NOMBRE DEL ARCHIVO
   ========================================= */

function obtenerNombreArchivo() {

    const paciente =
        pacienteInput.value
            .trim()
            .replace(
                /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,
                ""
            )
            .replace(/\s+/g, "_");

    return paciente
        ? `Informe_${paciente}.pdf`
        : "Informe_paciente.pdf";
}


/* =========================================
   DESCARGAR PDF
   ========================================= */

btnPdf.addEventListener(
    "click",
    async () => {

        const pdf = await generarPDF();

        pdf.save(
            obtenerNombreArchivo()
        );

        /*
         NO limpiamos nada.
    
         Ella puede revisar, volver a descargar,
         imprimir o mandar por WhatsApp.
    
         Para comenzar otro paciente deberá
         pulsar "Limpiar".
        */
    }
);


/* =========================================
   WHATSAPP
   ========================================= */

btnWhatsapp.addEventListener(
    "click",
    async () => {

        if (!pacienteInput.value.trim()) {

            alert(
                "Ingrese primero el nombre del paciente."
            );

            return;
        }


        const pdf = await generarPDF();

        const blob =
            pdf.output("blob");

        const nombreArchivo =
            obtenerNombreArchivo();


        const archivo = new File(
            [blob],
            nombreArchivo,
            {
                type: "application/pdf"
            }
        );


        /*
         CELULAR / NAVEGADOR COMPATIBLE
        */

        if (
            navigator.share &&
            navigator.canShare &&
            navigator.canShare({
                files: [archivo]
            })
        ) {

            try {

                await navigator.share({
                    title: "Informe",
                    text:
                        `Informe de ${pacienteInput.value.trim()}`,
                    files: [archivo]
                });

                return;

            } catch (error) {

                if (error.name === "AbortError") {
                    return;
                }
            }
        }


        /*
         PC:
         Descarga el PDF y abre WhatsApp.
        */

        pdf.save(nombreArchivo);


        const mensaje =
            encodeURIComponent(
                `Hola. Adjunto el informe de ${pacienteInput.value.trim()}.`
            );


        window.open(
            `https://wa.me/?text=${mensaje}`,
            "_blank"
        );
    }
);