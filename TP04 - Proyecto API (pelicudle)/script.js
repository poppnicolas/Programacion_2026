const tmdbUrlBase = "https://api.themoviedb.org/3";
const tmdbIdioma = "es-ES";
const tmdbTokenAutent = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZTQ4ODVmNDg5MDYwMmI1ZGM5ZDYzOGEyOWM4YTc5OCIsIm5iZiI6MTc4MTAyNTE3MS4zOTEsInN1YiI6IjZhMjg0OTkzZjJmY2RiZGZiM2M5NmVkNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.aqJDaaYy52l7F-cl0Csa03Evxnef9gYTHQD9Fj1-hyo";

const tmdbOptions = {
    method: "GET",
    headers: {
        accept: "application/json",
        Authorization: `Bearer ${tmdbTokenAutent}`
    }
};

const divPortada = document.getElementById("portada");
const entradaAdivinar = document.getElementById("entrada-busqueda");
const botonAdivinar = document.getElementById("boton-adivinar");
const botonOmitir = document.getElementById("boton-omitir");
const contenedorIntentos = document.getElementById("intentos");
const contenedorSugerencias = document.getElementById("sugerencias");
const tablaIntentos = document.querySelector(".tabla-intentos");

const niveles = {
    1: [265195, 155, 550, 597, 238],
    2: [680, 13, 278, 603, 424],
    3: [1083381, 27205, 207, 557, 9806],
    4: [157336, 18079, 25376, 4232, 335984],
    5: [672, 936075, 687163, 9339, 1273221],
    6: [265195, 155, 550, 597, 238],
};

let nivelActual = 1;
const intentosMaximos = 6;
let totalPeliculas = 5;

function obtenerIDsDelNivel(nivel) {
    if (!nivel) return [];
    return niveles[nivel] || niveles[`nivel${nivel}`] || [];
}

function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

let intentoActual = 0;
let peliculaActualID = null;
let datosPelicula = {};
let intentoExito = null;
let temporizadorSugerencias = null;
let peliculaActual = 1;
let aciertosTotal = 0;
let peliculasIntentadas = new Set();

function obtenerNivelActualDesdePagina() {
    const bodyNivel = document.body.dataset.nivel;
    const queryNivel = new URLSearchParams(window.location.search).get("nivel");
    const nivel = parseInt(bodyNivel || queryNivel || "1", 10);
    return Number.isFinite(nivel) && nivel >= 1 && obtenerIDsDelNivel(nivel).length > 0 ? nivel : 1;
}

function actualizarNumeroPelicula() {
    const encabezado = document.querySelector("#numero-pelicula");
    if (encabezado) {
        encabezado.innerHTML = `${peliculaActual}`;
    }
}

function obtenerDetallesPelicula(tmdbID) {
    return fetch(`${tmdbUrlBase}/movie/${encodeURIComponent(tmdbID)}?language=${tmdbIdioma}&append_to_response=credits`, tmdbOptions)
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error("No se pudieron obtener los detalles de la película");
            }
            return respuesta.json();
        })
        .then(datos => {
            if (!datos || datos.success === false) {
                throw new Error("No se pudieron obtener los detalles de la película");
            }

            const year = datos.release_date ? datos.release_date.slice(0, 4) : "";
            const director = datos.credits?.crew?.find(miembro => miembro.job === "Director")?.name || "";
            const productionCountries = Array.isArray(datos.production_countries)
                ? datos.production_countries.map(c => c.name)
                : [];
            const genres = Array.isArray(datos.genres)
                ? datos.genres.map(g => g.name)
                : [];

            return {
                id: tmdbID,
                Title: datos.title || "",
                Year: year,
                Genre: genres.join(", "),
                imdbRating: datos.vote_average != null ? datos.vote_average.toFixed(1) : "",
                Director: director,
                Country: productionCountries.join(", "),
                Poster: datos.poster_path ? `https://image.tmdb.org/t/p/w500${datos.poster_path}` : null
            };
        });
}

