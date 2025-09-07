# Backend Setup & Testing

## 1. Create a Kubernetes Cluster with Kind

Install Kind if you don't have it:
```sh
brew install kind
```

Create a cluster named `ck8s`:
```sh
kind create cluster --name ck8s
```

## 2. Apply the API Gateway CRD

Make sure `kubectl` is installed and configured for your Kind cluster:
```sh
kubectl cluster-info --context kind-ck8s
```

Apply the CRD:
```sh
cd backend
./apply-apigateway-crd.sh
```

## 3. Run the Backend Service

Export your kubeconfig for Kind:
```sh
export KUBECONFIG="$(kind get kubeconfig-path --name=ck8s 2>/dev/null || kind get kubeconfig --name=ck8s)"
```

Run the backend service:
```sh
go run main.go
```

The service will listen on `localhost:8080`.

## 4. Test the API with Newman

Install newman if you don't have it:
```sh
npm install -g newman
```

Run the Postman collection:
```sh
newman run apigateway-crd.postman_collection.json
```

## 5. Grant RBAC Permissions to the Service Account

To allow the backend to access HTTPRoute resources using the service account token, you must grant the appropriate Kubernetes RBAC permissions.

### Create a ClusterRole for HTTPRoute Access
```sh
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: traffic-manager-httproute-admin
rules:
- apiGroups: ["gateway.networking.k8s.io"]
  resources: ["httproutes"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
EOF
```

### Bind the Role to Your Service Account
```sh
kubectl create clusterrolebinding traffic-manager-httproute-admin-binding \
  --clusterrole=traffic-manager-httproute-admin \
  --serviceaccount=default:traffic-manager-user
```

### Verify Permissions
```sh
kubectl auth can-i get httproutes --as=system:serviceaccount:default:traffic-manager-user
```
You should see:
```
yes
```

---

**Notes:**
- The CRD example is in `apigateway-crd.yaml`. Adjust as needed for your use case.
- The backend service must have access to your kubeconfig to interact with the cluster.
- If you want to run the backend inside the cluster, you will need a Dockerfile and Kubernetes manifests for deployment.
