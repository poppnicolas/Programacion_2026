const divPortada = document.getElementById("portada");
const entradaAdivinar = document.getElementById("entrada-busqueda");
const botonAdivinar = document.getElementById("boton-adivinar");
const botonOmitir = document.getElementById("boton-omitir");
const contenedorIntentos = document.getElementById("intentos");
const contenedorSugerencias = document.getElementById("sugerencias");
const contenedorDatosPistas = document.getElementById("datos-pistas");
const tablaIntentos = document.querySelector(".tabla-intentos");

const claveApi = "a22fb87a";
const intentosMaximos = 6;
const totalPeliculas = 5;
const paisesPermitidos = new Set([
    "United States", "USA", "United States of America", "Canada", "Mexico", "Brazil", "Argentina", "Colombia", "Chile", "Peru",
    "Venezuela", "Cuba", "Puerto Rico", "Dominican Republic", "Uruguay", "Paraguay", "Ecuador",
    "United Kingdom", "England", "Scotland", "Wales", "Ireland", "France", "Germany", "Spain", "Italy", "Portugal",
    "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Iceland", "Poland",
    "Greece", "Croatia", "Malta", "Cyprus", "Russia", "Ukraine", "Japan", "South Korea",
    "Australia", "New Zealand", "China", "Hong Kong"
]);
const excepcionesPermitidas = new Set([]);
const consultasFallback = ["movie", "film", "action", "drama", "comedy", "thriller", "adventure", "classic"];

const paginasMaximasBusqueda = 10;

let intentoActual = 0;
let tituloPelicula = "";
let datosPelicula = {};
let intentoExito = null;
let temporizadorSugerencias = null;
let peliculaActual = 1;
let aciertosTotal = 0;

function esPaisPermitido(textoPais) {
    if (!textoPais) return false;
    return textoPais.split(",").some(pais => {
        const formato = pais.trim();
        return paisesPermitidos.has(formato) || excepcionesPermitidas.has(formato);
    });
}

function obtenerDetallesPelicula(imdbID) {
    return fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbID)}&apikey=${claveApi}`)
        .then(respuesta => respuesta.json())
        .catch(() => ({ Response: "False" }));
}

function esDatosPeliculaValidos(datos) {
    const year = datos && datos.Year ? parseInt(datos.Year, 10) : NaN;
    const rating = datos && datos.imdbRating ? parseFloat(datos.imdbRating) : NaN;
    const cumpleRating = !Number.isNaN(rating) && rating >= 7.5;
    const cumpleYear = rating >= 8.5 ? true : (!Number.isNaN(year) && year > 2000);

    return datos && datos.Response === "True" && datos.Title && cumpleRating && cumpleYear &&
        datos.Genre && datos.Director && datos.Country && datos.Poster && datos.Poster !== "N/A";
}

function mezclarArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function obtenerPeliculaPermitida(terminoBusqueda, pagina = 1) {
    return fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(terminoBusqueda)}&type=movie&page=${pagina}&apikey=${claveApi}`)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (!datos.Search || datos.Search.length === 0) {
                throw new Error("No hay resultados de b�squeda");
            }

            const totalResultados = parseInt(datos.totalResults, 10) || 0;
            const paginasDisponibles = Math.min(Math.ceil(totalResultados / 10), paginasMaximasBusqueda);
            if (pagina > paginasDisponibles) {
                throw new Error("P�gina de resultados fuera de rango");
            }

            const candidatos = datos.Search.filter(pelicula => pelicula.Type === "movie");
            if (candidatos.length === 0) {
                throw new Error("No hay resultados de pel�cula");
            }

            mezclarArray(candidatos);
            const promesasDetalles = candidatos.map(pelicula => obtenerDetallesPelicula(pelicula.imdbID));

            return Promise.all(promesasDetalles).then(async resultados => {
                const resultadosValidos = [];
                for (const pelicula of resultados) {
                    if (!esDatosPeliculaValidos(pelicula) || !esPaisPermitido(pelicula.Country)) {
                        continue;
                    }
                    const posterValido = await validarPoster(pelicula.Poster);
                    if (posterValido) {
                        resultadosValidos.push(pelicula);
                    }
                }

                if (resultadosValidos.length === 0) {
                    throw new Error("No se encontr� una pel�cula permitida");
                }
                return resultadosValidos[Math.floor(Math.random() * resultadosValidos.length)];
            });
        });
}

function obtenerConsultaFallbackAleatoria() {
    return consultasFallback[Math.floor(Math.random() * consultasFallback.length)];
}