function esDatosPeliculaValidos(datos) {
    if (!datos || !datos.Title) {
        return false;
    }

    // Solo requiere título, genre básicamente
    // No requiere director obligatoriamente
    if (!datos.Genre) {
        return false;
    }

    const rating = datos.imdbRating ? parseFloat(datos.imdbRating) : 0;
    const year = datos.Year ? parseInt(datos.Year, 10) : 0;
    
    // Rating debe ser al menos 5 (muy permisivo)
    // Año debe ser válido (cualquier año válido)
    return rating >= 5 && year > 0;
}

function obtenerPeliculaDeNivel() {
    const nivelIDs = obtenerIDsDelNivel(nivelActual);
    const nivelIndex = peliculaActual - 1;
    const tmdbID = nivelIDs[nivelIndex];

    if (!tmdbID) {
        return Promise.reject(new Error(`No hay película definida en nivel ${nivelActual} para la posición ${peliculaActual}`));
    }

    return obtenerDetallesPelicula(tmdbID).then(datos => {
        if (!esDatosPeliculaValidos(datos)) {
            return Promise.reject(new Error("Los datos de la película no son válidos"));
        }
        return datos;
    });
}

const indicesBloquesProhibidos = new Set([2, 3, 14, 15]);

let intentosPoster = 0;

