//go:build !windows
package main

import (
	"errors"
	"log"
)

func getWindowsPrinters() []string {
	return []string{}
}

func printRawWindows(printerName string, data []byte) error {
	log.Printf("[MOCK PRINTING to %s]: %s", printerName, string(data))
	return errors.New("raw spooler printing is only supported on Windows")
}