function obtenerPaginaAleatoria() {
    return Math.floor(Math.random() * paginasMaximasBusqueda) + 1;
}

const indicesBloquesProhibidos = new Set([2, 3, 14, 15]);

function establecerPoster(url, titulo) {
    divPortada.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "portada-contenedor";

    const imagen = document.createElement("img");
    imagen.src = url;
    imagen.alt = titulo || "Portada de pel�cula";
    imagen.onerror = () => {
        console.warn("Poster inv�lido o no disponible, cargando otra pel�cula...");
        cargarPeliculaActual();
    };

    const overlay = document.createElement("div");
    overlay.className = "overlay-oculto";
    for (let i = 1; i <= 16; i++) {
        const bloque = document.createElement("div");
        bloque.className = "overlay-bloque";
        bloque.dataset.index = i;
        overlay.appendChild(bloque);
    }

    wrapper.appendChild(imagen);
    wrapper.appendChild(overlay);
    divPortada.style.display = "block";
    divPortada.appendChild(wrapper);
    ocultarBloqueAleatorio();
}

function ocultarBloqueAleatorio() {
    const bloques = Array.from(document.querySelectorAll(".overlay-bloque:not(.bloque-oculto)"));
    const bloquesValidos = bloques.filter(bloque => {
        const index = Number(bloque.dataset.index);
        return !indicesBloquesProhibidos.has(index);
    });
    if (bloquesValidos.length === 0) return;
    const elegido = bloquesValidos[Math.floor(Math.random() * bloquesValidos.length)];
    elegido.classList.add("bloque-oculto");
}

function mostrarPosterCompleto() {
    const overlay = divPortada.querySelector(".overlay-oculto");
    if (overlay) {
        overlay.remove();
    }
}

function mostrarDatosPistas() {
    contenedorDatosPistas.innerHTML = "";
    if (!datosPelicula || !datosPelicula.Title) return;

    const titulo = document.createElement("h3");
    titulo.textContent = "Datos de la pel�cula";

    const lista = document.createElement("div");
    lista.innerHTML = `
        <p><strong>T�tulo:</strong> ${datosPelicula.Title}</p>
        <p><strong>A�o:</strong> ${datosPelicula.Year}</p>
        <p><strong>G�nero:</strong> ${datosPelicula.Genre}</p>
        <p><strong>Rating:</strong> ${datosPelicula.imdbRating}</p>
        <p><strong>Director:</strong> ${datosPelicula.Director}</p>
        <p><strong>Pa�s:</strong> ${datosPelicula.Country}</p>
    `;

    contenedorDatosPistas.appendChild(titulo);
    contenedorDatosPistas.appendChild(lista);
}

function limpiarDatosPistas() {
    contenedorDatosPistas.innerHTML = "";
}

function revelarResultado() {
    mostrarPosterCompleto();
    mostrarDatosPistas();
    botonAdivinar.disabled = true;
    botonOmitir.disabled = true;
    entradaAdivinar.disabled = true;
}

function cargarPeliculaAleatoria() {
    let intentos = 0;
    const maxIntentos = consultasFallback.length * paginasMaximasBusqueda;

    function intentarSiguiente() {
        if (intentos >= maxIntentos) {
            return Promise.reject(new Error("No se pudo encontrar una pel�cula permitida"));
        }

        intentos += 1;
        const termino = obtenerConsultaFallbackAleatoria();
        const pagina = obtenerPaginaAleatoria();

        return obtenerPeliculaPermitida(termino, pagina)
            .catch(() => intentarSiguiente());
    }

    return intentarSiguiente().catch(() => {
        const ids = peliculasFallbackIDs.slice();
        mezclarArray(ids);

        function intentarFallback() {
            if (ids.length === 0) {
                return Promise.reject(new Error("No se pudo cargar ninguna pel�cula de respaldo"));
            }
            const fallbackID = ids.pop();
            return obtenerDetallesPelicula(fallbackID).then(datos => {
                if (esDatosPeliculaValidos(datos) && esPaisPermitido(datos.Country)) {
                    return datos;
                }
                return intentarFallback();
            });
        }

        return intentarFallback();
    });
}

function renderizarIntentos() {
    
    for (let i = 0; i < intentosMaximos; i++) {
        const cuadro = document.createElement("div");
        cuadro.classList.add("caja-intento");

        if (intentoExito === i) {
            cuadro.classList.add("exito");
        } else if (i < intentoActual) {
            cuadro.classList.add("usada");
        }
        contenedorIntentos.appendChild(cuadro);
    }
}

