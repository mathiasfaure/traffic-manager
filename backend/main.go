package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

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
		Group:    "traffic-manager.io", // updated to match the CRD
		Version:  "v1alpha1",
		Resource: "apigateways",
	}
)

func main() {
	http.HandleFunc("/apigateway/", func(w http.ResponseWriter, r *http.Request) {
		// CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, PATCH, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		log.Printf("%s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		switch r.Method {
		case http.MethodGet:
			handleGetAPIGateway(w, r)
		case http.MethodPut:
			handlePutAPIGateway(w, r)
		case http.MethodPatch:
			handlePatchAPIGateway(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleGetAPIGateway(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("GET %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /apigateway/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]

	client, err := getDynamicClient()
	if err != nil {
		log.Printf("GET %s: failed to create k8s client: %v", r.URL.Path, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	obj, err := client.Resource(gvr).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		log.Printf("GET %s: failed to get: %v", r.URL.Path, err)
		http.Error(w, "Failed to get API Gateway: "+err.Error(), http.StatusNotFound)
		return
	}

	log.Printf("GET %s: get successful", r.URL.Path)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj.Object)
}

func handlePutAPIGateway(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("PUT %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /apigateway/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]

	user := r.Header.Get("X-User")
	if user == "" {
		user = "unknown"
	}

	client, err := getDynamicClient()
	if err != nil {
		log.Printf("PUT %s: failed to create k8s client: %v", r.URL.Path, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("PUT %s by %s: invalid JSON body: %v", r.URL.Path, user, err)
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
		log.Printf("PUT %s by %s: failed to get current resource: %v", r.URL.Path, user, err)
		http.Error(w, "Failed to get current API Gateway: "+err.Error(), http.StatusNotFound)
		return
	}
	currentRV, _, _ := unstructured.NestedString(current.Object, "metadata", "resourceVersion")
	metadata["resourceVersion"] = currentRV
	body["metadata"] = metadata

	log.Printf("PUT %s by %s: updating CRD with body: %v", r.URL.Path, user, body)

	updated, err := client.Resource(gvr).Namespace(namespace).Update(
		context.Background(),
		&unstructured.Unstructured{Object: body},
		metav1.UpdateOptions{},
	)
	if err != nil {
		log.Printf("PUT %s by %s: failed to update: %v", r.URL.Path, user, err)
		http.Error(w, "Failed to update API Gateway: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("PUT %s by %s: update successful", r.URL.Path, user)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated.Object)
}

func handlePatchAPIGateway(w http.ResponseWriter, r *http.Request) {
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		log.Printf("PATCH %s: bad path", r.URL.Path)
		http.Error(w, "Usage: /apigateway/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]

	user := r.Header.Get("X-User")
	if user == "" {
		user = "unknown"
	}

	client, err := getDynamicClient()
	if err != nil {
		log.Printf("PATCH %s by %s: failed to create k8s client: %v", r.URL.Path, user, err)
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	patchBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("PATCH %s by %s: failed to read patch body: %v", r.URL.Path, user, err)
		http.Error(w, "Failed to read patch body: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("PATCH %s by %s: patch body: %s", r.URL.Path, user, string(patchBytes))

	patched, err := client.Resource(gvr).Namespace(namespace).Patch(
		context.Background(),
		name,
		types.MergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)
	if err != nil {
		log.Printf("PATCH %s by %s: failed to patch: %v", r.URL.Path, user, err)
		http.Error(w, "Failed to patch API Gateway: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("PATCH %s by %s: patch successful", r.URL.Path, user)
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
