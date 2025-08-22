# Stamp

Stamp is a quiz application geared towards individuals who want to quickly cycle through questions and receive immediate feedback.

## Question Format

Questions must be provided in CSV format. There is no limit to the number of CSV files that can be loaded.

### CSV Structure

Each CSV file must contain the following columns:

| Column   | Description | Format |
|----------|-------------|--------|
| Question | The question text | String (Include notes if multiple answers are expected) |
| Answer   | Available answers | JSON array of objects with answer text and is_correct flag |

### Question Types

The system automatically determines the question type based on the answer structure:

- **Multiple Choice**: When multiple answers have `is_correct: true`
- **Text Input**: When only a single answer option is provided

### Example

```csv
Question,Answer
"What is the capital of France?","[{\"text\": \"Paris\", \"is_correct\": true}, {\"text\": \"Lyon\", \"is_correct\": false}]"
"Name two primary colors (select all that apply)","[{\"text\": \"Red\", \"is_correct\": true}, {\"text\": \"Blue\", \"is_correct\": true}, {\"text\": \"Green\", \"is_correct\": false}]"
```
`example.csv` in the root of the repository can be loaded in the app as an example.

## Running with Docker (Recommended)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

To run the entire application using Docker, simply run:

```bash
# Clone the repository (if you haven't already)
git clone <your-repo-url>
cd stamp

# Build and start both services
docker-compose up --build
```

This will:
1. Build and start the FastAPI backend on port 8000
2. Build and start the React frontend on port 4000

### Docker Networking

In the Docker environment:
- The frontend container communicates with the backend using the hostname `backend` (the service name in docker-compose.yml)
- From your host machine, both services are accessible via `localhost` on their respective ports
- Other devices on your network can access both services using your machine's IP address

### Access the Application

- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:8000/docs (Swagger UI)

### Accessing from Other Devices on Your Network

To access the application from other devices on your local network:
1. Find your host machine's IP address:
   ```bash
   # On Linux/macOS
   ifconfig | grep "inet "
   # On Windows
   ipconfig
   ```
2. Access using that IP:
   - Frontend: http://<your-ip>:4000
   - Backend: http://<your-ip>:8000

### Docker Commands

```bash
# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up --build
```

## Manual Setup (Without Docker)

If you prefer to run without Docker:

### Backend Setup

```bash
# Navigate to backend directory
cd backend/

# Install uv
pip install uv

# Create and activate virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv sync

# Run the server
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Start the development server
npm start
```

Access the frontend at http://localhost:4000

## Troubleshooting Connection Issues

If the frontend can't connect to the backend:

1. Check container logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

2. Test the backend API directly:
```bash
curl -v http://localhost:8000/docs
```

3. Make sure the backend is running before accessing the frontend:
```bash
docker ps
```

4. Try rebuilding the containers:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

5. Check network communication:
```bash
# Enter the frontend container
docker exec -it stamp-frontend /bin/sh

# Test connection to backend (use service name, not localhost)
curl -v http://backend:8000/
exit
```

6. Use the network testing script:
```bash
./scripts/test-network.sh
```
This script will automatically detect your LAN IP and test both local and network connectivity.
