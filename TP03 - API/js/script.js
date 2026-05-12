// Ejercicio 1

const botonFetch0 = document.getElementById("botonFetch0");

function ej1() {
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => response.json())
        .then(usuarios => {
            usuarios.forEach(usuario => {
                console.log("Nombre: ", usuario.name);
                console.log("E-mail: ", usuario.email);
                console.log("---------------------")
            });
        });
}

botonFetch0.addEventListener('click', ej1);

// Ejercicio 2

const contenedorLista = document.getElementById("contenedorLista");

function ej2() {
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => response.json())
        .then(usuarios => {
            const ul = document.createElement("ul");
            usuarios.forEach(usuario => {
                const li = document.createElement("li");
                li.textContent = usuario.name;
                ul.appendChild(li)
            });
            contenedorLista.appendChild(ul);
        })
}

botonFetch1.addEventListener('click', ej2);


// Ejercicio 3

const btnSubmit = document.getElementById("botonFetch2");
const contenedorLista2 = document.getElementById("contenedorLista2");

function filtrar() {
    const filtro = document.getElementById("inputEj3").value.toLowerCase();
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => response.json())
        .then(usuarios => {
            const ul = document.createElement("ul");

            const usuariosFiltrados = usuarios.filter(usuario =>
                usuario.name.toLowerCase().includes(filtro)
            );

            usuariosFiltrados.forEach(usuario => {
                const li = document.createElement("li");
                li.textContent = usuario.name;
                ul.appendChild(li);
            });

            contenedorLista2.appendChild(ul);
        })

}

botonFetch2.addEventListener('click', filtrar);


// Ejercicio 4
