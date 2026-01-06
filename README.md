<div align="center">

# 🎮 OK TEAM Quiz App

**Sistema de trivial interactivo en tiempo real diseñado para eventos presenciales.**
Permite a un presentador (Host) gestionar preguntas en una pantalla grande mientras los participantes responden desde sus dispositivos móviles.

![Status](https://img.shields.io/badge/Status-Production%20Ready-2ea44f?style=for-the-badge&logo=github)
![Stack](https://img.shields.io/badge/Stack-PERN%20%2B%20Socket.io-3178c6?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</div>

---

## 📋 Tabla de Contenidos

1. [Características](#-características-principales)
2. [Tecnologías](#-tecnologías)
3. [Instalación y Configuración](#-instalación-y-configuración-local)
4. [Despliegue](#-despliegue-producción)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Manual de Uso](#-manual-de-uso-rápido)

---

## ✨ Características Principales

* **⚡ Tiempo Real:** Comunicación instantánea entre servidor y clientes usando `Socket.io` (WebSockets).
* **👥 Roles Diferenciados:**
    * **Host:** Vista diseñada para TV/Proyector. Genera código QR de acceso dinámico y muestra rankings en vivo.
    * **Jugador:** Interfaz móvil (Mobile First) optimizada para responder preguntas rápidamente.
    * **Admin:** Panel protegido para gestionar la base de datos (CRUD completo de preguntas).
* **🛡️ Resiliencia:** Sistema de reconexión inteligente y manejo de sesiones para evitar "jugadores fantasma" ante caídas de red.
* **🔒 Seguridad:** Panel de administración protegido con autenticación.
* **📸 Multimedia:** Soporte nativo para preguntas que incluyen imágenes y videos.

---

## 🛠️ Tecnologías

Este proyecto utiliza una arquitectura **Cliente-Servidor (Monorepo)** basada en el stack PERN:

| Área | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | Servidor REST y gestión de WebSockets. |
| **Frontend** | React + Vite | SPA rápida y optimizada. |
| **Base de Datos** | PostgreSQL | Persistencia de datos relacional (vía Sequelize ORM). |
| **Comunicación** | Socket.io | Eventos bidireccionales en tiempo real. |
| **Estilos** | CSS3 Nativo | Diseño totalmente Responsive y personalizado. |

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
ADMIN_PASSWORD=contraseña_segura

# --- Base de Datos (PostgreSQL Local) ---
DB_NAME=name_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_DIALECT=postgres
```
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
## 📖 Manual de Uso Rápido

1.  **Iniciar Evento (Host):**
    Abra la URL de la aplicación en la pantalla principal (TV/Proyector). El sistema detectará el dispositivo y entrará automáticamente como **HOST**.

2.  **Panel Admin:**
    Haga clic en el icono discreto de candado 🔒 (esquina inferior derecha de la vista Host) o navegue manualmente a `/admin`. Ingrese la contraseña configurada en el archivo `.env`.

3.  **Unirse (Jugadores):**
    Los jugadores deben escanear el código QR proyectado o entrar a la URL mostrada en sus dispositivos móviles.

4.  **Jugar:**
    El Host controla el flujo pulsando **"Siguiente Pregunta"**. El sistema avanza automáticamente cuando todos los jugadores activos han respondido o si el Host fuerza el avance manualmente.

---

<div align="center">
  <sub>Desarrollado con ❤️ para OK TEAM</sub>
</div>
