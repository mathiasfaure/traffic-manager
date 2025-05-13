# Traffic Manager

## Project Objectives

Traffic Manager is a platform for managing HTTP routes in a Kubernetes cluster using the Gateway API. It consists of:
- **Backend**: A Go service exposing RESTful endpoints to manage HTTPRoute resources in Kubernetes.
- **Frontend**: A React-based UI for interacting with HTTP routes.

This project enables users to create, update, and view HTTP routes via a user-friendly interface and a robust API, leveraging Kubernetes-native CRDs.

---

## Prerequisites

- [Go](https://golang.org/) (v1.21+)
- [Node.js & npm](https://nodejs.org/) (for frontend)
- [Kind](https://kind.sigs.k8s.io/) (Kubernetes in Docker)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Newman](https://www.npmjs.com/package/newman) (for backend API tests)

---

## Quick Start

### 1. Set Up Kubernetes Cluster & Apply Gateway API CRD

```sh
# Install Kind if needed
brew install kind

# Create a Kind cluster
kind create cluster --name ck8s

# Ensure kubectl is configured for Kind
kubectl cluster-info --context kind-ck8s

# Apply the Gateway API CRD and project CRD
cd backend
./apply-apigateway-crd.sh
cd ..
```

### 2. Start the Backend Service

```sh
cd backend
export KUBECONFIG="$(kind get kubeconfig-path --name=ck8s 2>/dev/null || kind get kubeconfig --name=ck8s)"
go run main.go
```
- The backend listens on `http://localhost:8080`.

### 3. Start the Frontend (UI)

```sh
cd deployment-ui
npm install
npm start
```
- The UI will be available at [http://localhost:3000](http://localhost:3000).

### 4. Run Backend API Tests

```sh
cd backend
# Install newman if needed
npm install -g newman
# Run the Postman collection
newman run apigateway-crd.postman_collection.json
```

---

## HTTP API Route

- **Base URL:** `http://localhost:8080/httproute/{namespace}/{name}`
- **Methods:** `GET`, `PUT`, `PATCH`
- See `backend/openapi.yaml` for full API schema.

---

## Advanced Usage & Details

- See [`backend/README.md`](backend/README.md) for backend details, CRD customization, and advanced deployment.
- See [`deployment-ui/README.md`](deployment-ui/README.md) for frontend scripts and customization.

---

## License

MIT 