function establecerPoster(url, titulo) {
    divPortada.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "portada-contenedor";

    const imagen = document.createElement("img");
    imagen.src = url;
    imagen.alt = titulo || "Portada de película";
    imagen.onerror = () => {
        console.warn("Poster inválido o no disponible, intentando nuevamente...");
        intentosPoster++;
        if (intentosPoster < 3) {
            cargarPeliculaActual(0);
        } else {
            divPortada.textContent = "Error al cargar el poster";
            divPortada.style.display = "flex";
            divPortada.style.alignItems = "center";
            divPortada.style.justifyContent = "center";
            divPortada.style.color = "#fff";
        }
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

function revelarResultado() {
    mostrarPosterCompleto();
    botonAdivinar.disabled = true;
    botonOmitir.disabled = true;
    entradaAdivinar.disabled = true;
}

function cargarPeliculaAleatoria() {
    return obtenerPeliculaDeNivel();
}

function renderizarIntentos() {
    contenedorIntentos.innerHTML = "";

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

function obtenerColorPorAtributo(valorAdivinado, valorObjetivo) {
    return valorAdivinado === valorObjetivo ? "#28a745" : "#ff4d4d";
}

function obtenerColorPais(valorAdivinado, valorObjetivo) {
    if (!valorAdivinado || !valorObjetivo) {
        return obtenerColorPorAtributo(valorAdivinado, valorObjetivo);
    }

    const normalizarPais = texto => normalizarTexto(texto)
        .replace(/\b(de|del|la|el|los|las|of|the|and)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const tokensAdivinados = normalizarPais(valorAdivinado).split(",").map(t => t.trim()).filter(Boolean);
    const tokensObjetivo = normalizarPais(valorObjetivo).split(",").map(t => t.trim()).filter(Boolean);

    const conjuntoAdivinado = new Set(tokensAdivinados);
    const conjuntoObjetivo = new Set(tokensObjetivo);

    const coincidenciaCompleta = tokensAdivinados.length === tokensObjetivo.length && tokensAdivinados.every(token => conjuntoObjetivo.has(token));
    if (coincidenciaCompleta) {
        return "#28a745";
    }

    const coincidenciaParcial = tokensAdivinados.some(token => conjuntoObjetivo.has(token)) || tokensObjetivo.some(token => conjuntoAdivinado.has(token));
    return coincidenciaParcial ? "#ffdd57" : "#ff4d4d";
}

function obtenerColorAnio(valorAdivinado, valorObjetivo) {
    const adivinado = parseInt(valorAdivinado, 10);
    const objetivo = parseInt(valorObjetivo, 10);
    if (Number.isFinite(adivinado) && Number.isFinite(objetivo)) {
        return adivinado === objetivo ? "#28a745" : "#ff4d4d";
    }
    return "#ff4d4d";
}

function obtenerFlechaAnio(valorAdivinado, valorObjetivo) {
    const adivinado = parseInt(valorAdivinado, 10);
    const objetivo = parseInt(valorObjetivo, 10);
    if (!Number.isFinite(adivinado) || !Number.isFinite(objetivo) || adivinado === objetivo) {
        return "";
    }
    return objetivo > adivinado ? " ▲" : " ▼";
}

function obtenerFlechaRating(valorAdivinado, valorObjetivo) {
    const adivinado = parseFloat(valorAdivinado);
    const objetivo = parseFloat(valorObjetivo);
    if (!Number.isFinite(adivinado) || !Number.isFinite(objetivo) || adivinado === objetivo) {
        return "";
    }
    return objetivo > adivinado ? " ▲" : " ▼";
}

function obtenerColorRating(valorAdivinado, valorObjetivo) {
    const adivinado = parseFloat(valorAdivinado);
    const objetivo = parseFloat(valorObjetivo);
    if (Number.isFinite(adivinado) && Number.isFinite(objetivo)) {
        if (adivinado === objetivo) return "#28a745";
        if (Math.abs(adivinado - objetivo) <= 1.5) return "#ffdd57";
    }
    return obtenerColorPorAtributo(valorAdivinado, valorObjetivo);
}

function obtenerColorGenero(generoAdivinado, generoObjetivo) {
    if (!generoAdivinado || !generoObjetivo) {
        return "#ff4d4d";
    }

    const generosAdivinados = generoAdivinado.split(",").map(g => g.trim().toLowerCase()).filter(Boolean);
    const generosObjetivo = generoObjetivo.split(",").map(g => g.trim().toLowerCase()).filter(Boolean);

    if (generosAdivinados.length === 0 || generosObjetivo.length === 0) {
        return "#ff4d4d";
    }

    const coincidenciaExacta = generosAdivinados.length === generosObjetivo.length && generosAdivinados.every(g => generosObjetivo.includes(g));
    if (coincidenciaExacta) {
        return "#28a745";
    }

    const coincidenciaParcial = generosAdivinados.some(g => generosObjetivo.includes(g));
    return coincidenciaParcial ? "#ffdd57" : "#ff4d4d";
}

function agregarFilaIntento(datosGuess, esCorrecto) {
    const fila = document.createElement("tr");

    const celdaPeli = document.createElement("td");
    celdaPeli.textContent = datosGuess.Title || "-";
    celdaPeli.style.backgroundColor = esCorrecto ? "#28a745" : "#ff4d4d";
    celdaPeli.style.color = "#fff";

    const celdaYear = document.createElement("td");
    const yearColor = obtenerColorAnio(datosGuess.Year, datosPelicula.Year);
    celdaYear.textContent = `${datosGuess.Year || "-"}${obtenerFlechaAnio(datosGuess.Year, datosPelicula.Year)}`;
    celdaYear.style.backgroundColor = yearColor;
    celdaYear.style.color = yearColor === "#ffdd57" ? "#000" : "#fff";

    const celdaGenero = document.createElement("td");
    celdaGenero.textContent = datosGuess.Genre || "-";
    const colorGenero = obtenerColorGenero(datosGuess.Genre, datosPelicula.Genre);
    celdaGenero.style.backgroundColor = colorGenero;
    celdaGenero.style.color = colorGenero === "#ffdd57" ? "#000" : "#fff";

    const celdaRating = document.createElement("td");
    celdaRating.textContent = `${datosGuess.imdbRating || "-"}${obtenerFlechaRating(datosGuess.imdbRating, datosPelicula.imdbRating)}`;
    celdaRating.style.backgroundColor = obtenerColorRating(datosGuess.imdbRating, datosPelicula.imdbRating);
    celdaRating.style.color = obtenerColorRating(datosGuess.imdbRating, datosPelicula.imdbRating) === "#ffdd57" ? "#000" : "#fff";

    const celdaDirector = document.createElement("td");
    celdaDirector.textContent = datosGuess.Director || "-";
    celdaDirector.style.backgroundColor = obtenerColorPorAtributo(datosGuess.Director, datosPelicula.Director);
    celdaDirector.style.color = "#fff";

    const celdaPais = document.createElement("td");
    celdaPais.textContent = datosGuess.Country || "-";
    const colorPais = obtenerColorPais(datosGuess.Country, datosPelicula.Country);
    celdaPais.style.backgroundColor = colorPais;
    celdaPais.style.color = colorPais === "#ffdd57" ? "#000" : "#fff";

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
    const celda = document.createElement("td");
    celda.setAttribute("colspan", "6");
    celda.textContent = "Omitido";
    celda.style.backgroundColor = "#343a40";
    celda.style.color = "#fff";
    celda.style.textAlign = "center";
    celda.style.padding = "10px 12px";
    fila.appendChild(celda);
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

    fetch(`${tmdbUrlBase}/search/movie?query=${encodeURIComponent(termino)}&page=1&language=${tmdbIdioma}&include_adult=false`, tmdbOptions)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (datos.results && datos.results.length > 0) {
                const sugerencias = datos.results
                    .filter(pelicula => pelicula && (pelicula.title || pelicula.original_title) && pelicula.release_date && !pelicula.video)
                    .map(pelicula => ({
                        Title: pelicula.title || pelicula.original_title || "",
                        id: pelicula.id
                    }))
                    .filter(pelicula => pelicula.Title);
                renderizarSugerencias(sugerencias);
            } else {
                limpiarSugerencias();
            }
        })
        .catch(() => limpiarSugerencias());
}

function buscarPeliculaPorTitulo(titulo) {
    const terminoNormalizado = normalizarTexto(titulo);

    return fetch(`${tmdbUrlBase}/search/movie?query=${encodeURIComponent(titulo)}&page=1&language=${tmdbIdioma}&include_adult=false`, tmdbOptions)
        .then(respuesta => respuesta.json())
        .then(datos => {
            if (!datos.results || datos.results.length === 0) {
                throw new Error("No hay resultados de película");
            }

            const resultadoExacto = datos.results.find(pelicula => {
                const tituloApi = normalizarTexto(pelicula.title || "");
                const tituloOriginal = normalizarTexto(pelicula.original_title || "");
                return tituloApi === terminoNormalizado || tituloOriginal === terminoNormalizado;
            });

            const resultadoSimilar = resultadoExacto || datos.results.find(pelicula => {
                const tituloApi = normalizarTexto(pelicula.title || "");
                const tituloOriginal = normalizarTexto(pelicula.original_title || "");
                return tituloApi.includes(terminoNormalizado) || tituloOriginal.includes(terminoNormalizado);
            });

            if (!resultadoSimilar) {
                throw new Error("No hay coincidencia de título");
            }

            return obtenerDetallesPelicula(resultadoSimilar.id)
                .then(datos => {
                    if (!datos || !datos.Title) {
                        throw new Error("Detalles de película no disponibles");
                    }
                    return {
                        ...datos,
                        id: resultadoSimilar.id,
                        movieId: resultadoSimilar.id
                    };
                });
        });
}

function procesarIntentoFallido(adivinanza = "", datosGuess = null) {
    if (!datosGuess) {
        agregarFilaError(adivinanza, null);
    }
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
                window.location.href = `./resultados.html?aciertos=${aciertosTotal}&nivel=${nivelActual}`;
            }
        }, 2000);
        return;
    }

    renderizarIntentos();
    entradaAdivinar.value = "";
    entradaAdivinar.focus();
}

