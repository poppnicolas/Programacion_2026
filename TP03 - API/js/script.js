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

const botonFetch3 = document.getElementById("botonFetch3");
const contenedorLista3 = document.getElementById("contenedorLista3");

function ej4() {
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => response.json())
        .then(usuarios => {
            const ul = document.createElement("ul");
            const usuarioBuscado = usuarios.find(usuario => usuario.id === 1);

            const li = document.createElement("li");
            li.textContent = usuarioBuscado.name;

            const li2 = document.createElement("li");
            li2.textContent = usuarioBuscado.phone;

            const li3 = document.createElement("li");
            li3.textContent = usuarioBuscado.email;

            const li4 = document.createElement("li");
            li4.textContent = usuarioBuscado.address.city;

            ul.appendChild(li)
            ul.appendChild(li2)
            ul.appendChild(li3)
            ul.appendChild(li4)
            contenedorLista3.appendChild(ul);
        })
}

botonFetch3.addEventListener('click', ej4);

//ejercicio 5 


const botonFetch4 = document.getElementById("botonFetch4");

function ej5() {

    fetch("https://jsonplaceholder.typicode.com/users", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Lucas Schroeder", email: "lschroeder@obralapiedad.com.ar" })
    })
        .then((response) => response.json())
        .then((json) => console.log(json));
}

botonFetch4.addEventListener('click', ej5);