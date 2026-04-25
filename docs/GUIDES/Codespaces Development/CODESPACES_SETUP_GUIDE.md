# TasteBook — Guía de Desarrollo en GitHub Codespaces

Esta guía cubre todo lo necesario para levantar el entorno de desarrollo desde cero en GitHub Codespaces.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar / abrir el Codespace](#2-clonar--abrir-el-codespace)
3. [Instalar dependencias](#3-instalar-dependencias)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Configurar la base de datos](#5-configurar-la-base-de-datos)
6. [Levantar los servidores](#6-levantar-los-servidores)
7. [Abrir los puertos y obtener la URL del backend](#7-abrir-los-puertos-y-obtener-la-url-del-backend)
8. [Flujo de trabajo diario](#8-flujo-de-trabajo-diario)
9. [Comandos de referencia rápida](#9-comandos-de-referencia-rápida)

---

## 1. Requisitos previos

- Cuenta en GitHub con acceso al repositorio **TasteBook**.
- (Opcional) Una cuenta en [Cloudinary](https://cloudinary.com/) si vas a probar la subida de imágenes.

No hace falta instalar nada localmente: Codespaces proporciona el contenedor con Python 3.13, Node 20, pipenv y todas las herramientas necesarias.

---

## 2. Clonar / abrir el Codespace

Desde la página del repositorio en GitHub:

```
Code → Codespaces → Create codespace on <rama>
```

O si ya tienes el repo clonado localmente, abre VS Code, instala la extensión **GitHub Codespaces** y conéctate desde ahí.

Una vez que el Codespace termina de arrancar, se abre un terminal integrado en `/workspaces/tastebook`.

---

## 3. Instalar dependencias

Debes instalar tanto las dependencias de Python como las de Node. **No hace falta activar el entorno virtual manualmente**; `pipenv run` lo maneja solo.

### Python (backend)

```bash
pipenv install
```

> Esto crea o sincroniza el virtualenv gestionado por `pipenv` con los paquetes del `Pipfile`.

### Node (frontend)

```bash
npm install
```

---

## 4. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
```

Abre `.env` y revisa / completa los valores:

```dotenv
# ── Backend ────────────────────────────────────────────────────────────────
DATABASE_URL=postgres://tastebook_user:postgres@localhost:5432/tastebook
FLASK_APP=src/app.py
FLASK_DEBUG=1

# Genera una clave con:
#   python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY="pon-aqui-tu-clave-secreta"

# ── Frontend ────────────────────────────────────────────────────────────────
VITE_BASENAME=/

# URL pública del backend en Codespaces (ver Sección 7)
VITE_BACKEND_URL=https://<codespace-name>-3001.app.github.dev

# ── Cloudinary (opcional) ───────────────────────────────────────────────────
# CLOUDINARY_CLOUD_NAME="???"
# CLOUDINARY_API_KEY="???"
# CLOUDINARY_API_SECRET="???"
```

> **IMPORTANTE — `VITE_BACKEND_URL`:** En Codespaces la URL del puerto 3001 es pública y tiene una forma como
> `https://<nombre-del-codespace>-3001.app.github.dev`.  
> Puedes obtenerla en la pestaña **Ports** de VS Code (ver Sección 7) y copiarla aquí antes de arrancar el frontend.

---

## 5. Configurar la base de datos

### 5a. Verificar que PostgreSQL está corriendo

Codespaces no arranca PostgreSQL automáticamente. Comprueba su estado y arráncalo si es necesario:

```bash
pg_lsclusters          # ver si hay un cluster activo
sudo service postgresql start
```

### 5b. Crear el usuario y la base de datos (solo la primera vez)

```bash
sudo -u postgres psql -c "CREATE USER tastebook_user WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE tastebook OWNER tastebook_user;"
```

### 5c. Inicializar / aplicar migraciones

Si es la **primera vez** que configuras el proyecto (no existe la carpeta `migrations/versions`):

```bash
pipenv run init
pipenv run migrate
pipenv run upgrade
```

Si el proyecto ya tiene migraciones y solo necesitas actualizarlas:

```bash
pipenv run migrate
pipenv run upgrade
```

O bien usa el script automático que detecta el caso correcto:

```bash
bash database.sh
```

---

## 6. Levantar los servidores

El proyecto tiene **tres servicios** que necesitas correr simultáneamente.  
Lo más cómodo es usar **tres terminales separadas** en VS Code.

### Terminal 1 — Backend REST API (puerto 3001)

```bash
pipenv run api
```

> Arranca Flask en `http://0.0.0.0:3001`. **No necesitas activar el virtualenv antes**; `pipenv run` lo hace internamente.

### Terminal 2 — WebSocket server (puerto 3002)

```bash
pipenv run python src/socket_app.py
```

### Terminal 3 — Frontend Vite (puerto 3000)

```bash
npm run dev
```

> Vite escucha en `0.0.0.0:3000` y queda expuesto en Codespaces automáticamente.

---

### Alternativa: levantar todo con un solo comando

Si prefieres una sola terminal (los logs se mezclan):

```bash
pipenv run dev
```

O usando el script de gestión de procesos:

```bash
pipenv run start    # inicia API + WebSocket en background
pipenv run stop     # para ambos servicios
pipenv run status   # muestra el estado
```

---

## 7. Abrir los puertos y obtener la URL del backend

En GitHub Codespaces los puertos deben marcarse como **públicos** para que el frontend pueda comunicarse con el backend.

### Pasos en VS Code

1. Haz clic en la pestaña **Ports** (parte inferior de VS Code) o usa `Ctrl + Shift + P` → *Ports: Focus on Ports View*.
2. Verás los puertos detectados automáticamente (3000, 3001, 3002).
3. Haz clic derecho sobre el puerto **3001** → **Port Visibility** → **Public**.
4. Haz clic derecho sobre el puerto **3002** → **Port Visibility** → **Public**.
5. Copia la URL del puerto **3001** (tiene la forma `https://<codespace>-3001.app.github.dev`).

### Actualizar `.env` con esa URL

```dotenv
VITE_BACKEND_URL=https://<tu-codespace>-3001.app.github.dev
```

Guarda el archivo; Vite recargará la variable automáticamente gracias a HMR.

---

## 8. Flujo de trabajo diario

Una vez que el entorno está configurado, el día a día es:

```bash
# 1. Abrir el Codespace (GitHub o VS Code)

# 2. (Si PostgreSQL se detuvo) reiniciar
sudo service postgresql start

# 3. Levantar los tres servidores (en terminales separadas):
pipenv run api                      # Terminal 1 — REST API  :3001
pipenv run python src/socket_app.py # Terminal 2 — WebSocket :3002
npm run dev                         # Terminal 3 — Frontend  :3000

# 4. Verificar que los puertos 3001 y 3002 son públicos en la pestaña Ports

# 5. ¡A codear!
```

> **Entorno virtual:** No necesitas hacer `pipenv shell` ni `source .venv/bin/activate` para nada. Todos los comandos de Python se lanzan con `pipenv run <comando>`, que activa el virtualenv internamente sin ensuciar el shell.  
> Solo entra al shell interactivo del virtualenv si necesitas hacer debug rápido en una consola Python:
> ```bash
> pipenv shell   # entra al venv
> python         # consola interactiva
> exit           # sale del venv
> ```

---

## 9. Comandos de referencia rápida

| Acción | Comando |
|---|---|
| Instalar deps Python | `pipenv install` |
| Instalar deps Node | `npm install` |
| Arrancar REST API | `pipenv run api` |
| Arrancar WebSocket | `pipenv run python src/socket_app.py` |
| Arrancar frontend | `npm run dev` |
| Arrancar todo (una terminal) | `pipenv run dev` |
| Parar todo (script) | `pipenv run stop` |
| Ver estado de servicios | `pipenv run status` |
| Crear migraciones | `pipenv run migrate` |
| Aplicar migraciones | `pipenv run upgrade` |
| Revertir migración | `pipenv run downgrade` |
| Entrar al virtualenv | `pipenv shell` |
| Generar JWT secret | `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| Reiniciar PostgreSQL | `sudo service postgresql start` |

---

### Puertos en uso

| Puerto | Servicio |
|---|---|
| **3000** | Frontend (Vite / React) |
| **3001** | REST API (Flask) |
| **3002** | WebSocket server (Flask-SocketIO + Eventlet) |
