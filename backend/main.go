package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
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
	http.HandleFunc("/apigateway/", handleGetAPIGateway)
	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleGetAPIGateway(w http.ResponseWriter, r *http.Request) {
	// URL: /apigateway/{namespace}/{name}
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 {
		http.Error(w, "Usage: /apigateway/{namespace}/{name}", http.StatusBadRequest)
		return
	}
	namespace, name := parts[1], parts[2]

	client, err := getDynamicClient()
	if err != nil {
		http.Error(w, "Failed to create k8s client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	obj, err := client.Resource(gvr).Namespace(namespace).Get(context.Background(), name, metav1.GetOptions{})
	if err != nil {
		http.Error(w, "Failed to get API Gateway: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(obj.Object)
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
