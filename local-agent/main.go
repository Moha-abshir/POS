package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
)

type PrintRequest struct {
	Printer   string `json:"printer"`
	RawBase64 string `json:"raw_base64"`
}

type DrawerRequest struct {
	Printer string `json:"printer"`
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":   "online",
		"platform": runtime.GOOS,
		"version":  "1.0.0",
	})
}

func printersHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	var printers []string
	if runtime.GOOS == "windows" {
		printers = getWindowsPrinters()
	} else {
		printers = []string{"Mock Receipt Printer (USB)", "Mock Office Laser"}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"printers": printers,
	})
}

func printHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PrintRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	data, err := base64.StdEncoding.DecodeString(req.RawBase64)
	if err != nil {
		http.Error(w, "Invalid base64 payload", http.StatusBadRequest)
		return
	}

	log.Printf("Received print request for printer: %s (%d bytes)", req.Printer, len(data))

	if runtime.GOOS == "windows" {
		err = printRawWindows(req.Printer, data)
		if err != nil {
			log.Printf("Windows print error: %v", err)
			http.Error(w, fmt.Sprintf("Printing failed: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		log.Printf("[MOCK PRINT to %s]: %d bytes", req.Printer, len(data))
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Printed successfully"})
}

func drawerHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DrawerRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Standard ESC/POS Cash Drawer Kick command: ESC p 0 25 250
	kickBytes := []byte{0x1b, 0x70, 0x00, 0x19, 0xfa}

	log.Printf("Received cash drawer kick request for printer: %s", req.Printer)

	if runtime.GOOS == "windows" {
		err = printRawWindows(req.Printer, kickBytes)
		if err != nil {
			log.Printf("Windows drawer kick error: %v", err)
			http.Error(w, fmt.Sprintf("Drawer kick failed: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		log.Printf("[MOCK DRAWER KICK on %s]", req.Printer)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Drawer opened successfully"})
}

func main() {
	http.HandleFunc("/status", statusHandler)
	http.HandleFunc("/printers", printersHandler)
	http.HandleFunc("/print", printHandler)
	http.HandleFunc("/cashdrawer/open", drawerHandler)

	port := ":4000"
	log.Printf("Smart Store POS Print Agent starting on http://localhost%s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