function procesarOmitir() {
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
                window.location.href = `./resultados.html?aciertos=${aciertosTotal}&nivel=${nivelActual}`;
            }
        }, 2000);
        return;
    }

    renderizarIntentos();
    entradaAdivinar.value = "";
    entradaAdivinar.focus();
}

function agregarFilaError(adivinanza, datosGuess) {
    const fila = document.createElement("tr");

    const celdaPeli = document.createElement("td");
    celdaPeli.textContent = datosGuess?.Title || adivinanza || "Incorrecto";
    celdaPeli.style.backgroundColor = "#ff4d4d";
    celdaPeli.style.color = "#fff";

    const celdaYear = document.createElement("td");
    celdaYear.textContent = datosGuess?.Year || "-";
    celdaYear.style.backgroundColor = "#ff4d4d";
    celdaYear.style.color = "#fff";

    const celdaGenero = document.createElement("td");
    celdaGenero.textContent = datosGuess?.Genre || "-";
    celdaGenero.style.backgroundColor = "#ffb84d";
    celdaGenero.style.color = "#000";

    const celdaRating = document.createElement("td");
    celdaRating.textContent = datosGuess?.imdbRating || "-";
    celdaRating.style.backgroundColor = "#ff4d4d";
    celdaRating.style.color = "#fff";

    const celdaDirector = document.createElement("td");
    celdaDirector.textContent = datosGuess?.Director || "-";
    celdaDirector.style.backgroundColor = "#ff4d4d";
    celdaDirector.style.color = "#fff";

    const celdaPais = document.createElement("td");
    celdaPais.textContent = datosGuess?.Country || "-";
    celdaPais.style.backgroundColor = "#ff4d4d";
    celdaPais.style.color = "#fff";

    fila.appendChild(celdaPeli);
    fila.appendChild(celdaYear);
    fila.appendChild(celdaGenero);
    fila.appendChild(celdaRating);
    fila.appendChild(celdaDirector);
    fila.appendChild(celdaPais);

    tablaIntentos.appendChild(fila);
}