function getColorPorAtributo(valorGuess, valorObjetivo) {
    return valorGuess === valorObjetivo ? "#28a745" : "#ff4d4d";
}

function getColorYear(valorGuess, valorObjetivo) {
    const guess = parseInt(valorGuess, 10);
    const objetivo = parseInt(valorObjetivo, 10);
    if (Number.isFinite(guess) && Number.isFinite(objetivo)) {
        if (guess === objetivo) return "#28a745";
        if (Math.abs(guess - objetivo) <= 5) return "#ffdd57";
    }
    return getColorPorAtributo(valorGuess, valorObjetivo);
}

function getColorRating(valorGuess, valorObjetivo) {
    const guess = parseFloat(valorGuess);
    const objetivo = parseFloat(valorObjetivo);
    if (Number.isFinite(guess) && Number.isFinite(objetivo)) {
        if (guess === objetivo) return "#28a745";
        if (Math.abs(guess - objetivo) <= 1.5) return "#ffdd57";
    }
    return getColorPorAtributo(valorGuess, valorObjetivo);
}

function agregarFilaIntento(datosGuess, esCorrecto) {
    const fila = document.createElement("tr");

    const celdaPeli = document.createElement("td");
    celdaPeli.textContent = datosGuess.Title || "-";
    celdaPeli.style.backgroundColor = esCorrecto ? "#28a745" : "#ff4d4d";
    celdaPeli.style.color = "#fff";

    const celdaYear = document.createElement("td");
    celdaYear.textContent = datosGuess.Year || "-";
    celdaYear.style.backgroundColor = getColorYear(datosGuess.Year, datosPelicula.Year);
    celdaYear.style.color = getColorYear(datosGuess.Year, datosPelicula.Year) === "#ffdd57" ? "#000" : "#fff";

    const celdaGenero = document.createElement("td");
    celdaGenero.textContent = datosGuess.Genre || "-";
    celdaGenero.style.backgroundColor = datosGuess.Genre === datosPelicula.Genre ? "#28a745" : "#ffb84d";
    celdaGenero.style.color = "#000";

    const celdaRating = document.createElement("td");
    celdaRating.textContent = datosGuess.imdbRating || "-";
    celdaRating.style.backgroundColor = getColorRating(datosGuess.imdbRating, datosPelicula.imdbRating);
    celdaRating.style.color = getColorRating(datosGuess.imdbRating, datosPelicula.imdbRating) === "#ffdd57" ? "#000" : "#fff";

    const celdaDirector = document.createElement("td");
    celdaDirector.textContent = datosGuess.Director || "-";
    celdaDirector.style.backgroundColor = getColorPorAtributo(datosGuess.Director, datosPelicula.Director);
    celdaDirector.style.color = "#fff";

    const celdaPais = document.createElement("td");
    celdaPais.textContent = datosGuess.Country || "-";
    celdaPais.style.backgroundColor = getColorPorAtributo(datosGuess.Country, datosPelicula.Country);
    celdaPais.style.color = "#fff";

    fila.appendChild(celdaPeli);
    fila.appendChild(celdaYear);
    fila.appendChild(celdaGenero);
    fila.appendChild(celdaRating);
    fila.appendChild(celdaDirector);
    fila.appendChild(celdaPais);

    tablaIntentos.appendChild(fila);
}

function agregarFilaOmitido() {
    const fila = document.createElement("tr");
    const valores = ["Omitido", "-", "-", "-", "-", "-"];

    valores.forEach((valor, index) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        celda.style.backgroundColor = index === 0 ? "#ffc107" : "#343a40";
        celda.style.color = "#fff";
        fila.appendChild(celda);
    });

    tablaIntentos.appendChild(fila);
}

function limpiarSugerencias() {
    contenedorSugerencias.innerHTML = "";
}

function renderizarSugerencias(peliculas) {
    contenedorSugerencias.innerHTML = "";
    peliculas.slice(0, 5).forEach(pelicula => {
        const sugerencia = document.createElement("div");
        sugerencia.classList.add("item-sugerencia");
        sugerencia.innerHTML = `<strong>${pelicula.Title}</strong>`;
        sugerencia.addEventListener("click", () => {
            entradaAdivinar.value = pelicula.Title;
            limpiarSugerencias();
            entradaAdivinar.focus();
        });
        contenedorSugerencias.appendChild(sugerencia);
    });
}

