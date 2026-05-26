# NexusPlay: Video Game Recommendation Platform

## Pasos para ejecutar el proyecto localmente

### 1. Iniciar el Backend (Microservicios + Bases de Datos)
Asegúrate de tener Docker instalado y ejecutándose. Abre una terminal en la raíz del proyecto y ejecuta:
```bash
docker compose up --build -d
```
*Esto levantará el API Gateway, User Service, Catalog Service, Recommendation Engine, PostgreSQL y MongoDB.*

### 2. Poblar la Base de Datos (Opcional pero recomendado)
Si es la primera vez que lo ejecutas, navega a `storage/data-pipeline/` e instala las dependencias de Python y corre el seeder para obtener juegos de Steam:
```bash
cd storage/data-pipeline
pip install -r requirements.txt
python seed.py
cd ../..
```

### 3. Iniciar el Frontend
En una nueva terminal, navega a la carpeta del cliente web, instala las dependencias de Node e inicia el servidor de desarrollo:
```bash
cd frontend/web-client
npm install
npm run dev
```

El frontend estará disponible en [http://localhost:5173](http://localhost:5173).
