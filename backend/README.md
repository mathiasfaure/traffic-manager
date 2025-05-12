# Go Backend for API Gateway CRD

This backend exposes a REST API to fetch a specific Kubernetes API Gateway CRD by namespace and name.

## Features
- Exposes `GET /apigateway/{namespace}/{name}`
- Returns the raw API Gateway CRD as JSON
- Uses Kubernetes dynamic client (no codegen required)

## Prerequisites
- Go 1.20+
- Access to a Kubernetes cluster with the API Gateway CRD installed
- KUBECONFIG set (for local dev) or run in-cluster with proper RBAC

## Usage

### 1. Install dependencies
```
go mod tidy
```

### 2. Run the backend
```
go run main.go
```

### 3. Query an API Gateway CRD
```
curl http://localhost:8080/apigateway/<namespace>/<name>
```

## Configuration
- By default, uses in-cluster config. Falls back to `$KUBECONFIG` or `$HOME/.kube/config` if not running in cluster.
- Adjust the `GroupVersionResource` in `main.go` if your CRD group/version/resource differs.

## Example
```
curl http://localhost:8080/apigateway/default/my-apigateway
```

---

**References:**
- [Kubernetes dynamic client-go](https://pkg.go.dev/k8s.io/client-go/dynamic)
- [Kubernetes API Gateway CRD](https://gateway-api.sigs.k8s.io/) 