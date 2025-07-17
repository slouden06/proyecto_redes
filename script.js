// Inicializar el mapa centrado en Bogotá
const map = L.map('map').setView([4.648, -74.1], 12);

// Cargar mapa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Variable global para las zonas
let todasLasZonas = [];

// Función IA básica de predicción (por si la reactivamos luego)
function predecirMejora(estado, accion) {
  if (estado === "Crítico" && accion === "Reforestación") return "Regular";
  if (estado === "Crítico" && accion === "Limpieza") return "Crítico";
  if (estado === "Regular" && accion === "Campaña comunitaria") return "Bueno";
  if (estado === "Regular" && accion === "Reforestación") return "Bueno";
  if (estado === "Bueno") return "Bueno";
  return estado;
}

// Función para calcular distancia entre dos coordenadas (para recomendaciones)
function distancia(coord1, coord2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(coord2[0] - coord1[0]);
  const dLon = toRad(coord2[1] - coord1[1]);
  const lat1 = toRad(coord1[0]);
  const lat2 = toRad(coord2[0]);

  const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function recomendarZonas(zonaActual) {
  const mismasTipo = todasLasZonas.filter(z =>
    z.nombre !== zonaActual.nombre &&
    z.tipo === zonaActual.tipo
  );

  const conDistancia = todasLasZonas
    .filter(z => z.nombre !== zonaActual.nombre)
    .map(z => ({
      zona: z,
      distancia: distancia(zonaActual.coordenadas, z.coordenadas)
    }));

  conDistancia.sort((a, b) => a.distancia - b.distancia);
  const masCercana = conDistancia[0]?.zona;

  let html = '';

  if (mismasTipo.length > 0) {
    html += `<b>Del mismo tipo (${zonaActual.tipo}):</b><ul>`;
    mismasTipo.forEach(z => {
      html += `<li>${z.nombre}</li>`;
    });
    html += `</ul>`;
  } else {
    html += `<i>No hay más ${zonaActual.tipo}s cercanos.</i><br>`;
  }

  if (masCercana) {
    html += `<b>Más cercana:</b><br>• ${masCercana.nombre} (${masCercana.tipo})`;
  }

  return html;
}


// Mostrar popup personalizado
function mostrarPopup(zona, ubicacion) {
  const contenedor = document.createElement('div');
  contenedor.style.width = "320px";
  contenedor.style.fontFamily = "Arial, sans-serif";

  contenedor.innerHTML = `
    <div style="background:#4CAF50; color:white; padding:10px; border-radius:8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
      <h3 style="margin:0;">${zona.nombre}</h3>
    </div>
    <div style="padding:10px; background:white; border:1px solid #4CAF50; border-top:0; border-radius:0 0 8px 8px;">
      <b>Estado:</b> ${zona.estado}<br>
      <b>Horario:</b> ${zona.horarios}<br>
      <b>Extensión:</b> ${zona.longitud}<br>
      <b>Actividades:</b> ${zona.actividades.join(', ')}<br>
      <b>Lugares cercanos:</b> ${zona.lugares_cercanos.join(', ')}<br><br>

      <b>⭐ Califica este parque:</b><br>
      <select id="calificacion">
        <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
        <option value="4">⭐⭐⭐⭐ Muy bueno</option>
        <option value="3">⭐⭐⭐ Aceptable</option>
        <option value="2">⭐⭐ Regular</option>
        <option value="1">⭐ Malo</option>
      </select><br><br>

      <label for="comentario"><b>💬 Comentario para mejorar la diversidad ecológica de Bogota:</b></label><br>
      <textarea id="comentario" rows="3" style="width:100%; margin-top:4px; border-radius:4px; border:1px solid #ccc;"></textarea><br><br>

      <button style="background:#4CAF50; color:white; border:none; padding:6px 10px; border-radius:4px;">Enviar</button>

      <hr>
      <b>🔁 Recomendaciones similares:</b><br>
      <div id="recomendaciones" style="font-size: 14px;"></div>
    </div>
  `;

  const popup = L.popup().setLatLng(ubicacion).setContent(contenedor).openOn(map);

  setTimeout(() => {
    const recomendacionesDiv = document.getElementById('recomendaciones');
    recomendacionesDiv.innerHTML = recomendarZonas(zona);
  }, 100);
}
function tipoAColor(tipo) {
  switch (tipo) {
    case "Parque": return "#4CAF50";      // Verde
    case "Humedal": return "#2196F3";     // Azul
    case "Zona Verde": return "#FFEB3B";  // Amarillo
    case "Jardín Botánico": return "#9C27B0"; // Morado
    case "Reserva": return "#795548";     // Marrón
    default: return "#9E9E9E";            // Gris para otros
  }
}

// Cargar las zonas desde el archivo JSON
fetch('zonas_verdes.json')
  .then(response => response.json())
  .then(data => {
    todasLasZonas = data.zonas;

    data.zonas.forEach(zona => {
  const color = tipoAColor(zona.tipo);
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color}; width:14px; height:14px; border-radius:50%; border: 2px solid white;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const marker = L.marker(zona.coordenadas, { icon }).addTo(map);
  marker.on('click', () => mostrarPopup(zona, zona.coordenadas));
});

  });