function buscarPeliculas(termino) {
    if (!termino || termino.length < 2) {
        limpiarSugerencias();
        return;
    }

    fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(termino)}&type=movie&apikey=${claveApi}`)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (datos.Search && datos.Search.length > 0) {
                renderizarSugerencias(datos.Search);
            } else {
                limpiarSugerencias();
            }
        })
        .catch(() => limpiarSugerencias());
}

function procesarIntentoFallido() {
    agregarFilaOmitido();
    intentoActual += 1;
    ocultarBloqueAleatorio();

    if (intentoActual >= intentosMaximos) {
        intentoExito = intentoActual - 1;
        renderizarIntentos();
        revelarResultado();
        setTimeout(() => {
            if (peliculaActual < totalPeliculas) {
                cargarSiguientePelicula();
            } else {
                window.location.href = `./resultados.html?aciertos=${aciertosTotal}`;
            }
        }, 2000);
        return;
    }

    renderizarIntentos();
    entradaAdivinar.value = "";
    entradaAdivinar.focus();
}

function manejarAdivinanza() {
    const adivinanza = entradaAdivinar.value.trim();
    if (!adivinanza) return;

    const esCorrecto = adivinanza.toLowerCase() === tituloPelicula;

    fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(adivinanza)}&type=movie&apikey=${claveApi}`)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (datos.Response === "True") {
                agregarFilaIntento(datos, esCorrecto);
            }

            if (esCorrecto) {
                intentoExito = intentoActual;
                aciertosTotal += 1;
                renderizarIntentos();
                revelarResultado();
                setTimeout(() => {
                    if (peliculaActual < totalPeliculas) {
                        cargarSiguientePelicula();
                    } else {
                        window.location.href = `./resultados.html?aciertos=${aciertosTotal}`;
                    }
                }, 2000);
            } else {
                procesarIntentoFallido();
            }
        })
        .catch(() => {
            console.error("Error al obtener datos de la pel�cula");
            entradaAdivinar.value = "";
        });
}

botonAdivinar.addEventListener("click", manejarAdivinanza);
botonOmitir.addEventListener("click", () => {
    if (botonOmitir.disabled) return;
    procesarIntentoFallido();
});
entradaAdivinar.addEventListener("keyup", event => {
    if (event.key === "Enter") manejarAdivinanza();
});

entradaAdivinar.addEventListener("input", () => {
    clearTimeout(temporizadorSugerencias);
    temporizadorSugerencias = setTimeout(() => buscarPeliculas(entradaAdivinar.value.trim()), 250);
});

entradaAdivinar.addEventListener("blur", () => setTimeout(limpiarSugerencias, 150));

function cargarPeliculaActual(reintentos = 0) {
    if (reintentos >= 3) {
        console.error("No se pudo cargar una pel�cula v�lida despu�s de varios intentos.");
        divPortada.textContent = "Error al cargar la pel�cula";
        divPortada.style.color = "#fff";
        divPortada.style.display = "flex";
        divPortada.style.alignItems = "center";
        divPortada.style.justifyContent = "center";
        return;
    }

    cargarPeliculaAleatoria()
        .then(datosCompletos => {
            tituloPelicula = datosCompletos.Title.toLowerCase();
            datosPelicula = {
                Title: datosCompletos.Title,
                Year: datosCompletos.Year,
                Genre: datosCompletos.Genre,
                imdbRating: datosCompletos.imdbRating,
                Director: datosCompletos.Director,
                Country: datosCompletos.Country,
                Poster: datosCompletos.Poster
            };

            if (datosCompletos.Poster && datosCompletos.Poster !== "N/A") {
                establecerPoster(datosCompletos.Poster, datosCompletos.Title);
            } else {
                cargarPeliculaActual(reintentos + 1);
            }
        })
        .catch(() => cargarPeliculaActual(reintentos + 1));
}

function cargarSiguientePelicula() {
    peliculaActual += 1;
    intentoActual = 0;
    intentoExito = null;
    tituloPelicula = "";
    datosPelicula = {};
    limpiarDatosPistas();

    const filasExistentes = tablaIntentos.querySelectorAll("tr:not(.encabezados)");
    filasExistentes.forEach(fila => fila.remove());

    botonAdivinar.disabled = false;
    botonOmitir.disabled = false;
    entradaAdivinar.disabled = false;
    entradaAdivinar.value = "";
    entradaAdivinar.focus();

    renderizarIntentos();
    limpiarSugerencias();

    if (peliculaActual > totalPeliculas) {
        window.location.href = `./resultados.html?aciertos=${aciertosTotal}`;
        return;
    }

    cargarPeliculaActual();
}

renderizarIntentos();

cargarPeliculaActual();
