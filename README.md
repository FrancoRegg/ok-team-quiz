# 🎮 OK TEAM Quiz App

Sistema de trivial interactivo en tiempo real diseñado para eventos presenciales. Permite a un presentador (Host) gestionar preguntas en una pantalla grande mientras los participantes responden desde sus dispositivos móviles.

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Stack](https://img.shields.io/badge/Stack-PERN%20%2B%20Socket.io-blue)

## ✨ Características Principales

* **Tiempo Real:** Comunicación instantánea entre servidor y clientes usando `Socket.io`.
* **Roles Diferenciados:**
    * **Host:** Vista para proyectar en TV/Proyector. Genera código QR de acceso dinámico y muestra rankings en vivo.
    * **Jugador:** Interfaz móvil optimizada para responder preguntas.
    * **Admin:** Panel protegido para crear, leer, editar y borrar preguntas (CRUD completo) y gestionar la base de datos.
* **Resiliencia:** Sistema de reconexión inteligente y manejo de sesiones para evitar desconexiones y "jugadores fantasma".
* **Seguridad:** Panel de administración protegido con contraseña.
* **Multimedia:** Soporte para preguntas con imágenes y videos.

## 🛠️ Tecnologías

Este proyecto utiliza una arquitectura **Cliente-Servidor (Monorepo)**:

* **Backend:** Node.js, Express.
* **Frontend:** React, Vite.
* **Base de Datos:** PostgreSQL (con ORM Sequelize).
* **Comunicación:** Socket.io (WebSockets).
* **Estilos:** CSS3 nativo (Diseño Responsive).

## 🚀 Instalación y Configuración Local

### 1. Requisitos Previos
* Node.js (v18 o superior).
* PostgreSQL instalado y corriendo localmente.

### 2. Clonar e Instalar
El proyecto tiene dependencias en la raíz, en el servidor y en el cliente.

```bash
# Clonar repositorio
git clone <URL_DEL_REPO>
cd OK-TEAM-QUIZ

# Instalar dependencias del Backend y generales
npm install

# Instalar dependencias del Frontend
cd client
npm install
cd ..
3. Configuración de Variables de Entorno (.env)
Crea un archivo .env en la carpeta raíz del proyecto con la siguiente estructura. Ajusta los valores según tu configuración local de PostgreSQL:

Fragmento de código

# Servidor
PORT=3000
NODE_ENV=development

# Seguridad (Contraseña para entrar al panel /admin)
ADMIN_PASSWORD=contraseña

# Base de Datos (PostgreSQL Local)
DB_NAME=name_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_DIALECT=postgres

4. Ejecutar en Desarrollo
Para desarrollar, necesitas dos terminales abiertas:

Terminal 1 (Backend):

Bash

node server/server.js
# O si tienes nodemon: npm run dev

Terminal 2 (Frontend):

Bash

cd client
npm run dev

📦 Despliegue (Producción)

El proyecto está configurado para desplegarse fácilmente en plataformas en la nube como Railway o Render.

Estrategia de Build
El archivo package.json en la raíz contiene un script de build inteligente que:

Instala las dependencias del cliente.

Compila la aplicación React (npm run build) generando la carpeta client/dist.

El servidor Node.js está configurado para servir estos archivos estáticos automáticamente en producción.

Pasos para Desplegar (Ej: Railway)

Conectar repositorio de GitHub a Railway.

Añadir el servicio de Base de Datos PostgreSQL.

Configurar las Variables de Entorno en el panel del hosting:

PORT: 3000 (o el que asigne el hosting).

DATABASE_URL: (Generalmente se autoconfigura al añadir Postgres).

ADMIN_PASSWORD: La contraseña deseada para el administrador.

NODE_ENV: production.

📂 Estructura del Proyecto

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

📖 Manual de Uso Rápido

Iniciar Evento: Abrir la URL de la aplicación en la pantalla principal (TV/Proyector). Entrará automáticamente como HOST.

Panel Admin: Hacer clic en el icono discreto de candado 🔒 (esquina inferior derecha del Host) o ir a /admin.

Unirse: Los jugadores escanean el QR o entran a la URL mostrada en sus móviles.

Jugar: El Host controla el flujo ("Siguiente Pregunta"). El sistema avanza automáticamente cuando todos los jugadores activos han respondido o el Host fuerza el avance.

Desarrollado para OK TEAM.