const leyenda = L.control({ position: 'bottomright' });

leyenda.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'info legend');
  const tipos = ["Parque", "Humedal", "Zona Verde", "Jardín Botánico", "Reserva"];
  const colores = tipos.map(tipoAColor);

  let contenido = '<b>Tipos de zona verde</b><br>';
  tipos.forEach((tipo, i) => {
    contenido += `<div style="margin-bottom:4px;">
      <span style="background:${colores[i]}; width:14px; height:14px; display:inline-block; border-radius:50%; margin-right:6px;"></span>
      ${tipo}
    </div>`;
  });

  div.innerHTML = contenido;
  div.style.background = "white";
  div.style.padding = "10px";
  div.style.border = "1px solid #ccc";
  div.style.borderRadius = "6px";
  div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.3)";
  div.style.fontSize = "13px";

  return div;
};

leyenda.addTo(map);

document.getElementById('menuToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const isVisible = sidebar.style.left === '0px';

  if (isVisible) {
    sidebar.style.left = '-250px';
    mostrarSeccion('mapa');  
  } else {
    sidebar.style.left = '0px';
  }
});

function mostrarSeccion(seccion) {
  const contenedor = document.getElementById('contenido');
  function mostrarSeccion(seccion) {
  const contenedor = document.getElementById('contenido');

  if (seccion === 'mapa') {
    contenedor.style.display = 'none';
    if (!map.hasControl(leyenda)) {
      leyenda.addTo(map);
    }
    return;
  }
  map.removeControl(leyenda);
  contenedor.style.display = 'block';

  }
  if (seccion === 'mapa') {
    contenedor.style.display = 'none';
    return;
  }

  // Mostrar el panel flotante
  contenedor.style.display = 'block';

  if (seccion === 'zonas') {
    let html = '<h2>Zonas Verdes de Bogotá</h2>';
    todasLasZonas.forEach(zona => {
      html += `
        <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #ccc;">
          <h3>${zona.nombre}</h3>
          <img src="${zona.imagen}" style="width:100%; max-height:180px; object-fit:cover; border-radius:6px;" />
          <p><b>Tipo:</b> ${zona.tipo}<br>
             <b>Estado:</b> ${zona.estado}<br>
             <b>Actividades:</b> ${zona.actividades.join(', ')}<br>
             <b>Informaion:</b> ${zona.informacion}<br>
          </p>
        </div>`;
    });
    contenedor.innerHTML = html;
  }

  if (seccion === 'consejos') {
    contenedor.innerHTML = `
      <h2>Consejos para cuidar las zonas verdes</h2>
      <ul>
        <li>🌿 1. No tires basura
Lleva una bolsa para tus desechos si vas a un parque.

Usa los contenedores según el tipo de residuo (orgánico, plástico, papel).</li>
        <li>🌱 2. Respeta las plantas y el césped
No pises las áreas verdes si hay senderos disponibles.

No arranques flores, ramas ni hojas..</li>
        <li>🐶 3. Si llevas mascotas, recoge sus desechos
Lleva bolsas para recoger sus excrementos.

Usa siempre correa para evitar que dañen la vegetación.</li>
        <li>🔥 4. No hagas fogatas ni quemes basura
El fuego puede causar incendios y destruir hábitats.

Algunas especies nativas son muy sensibles al calor.</li>
        <li>🚯 5. No contamines el agua de fuentes o lagos
No viertas líquidos ni laves objetos en estos lugares.

Mantén a los niños alejados del agua si no está habilitada para el juego.</li>
      </ul>`;
  }

  if (seccion === 'historial') {
    contenedor.innerHTML = `
      <h2>Historia de las Zonas Verdes en Bogotá</h2>
      <p> 🌿 Historia de las Zonas Verdes en Bogotá
🏞️ Época prehispánica y colonial
Antes de la colonización, los Muiscas habitaban la Sabana de Bogotá, rodeados de lagunas sagradas, humedales y grandes extensiones verdes que cumplían funciones espirituales y de sustento.

Durante la Colonia, se inició una transformación del paisaje con la deforestación para la agricultura, la ganadería y la construcción de caminos y templos.

🧱 Siglo XIX: Primeras ideas de espacio público
A mediados del siglo XIX, Bogotá empezó a consolidarse como capital.

Se construyen los primeros parques formales como el Parque Centenario (actual Parque de los Mártires).

Se valoraban los jardines y paseos como elementos civilizadores de la ciudad moderna.

🌳 Siglo XX: Expansión urbana y parques urbanos
Décadas de 1930-50: Se crean parques urbanos importantes como el Parque Nacional Enrique Olaya Herrera (1934), inspirado en modelos europeos.

1960-70: Bogotá crece rápidamente, y con ello se planifican parques recreativos más grandes, como el Parque Simón Bolívar (1979), considerado el pulmón verde de la ciudad.

Se pierde una gran parte de los humedales debido a la urbanización desordenada.

♻️ Finales del siglo XX: Conciencia ecológica
Aparecen políticas públicas enfocadas en la recuperación ambiental y el uso sostenible del suelo.

Se empieza a reconocer la importancia ecológica de los humedales restantes y se crean zonas de protección.

Se promueve el concepto de corredores ecológicos, conectando parques, cerros y humedales.

</p>`;
  }
  

  if (seccion === 'salud') {
    contenedor.innerHTML = `
      <h2>Beneficios para la Salud</h2>
      <p>🌿 Beneficios para la Salud de las Zonas Verdes
🧠 1. Salud mental y emocional
Reducen el estrés, ansiedad y depresión.

Estar en contacto con la naturaleza mejora el estado de ánimo.

Espacios verdes promueven la calma, el descanso mental y la atención plena (mindfulness).

❤️ 2. Salud cardiovascular
Caminar, trotar o montar bicicleta en parques disminuye el riesgo de enfermedades cardíacas.

Mejora la presión arterial y la circulación sanguínea.

😌 3. Mejora de la calidad del aire
Las plantas filtran contaminantes y producen oxígeno.

Disminuye el riesgo de enfermedades respiratorias como el asma o la bronquitis, especialmente en niños y adultos mayores.

🏃 4. Fomento del ejercicio físico
Los parques son espacios gratuitos y accesibles para hacer actividad física.

Estimula hábitos saludables como caminar, correr, hacer yoga o jugar.

🧒👵 5. Bienestar infantil y del adulto mayor
Los niños desarrollan mejor su motricidad, creatividad y habilidades sociales al jugar al aire libre.

Las personas mayores encuentran espacios seguros para mantenerse activas, lo cual previene enfermedades y mejora el ánimo.

🧬 6. Fortalecimiento del sistema inmunológico
El contacto con microorganismos naturales y ambientes menos contaminados fortalece las defensas del cuerpo.</p>`;
  }

  if (seccion === 'turismo') {
    contenedor.innerHTML = `
      <h2>Impacto Turístico y Estético</h2>
      <p>🌿 Impacto Turístico y Estético de las Zonas Verdes
🧳🌆 1. Atractivo turístico natural
Bogotá es reconocida por su biodiversidad urbana, especialmente en los cerros orientales, parques urbanos como el Simón Bolívar, y humedales únicos en el contexto latinoamericano.

Turistas nacionales e internacionales visitan estas áreas por su valor escénico, ecológico y cultural (ej. senderos en Monserrate, humedal La Conejera, Jardín Botánico).

Las zonas verdes impulsan el ecoturismo urbano: caminatas ecológicas, avistamiento de aves, fotografía de naturaleza, etc.

🎭🖼️ 2. Espacios para la cultura y el arte
Muchos parques sirven como escenarios de eventos culturales, conciertos, ferias, exposiciones y actividades comunitarias.

Esto genera dinamismo turístico y promueve una imagen positiva de la ciudad como espacio vivo y diverso.

🏙️💚 3. Embellecimiento urbano
Las zonas verdes rompen la monotonía del concreto, agregan color y textura al paisaje urbano.

Mejoran la percepción estética de los barrios, avenidas y centros históricos.

Incrementan el valor visual de la ciudad y la hacen más agradable para residentes y visitantes.

🏡📸 4. Revalorización del entorno
Áreas cercanas a parques y jardines suelen aumentar su valor inmobiliario.

Las zonas verdes se convierten en íconos urbanos que embellecen postales, redes sociales y material turístico.</p>`;
  }
  if (seccion === 'asistente') {
  contenedor.innerHTML = `
    <h2>Asistente Ecológico Inteligente 🌿🤖</h2>
    <p>Haz preguntas como:</p>
    <ul>
      <li><em>¿Por qué son importantes los humedales?</em></li>
      <li><em>¿Qué parque es bueno para caminar?</em></li>
      <li><em>¿Cómo puedo cuidar las zonas verdes?</em></li>
    </ul>

    <textarea id="preguntaIA" rows="3" placeholder="Escribe tu pregunta aquí..." style="width:100%; padding:6px;"></textarea>
    <button onclick="consultarIA_simulada()" style="margin-top:6px; background:#4CAF50; color:white; padding:8px; border:none; border-radius:4px;">Consultar Asistente</button>

    <div id="respuestaIA" style="margin-top:1em; background:#f0f8f0; padding:12px; border-radius:6px; min-height:60px;"></div>
  `;
}


}
function consultarIA_simulada() {
  const pregunta = document.getElementById("preguntaIA").value.trim().toLowerCase();
  const respuestaDiv = document.getElementById("respuestaIA");

  if (!pregunta) {
    respuestaDiv.innerHTML = "❗ Por favor escribe una pregunta.";
    return;
  }

  // Lista de respuestas simuladas
  const respuestas = [
    "Los humedales son fundamentales para conservar la biodiversidad y regular el agua en la ciudad.",
    "El Parque Simón Bolívar es excelente para hacer ejercicio, caminar o montar bicicleta.",
    "Puedes cuidar las zonas verdes no arrojando basura, respetando la vegetación y participando en jornadas de limpieza.",
    "Las zonas verdes ayudan a purificar el aire y reducen el estrés en los ciudadanos.",
    "Visitar parques y humedales es una forma saludable de conectarse con la naturaleza en la ciudad.",
    "Las reservas urbanas como Entrenubes protegen especies y ecosistemas únicos de Bogotá.",
    "El cuidado de las zonas verdes mejora la calidad del aire y embellece la ciudad para los visitantes.",
    "Caminar por los parques fortalece tu sistema inmune y mejora tu bienestar emocional.",
    "Recuerda: cada árbol plantado es un paso hacia una ciudad más resiliente al cambio climático.",
    "Las zonas verdes contribuyen a la seguridad hídrica y previenen inundaciones urbanas."
  ];

  // Simular una respuesta aleatoria
  const aleatoria = respuestas[Math.floor(Math.random() * respuestas.length)];
  respuestaDiv.innerHTML = `🌿 ${aleatoria}`;
}