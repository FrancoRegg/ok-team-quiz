<div align="center">

# 🎮 OK TEAM Quiz

**Sistema de trivia interactivo en tiempo real para eventos presenciales.**

📌 **Proyecto desarrollado para un cliente real — Actualmente en producción**

![Status](https://img.shields.io/badge/Status-Production%20Ready-2ea44f?style=for-the-badge&logo=github)
![Stack](https://img.shields.io/badge/Stack-PERN%20%2B%20Socket.io-3178c6?style=for-the-badge&logo=react)

</div>

---

## 🚀 Sobre el Proyecto

Aplicación fullstack desarrollada de forma independiente en **2 meses** para una empresa que necesitaba dinamizar sus eventos presenciales con trivias interactivas.

El sistema permite a un presentador (Host) proyectar preguntas en una pantalla grande mientras los participantes responden en tiempo real desde sus móviles. Soporta **+20 jugadores simultáneos** con sincronización instantánea.

### Capturas de Pantalla

| Vista Host (Proyector/TV) | Vista Jugador (Móvil) |
|:-------------------------:|:---------------------:|
| ![Host mostrando pregunta](./screenshots/host-question.png) | ![Jugador respondiendo](./screenshots/player-answer.png) |

| Panel de Administración | Tabla de Posiciones |
|:-----------------------:|:-------------------:|
| ![Panel admin](./screenshots/admin-panel.png) | ![Leaderboard](./screenshots/leaderboard.png) |

---

## 💡 Desafíos Técnicos Resueltos

- **Comunicación en tiempo real:** Implementación de WebSockets con Socket.io para sincronizar estado entre Host y múltiples jugadores con latencia mínima.
- **Gestión de sesiones:** Sistema de reconexión inteligente que maneja caídas de red sin perder el estado del jugador.
- **Seguridad:** Autenticación JWT, contraseñas hasheadas con bcrypt, rate limiting (5 intentos = bloqueo 15 min), y sistema de recuperación con códigos únicos.
- **Arquitectura escalable:** Separación clara cliente-servidor en monorepo, preparado para despliegue en Railway/Render.

---

## 🛠️ Stack Tecnológico

| Backend | Frontend | Base de Datos | Tiempo Real |
|:-------:|:--------:|:-------------:|:-----------:|
| Node.js + Express | React + Vite | PostgreSQL | Socket.io |

---

## 🌐 Demo en Vivo

🔗 **[Ver aplicación](https://ok-team-quiz.onrender.com/)**

> ⚠️ **Nota:** La aplicación está alojada en el plan gratuito de Render. Si el servidor estuvo inactivo, la primera carga puede tardar entre 60-120 segundos en iniciar. Después de eso, funciona con normalidad.

---

## 📋 Tabla de Contenidos

1. [Características](#-características-principales)
2. [Instalación y Configuración](#-instalación-y-configuración-local)
3. [Despliegue](#-despliegue-producción)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Manual de Uso](#-manual-de-uso-rápido)

---

## ✨ Características Principales

* **⚡ Tiempo Real:** Comunicación instantánea entre servidor y clientes usando `Socket.io` (WebSockets).
* **👥 Roles Diferenciados:**
    * **Host:** Vista diseñada para TV/Proyector. Genera código QR de acceso dinámico y muestra rankings en vivo.
    * **Jugador:** Interfaz móvil (Mobile First) optimizada para responder preguntas rápidamente.
    * **Admin:** Panel protegido para gestionar la base de datos (CRUD completo de preguntas).
*  **🔐 Sistema de Seguridad Robusto:**
    * Autenticación con JWT y contraseña hasheada (bcrypt)
    * Rate limiting: 5 intentos fallidos = bloqueo de 15 minutos
    * Contraseña por defecto obligatoria de cambiar al primer uso
    * Sistema de recuperación con código único (RECOV-XXXX-XXXX)
* **📊 Gestión de Jugadores:**
    * Edición manual de puntuaciones (+/- puntos)
    * Limpieza de temporada (resetear todos los jugadores)
    * Contador automático de jugadores registrados
* **🛡️ Resiliencia:** Sistema de reconexión inteligente y manejo de sesiones para evitar "jugadores fantasma" ante caídas de red.
* **📸 Multimedia:** Soporte nativo para preguntas que incluyen imágenes y videos.

---

## 🚀 Instalación y Configuración Local

### 1. Requisitos Previos
* **Node.js** (v18 o superior).
* **PostgreSQL** instalado y ejecutándose localmente.

### 2. Clonar e Instalar
El proyecto tiene dependencias tanto en la raíz (para orquestación) como en las carpetas del cliente y servidor.
```
# 1. Clonar repositorio

git clone <URL_DEL_REPO>
cd OK-TEAM-QUIZ

# 2. Instalar dependencias del Backend y generales

npm install

# 3. Instalar dependencias del Frontend

cd client
npm install
cd ..
```
### 3. Variables de Entorno (.env)
Crea un archivo `.env` en la **raíz del proyecto** con la siguiente estructura.

> ⚠️ **Nota:** Ajusta los valores de base de datos según tu configuración local de PostgreSQL.
```env
# --- Servidor ---
PORT=3000
NODE_ENV=development

# --- Seguridad ---
# Contraseña para acceder a la ruta /admin
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura

# --- Base de Datos (PostgreSQL Local) ---
DB_NAME=name_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_DIALECT=postgres

# --- Frontend (solo para desarrollo local) ---
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```
> 💡 **Primera vez:** Al iniciar el servidor por primera vez, se creará automáticamente la contraseña por defecto: `Admin2024!`. Deberás cambiarla al hacer tu primer login en el panel de administración.

### 4. Ejecutar en Desarrollo
Para desarrollar, necesitas dos terminales abiertas simultáneamente:

Terminal 1 (Backend):
```
node server/server.js
# O si tienes nodemon instalado:
npm run dev
```
Terminal 2 (Frontend):
```
cd client
npm run dev
```
---

## 📦 Despliegue (Producción)

El proyecto está optimizado para desplegarse en plataformas PaaS como **Railway** o **Render**.

### Estrategia de Build
El archivo `package.json` en la raíz contiene un script de build (`postinstall` o `build`) que ejecuta las siguientes acciones automáticamente al desplegar:
1.  Instala las dependencias.
2.  Compila la aplicación React (`npm run build`) generando la carpeta `client/dist`.
3.  El servidor Node.js sirve estos archivos estáticos automáticamente si la variable de entorno es `NODE_ENV=production`.

### Pasos (Ejemplo: Railway)
1.  Conectar repositorio de GitHub a Railway.
2.  Añadir el servicio de **PostgreSQL** dentro del proyecto.
3.  Configurar las **Variables de Entorno**:
    * `PORT`: 3000 (o dejar vacío si la plataforma lo asigna automáticamente).
    * `DATABASE_URL`: (Se autoconfigura sola al añadir el plugin de Postgres).
    * `ADMIN_PASSWORD`: Tu contraseña de administrador.
    * `NODE_ENV`: `production`.
  
### Pasos (Ejemplo: Render)
1.  Conectar repositorio de GitHub a Render.
2.  Crear un **Web Service** (no Static Site).
3.  Crear una base de datos **PostgreSQL** en Render.
4.  Configurar las **Variables de Entorno**:
    * `PORT`: (Render lo asigna automáticamente, dejar vacío)
    * `DATABASE_URL`: Copiar desde el servicio de PostgreSQL creado
    * `JWT_SECRET`: Generar una clave secreta fuerte (mínimo 32 caracteres)
    * `NODE_ENV`: `production`
    * `VITE_API_URL`: URL de tu app (ej: `https://tu-app.onrender.com`)
    * `VITE_SOCKET_URL`: URL de tu app (ej: `https://tu-app.onrender.com`)

> ⚠️ **Importante:** Render puede tardar 1-2 minutos en iniciar después de inactividad.

---

## 📂 Estructura del Proyecto
```
OK-TEAM-QUIZ/
├── client/                 # Frontend React (Vite)
│   ├── dist/               # Build de producción (generado al desplegar)
│   ├── src/
│   │   ├── components/     # Vistas (Host, Admin, Player)
│   │   ├── styles/         # Archivos CSS
│   │   └── App.jsx         # Router y lógica principal
│   └── package.json
│
├── server/                 # Backend Node.js
│   ├── config/             # Configuración y conexión DB
│   ├── controllers/        # Lógica de negocio (CRUD Preguntas)
│   ├── models/             # Modelos Sequelize (Tablas)
│   ├── routes/             # Endpoints API
│   └── server.js           # Punto de entrada del servidor
│
├── package.json            # Script raíz para orquestar deploy
└── README.md               # Documentación
```

---

## 📖 Manual de Uso Rápido

1.  **Iniciar Evento (Host):**
    Abra la URL de la aplicación en la pantalla principal (TV/Proyector). El sistema detectará el dispositivo y entrará automáticamente como **HOST**.

2.  **Panel Admin:**
    Haga clic en el icono discreto de candado 🔒 (esquina inferior derecha de la vista Host) o navegue manualmente a `/admin`. 
3.  **Unirse (Jugadores):**
    Los jugadores deben escanear el código QR proyectado o entrar a la URL mostrada en sus dispositivos móviles.

4.  **Jugar:**
    El Host controla el flujo pulsando **"Siguiente Pregunta"**. El sistema avanza automáticamente cuando todos los jugadores activos han respondido o si el Host fuerza el avance manualmente.

---

## 🔐 Primer Uso - Configuración Inicial

### Para el Administrador:

1.  **Primer Login:**
    * Navega a `/admin` en tu navegador
    * Usuario: (no aplica)
    * Contraseña: `Admin2024!`

2.  **Cambiar Contraseña (OBLIGATORIO):**
    * Al entrar, verás un **banner rojo** de advertencia
    * Click en "Cambiar Ahora"
    * Completa el formulario:
        - Contraseña actual: `Admin2024!`
        - Nueva contraseña: (Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número)
    * Click "Guardar Nueva Contraseña"

3.  **Guardar Código de Recuperación:**
    * **MUY IMPORTANTE:** Aparecerá un modal morado con tu **código de recuperación**
    * Ejemplo: `RECOV-A3K9-PL2M`
    * **Copia o descarga este código** - lo necesitarás si olvidas tu contraseña
    * Este código se regenera cada vez que cambias la contraseña

### Si Olvidaste tu Contraseña:

1.  En la pantalla de login, click "¿Olvidaste la contraseña?"
2.  Ingresa tu **código de recuperación**
3.  Define una nueva contraseña
4.  Se generará un **nuevo código** - guárdalo de nuevo

---

## 🔧 Solución de Problemas Comunes

### "⛔ Contraseña incorrecta"
* Verifica mayúsculas/minúsculas
* Después de 5 intentos fallidos, espera 15 minutos

### "⚠️ No hay preguntas cargadas"
* Debes crear al menos 1 pregunta desde `/admin` antes de iniciar

### "El video no se reproduce"
* Verifica que la URL sea de formato `/embed` (YouTube) o `/preview` (Drive)
* Algunos videos de YouTube tienen restricciones de embedding

### "Jugadores no aparecen en el host"
* Verifica que ambos estén en la misma URL (http vs https)
* Recarga la página del host

### "Socket desconectado"
* Verifica la conexión a internet
* El sistema se reconectará automáticamente en 5 segundos

---

## 📸 Gestión de Imágenes y Videos

### Subir Imágenes:

**Opción 1: Google Drive**
1.  Sube la imagen a Google Drive
2.  Click derecho → "Compartir" → "Cualquier persona con el enlace"
3.  Copia el enlace (ej: `https://drive.google.com/file/d/1A2B3C4D5E/view`)
4.  **Modifica la URL:** Cambia `/view` por `/preview`
5.  URL final: `https://drive.google.com/file/d/1A2B3C4D5E/preview`

**Opción 2: Imgur (Recomendado para imágenes)**
1.  Ve a https://imgur.com/upload
2.  Sube tu imagen (no requiere cuenta)
3.  Click derecho en la imagen → "Copiar dirección de imagen"
4.  Pega esa URL en el panel de admin

### Subir Videos:

**Opción 1: YouTube**
1.  Sube el video a YouTube (puede ser No listado)
2.  Click en "Compartir" → "Insertar"
3.  Copia SOLO la URL del atributo `src` del iframe
4.  Ejemplo: `https://www.youtube.com/embed/VIDEO_ID`

**Opción 2: Google Drive**
1.  Sube el video a Google Drive
2.  Mismo proceso que imágenes: cambiar `/view` por `/preview`

---

<div align="center">
  <sub>Desarrollado con ❤️ por Franco Reggiardo</sub>
</div>