function manejarAdivinanza() {
    const adivinanza = entradaAdivinar.value.trim();
    if (!adivinanza) return;

    let intentoProcesado = false;

    buscarPeliculaPorTitulo(adivinanza)
        .then(datos => {
            try {
                const guessedMovieId = datos?.movieId ?? datos?.id;
                if (peliculasIntentadas.has(guessedMovieId)) {
                    alert("Ya intentaste esa película. Prueba con otra.");
                    return;
                }

                peliculasIntentadas.add(guessedMovieId);
                const esCorrecto = datos && ((guessedMovieId === peliculaActualID) || (String(guessedMovieId) === String(peliculaActualID)));

                if (datos && datos.Title) {
                    agregarFilaIntento(datos, esCorrecto);
                    intentoProcesado = true;
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
                            window.location.href = `./resultados.html?aciertos=${aciertosTotal}&nivel=${nivelActual}`;
                        }
                    }, 2000);
                } else {
                    procesarIntentoFallido(adivinanza, datos);
                }
            } catch (innerError) {
                console.error("Error al procesar la adivinanza después de la búsqueda", innerError);
                if (!intentoProcesado) {
                    alert("Ocurrió un error interno al procesar la adivinanza. Intenta de nuevo.");
                }
            }
        })
        .catch(error => {
            console.error("Error al obtener datos de la película", error);
            if (intentoProcesado) {
                return;
            }
            if (error?.message && (error.message.includes("No hay") || error.message.includes("Detalles"))) {
                alert("No se encontró una película exacta con ese título. Usa el nombre completo de la película.");
            } else {
                alert("Ocurrió un error al procesar la búsqueda. Intenta de nuevo.");
            }
        });
}

botonAdivinar.addEventListener("click", manejarAdivinanza);
botonOmitir.addEventListener("click", () => {
    if (botonOmitir.disabled) return;
    procesarOmitir();
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
    intentosPoster = 0;
    if (reintentos >= 3) {
        console.error("No se pudo cargar una película válida después de varios intentos.");
        divPortada.textContent = "Error al cargar la película";
        divPortada.style.color = "#fff";
        divPortada.style.display = "flex";
        divPortada.style.alignItems = "center";
        divPortada.style.justifyContent = "center";
        return;
    }

    cargarPeliculaAleatoria()
        .then(datosCompletos => {
            peliculaActualID = datosCompletos.id;
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
    datosPelicula = {};
    intentosPoster = 0;
    actualizarNumeroPelicula();

    const filasExistentes = tablaIntentos.querySelectorAll("tr:not(.encabezados)");
    filasExistentes.forEach(fila => fila.remove());

    botonAdivinar.disabled = false;
    botonOmitir.disabled = false;
    entradaAdivinar.disabled = false;
    entradaAdivinar.value = "";
    entradaAdivinar.focus();
    peliculasIntentadas.clear();

    renderizarIntentos();
    limpiarSugerencias();

    if (peliculaActual > totalPeliculas) {
        window.location.href = `./resultados.html?aciertos=${aciertosTotal}&nivel=${nivelActual}`;
        return;
    }

    cargarPeliculaActual();
}

nivelActual = obtenerNivelActualDesdePagina();
totalPeliculas = obtenerIDsDelNivel(nivelActual).length || 5;
actualizarNumeroPelicula();
document.title = `Pelicudle - Nivel ${nivelActual}`;

renderizarIntentos();

cargarPeliculaActual();