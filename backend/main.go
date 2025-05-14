package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	gvr = schema.GroupVersionResource{
		Group:    "gateway.networking.k8s.io",
		Version:  "v1",
		Resource: "httproutes",
	}
)

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, PATCH, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	http.Handle("/httproute/", withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		switch r.Method {
		case http.MethodGet:
			handleGetHTTPRoute(w, r)
		case http.MethodPut:
			handlePutHTTPRoute(w, r)
		case http.MethodPatch:
			handlePatchHTTPRoute(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	// Add more handlers here, e.g. for /apigateway/, and they will get CORS automatically
	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// parseJWTSubject extracts the 'sub' claim from a JWT token string.
func parseJWTSubject(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return ""
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}
	if sub, ok := claims["sub"].(string); ok {
		return sub
	}
	return ""
}

// getJWTSubjectFromRequest extracts the JWT subject from the Authorization header, if present.
func getJWTSubjectFromRequest(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && strings.HasPrefix(authHeader, "Bearer ") {
		token := authHeader[7:]
		return parseJWTSubject(token)
	}
	return ""
}

func handleGetHTTPRoute(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("GET %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /httproute/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]
	sub := getJWTSubjectFromRequest(r)
	client, err := getDynamicClientFromRequest(r)
	if err != nil {
		log.Printf("GET %s (sub=%s): failed to create k8s client: %v", r.URL.Path, sub, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	obj, err := client.Resource(gvr).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			log.Printf("GET %s (sub=%s): forbidden by k8s RBAC", r.URL.Path, sub)
			http.Error(w, "Forbidden: not authorized", http.StatusForbidden)
			return
		}
		log.Printf("GET %s (sub=%s): failed to get: %v", r.URL.Path, sub, err)
		http.Error(w, "Failed to get HTTP Route: "+err.Error(), http.StatusNotFound)
		return
	}
	log.Printf("GET %s (sub=%s): get successful", r.URL.Path, sub)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj.Object)
}

func handlePutHTTPRoute(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("PUT %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /httproute/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]
	user := r.Header.Get("X-User")
	if user == "" {
		user = "unknown"
	}
	sub := getJWTSubjectFromRequest(r)
	client, err := getDynamicClientFromRequest(r)
	if err != nil {
		log.Printf("PUT %s by %s (sub=%s): failed to create k8s client: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("PUT %s by %s (sub=%s): invalid JSON body: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Invalid JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}
	metadata, ok := body["metadata"].(map[string]interface{})
	if !ok {
		metadata = map[string]interface{}{}
	}
	metadata["name"] = name
	metadata["namespace"] = namespace
	// Fetch current resourceVersion
	current, err := client.Resource(gvr).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			log.Printf("PUT %s by %s (sub=%s): forbidden by k8s RBAC", r.URL.Path, user, sub)
			http.Error(w, "Forbidden: not authorized", http.StatusForbidden)
			return
		}
		log.Printf("PUT %s by %s (sub=%s): failed to get current resource: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to get current HTTP Route: "+err.Error(), http.StatusNotFound)
		return
	}
	currentRV, _, _ := unstructured.NestedString(current.Object, "metadata", "resourceVersion")
	metadata["resourceVersion"] = currentRV
	body["metadata"] = metadata
	log.Printf("PUT %s by %s (sub=%s): updating CRD with body: %v", r.URL.Path, user, sub, body)
	updated, err := client.Resource(gvr).Namespace(namespace).Update(
		context.Background(),
		&unstructured.Unstructured{Object: body},
		metav1.UpdateOptions{},
	)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			log.Printf("PUT %s by %s (sub=%s): forbidden by k8s RBAC", r.URL.Path, user, sub)
			http.Error(w, "Forbidden: not authorized", http.StatusForbidden)
			return
		}
		log.Printf("PUT %s by %s (sub=%s): failed to update: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to update HTTP Route: "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("PUT %s by %s (sub=%s): update successful", r.URL.Path, user, sub)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated.Object)
}

func handlePatchHTTPRoute(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("PATCH %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /httproute/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]
	user := r.Header.Get("X-User")
	if user == "" {
		user = "unknown"
	}
	sub := getJWTSubjectFromRequest(r)
	client, err := getDynamicClientFromRequest(r)
	if err != nil {
		log.Printf("PATCH %s by %s (sub=%s): failed to create k8s client: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	patchBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("PATCH %s by %s (sub=%s): failed to read patch body: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to read patch body: "+err.Error(), http.StatusBadRequest)
		return
	}
	log.Printf("PATCH %s by %s (sub=%s): patch body: %s", r.URL.Path, user, sub, string(patchBytes))
	patched, err := client.Resource(gvr).Namespace(namespace).Patch(
		context.Background(),
		name,
		types.MergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			log.Printf("PATCH %s by %s (sub=%s): forbidden by k8s RBAC", r.URL.Path, user, sub)
			http.Error(w, "Forbidden: not authorized", http.StatusForbidden)
			return
		}
		log.Printf("PATCH %s by %s (sub=%s): failed to patch: %v", r.URL.Path, user, sub, err)
		http.Error(w, "Failed to patch HTTP Route: "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("PATCH %s by %s (sub=%s): patch successful", r.URL.Path, user, sub)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patched.Object)
}

func splitPath(path string) []string {
	// splits and removes empty elements
	var out []string
	for _, p := range split(path, '/') {
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func split(s string, sep rune) []string {
	var res []string
	curr := ""
	for _, c := range s {
		if c == sep {
			res = append(res, curr)
			curr = ""
		} else {
			curr += string(c)
		}
	}
	res = append(res, curr)
	return res
}

func getDynamicClient() (dynamic.Interface, error) {
	// Use in-cluster config if available, else fallback to kubeconfig
	config, err := rest.InClusterConfig()
	if err != nil {
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = os.ExpandEnv("$HOME/.kube/config")
		}
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, err
		}
	}
	return dynamic.NewForConfig(config)
}

// getKubeAPIServer returns the Kubernetes API server address based on environment/configuration.
// Priority:
// 1. KUBERNETES_API_SERVER env variable (explicit override)
// 2. In-cluster env vars (KUBERNETES_SERVICE_HOST/PORT)
// 3. Fallback to https://127.0.0.1:6443
func getKubeAPIServer() string {
	if apiServer := os.Getenv("KUBERNETES_API_SERVER"); apiServer != "" {
		return apiServer
	}
	kubeHost := os.Getenv("KUBERNETES_SERVICE_HOST")
	kubePort := os.Getenv("KUBERNETES_SERVICE_PORT")
	if kubeHost != "" && kubePort != "" {
		return "https://" + kubeHost + ":" + kubePort
	}
	return "https://127.0.0.1:6443"
}

func getDynamicClientWithToken(token string) (dynamic.Interface, error) {
	apiServer := getKubeAPIServer()
	config := &rest.Config{
		Host:        apiServer,
		BearerToken: token,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true, // For demo/dev only. In production, load CA certs.
		},
	}
	return dynamic.NewForConfig(config)
}

func getDynamicClientFromRequest(r *http.Request) (dynamic.Interface, error) {
	token := ""
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}
	if token != "" {
		return getDynamicClientWithToken(token)
	}
	// fallback to legacy kubeconfig loading
	return getDynamicClient()
}
