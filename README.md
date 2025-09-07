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

## Service Account & JWT Token Setup

To interact with the Traffic Manager API/UI, you may need a Kubernetes Service Account token (JWT) with appropriate permissions. Below are the recommended steps for Kubernetes v1.24+ (Kind, Minikube, etc.):

### 1. Create a Service Account

```sh
kubectl create serviceaccount traffic-manager-user -n default
```

### 2. (Optional) Grant Cluster Admin Permissions (for demo/testing only)
**Warning:** This grants full admin rights. For production, use least-privilege RBAC.
```sh
kubectl create clusterrolebinding traffic-manager-user-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=default:traffic-manager-user
```

### 3. Get a JWT Token for the Service Account

#### (A) Recommended: Short-lived Token (Kubernetes v1.24+)
```sh
kubectl create token traffic-manager-user -n default
```
- This prints a JWT token. Copy it and use it in the UI or API as the Bearer token.
- You can specify a duration (e.g., 24h):
  ```sh
  kubectl create token traffic-manager-user -n default --duration=24h
  ```

#### (B) Long-lived Token (Manual Secret, not recommended for production)
```sh
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: traffic-manager-user-token
  annotations:
    kubernetes.io/service-account.name: traffic-manager-user
type: kubernetes.io/service-account-token
EOF
kubectl get secret traffic-manager-user-token -o jsonpath='{.data.token}' | base64 --decode
```
- This creates a Secret and prints the JWT token. Use as Bearer token.

### 4. Use the Token
- In the UI: Paste the token on the login screen.
- For API calls: Use the token as a Bearer token in the `Authorization` header.

---

For more details, see:
- [Kubernetes Service Account Docs](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
- [Kubernetes: Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

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