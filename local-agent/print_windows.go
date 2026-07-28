//go:build windows
package main

import (
	"fmt"
	"syscall"
	"unsafe"
)

var (
	winspool              = syscall.NewLazyDLL("winspool.drv")
	procOpenPrinter       = winspool.NewProc("OpenPrinterW")
	procClosePrinter      = winspool.NewProc("ClosePrinter")
	procStartDocPrinter   = winspool.NewProc("StartDocPrinterW")
	procEndDocPrinter     = winspool.NewProc("EndDocPrinter")
	procStartPagePrinter  = winspool.NewProc("StartPagePrinter")
	procEndPagePrinter    = winspool.NewProc("EndPagePrinter")
	procWritePrinter      = winspool.NewProc("WritePrinter")
	procEnumPrinters      = winspool.NewProc("EnumPrintersW")
)

type DOC_INFO_1 struct {
	DocName    *uint16
	OutputFile *uint16
	Datatype   *uint16
}

// PRINTER_INFO_2W struct (simplified — we only read pPrinterName)
// Full struct is large but we parse the name pointer at offset 0.
type PRINTER_INFO_2 struct {
	ServerName         *uint16
	PrinterName        *uint16
	ShareName          *uint16
	PortName           *uint16
	DriverName         *uint16
	Comment            *uint16
	Location           *uint16
	DevMode            uintptr
	SepFile            *uint16
	PrintProcessor     *uint16
	Datatype           *uint16
	Parameters         *uint16
	SecurityDescriptor uintptr
	Attributes         uint32
	Priority           uint32
	DefaultPriority    uint32
	StartTime          uint32
	UntilTime          uint32
	Status             uint32
	Jobs               uint32
	AveragePPM         uint32
}

const (
	PRINTER_ENUM_LOCAL      = 0x00000002
	PRINTER_ENUM_CONNECTIONS = 0x00000004
)

func getWindowsPrinters() []string {
	var needed, returned uint32

	// First call: get required buffer size
	procEnumPrinters.Call(
		uintptr(PRINTER_ENUM_LOCAL|PRINTER_ENUM_CONNECTIONS),
		0, // Name (nil = local machine)
		2, // Level 2 = PRINTER_INFO_2
		0, // nil buffer
		0, // buffer size 0
		uintptr(unsafe.Pointer(&needed)),
		uintptr(unsafe.Pointer(&returned)),
	)

	if needed == 0 {
		return []string{}
	}

	buf := make([]byte, needed)

	r1, _, _ := procEnumPrinters.Call(
		uintptr(PRINTER_ENUM_LOCAL|PRINTER_ENUM_CONNECTIONS),
		0,
		2,
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(needed),
		uintptr(unsafe.Pointer(&needed)),
		uintptr(unsafe.Pointer(&returned)),
	)

	if r1 == 0 {
		return []string{}
	}

	var printers []string
	infoSize := unsafe.Sizeof(PRINTER_INFO_2{})
	for i := uint32(0); i < returned; i++ {
		info := (*PRINTER_INFO_2)(unsafe.Pointer(&buf[uintptr(i)*infoSize]))
		if info.PrinterName != nil {
			name := syscall.UTF16ToString((*[256]uint16)(unsafe.Pointer(info.PrinterName))[:])
			if name != "" {
				printers = append(printers, name)
			}
		}
	}

	return printers
}

func printRawWindows(printerName string, data []byte) error {
	pName, err := syscall.UTF16PtrFromString(printerName)
	if err != nil {
		return err
	}

	var hPrinter syscall.Handle
	r1, _, err := procOpenPrinter.Call(
		uintptr(unsafe.Pointer(pName)),
		uintptr(unsafe.Pointer(&hPrinter)),
		0,
	)
	if hPrinter == 0 || r1 == 0 {
		return fmt.Errorf("failed to open printer '%s': %v", printerName, err)
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	docName, _ := syscall.UTF16PtrFromString("POS Receipt")
	dataType, _ := syscall.UTF16PtrFromString("RAW")

	docInfo := DOC_INFO_1{
		DocName:    docName,
		OutputFile: nil,
		Datatype:   dataType,
	}

	r1, _, err = procStartDocPrinter.Call(
		uintptr(hPrinter),
		1,
		uintptr(unsafe.Pointer(&docInfo)),
	)
	if r1 == 0 {
		return fmt.Errorf("failed to start doc printer: %v", err)
	}
	defer procEndDocPrinter.Call(uintptr(hPrinter))

	r1, _, err = procStartPagePrinter.Call(uintptr(hPrinter))
	if r1 == 0 {
		return fmt.Errorf("failed to start page printer: %v", err)
	}
	defer procEndPagePrinter.Call(uintptr(hPrinter))

	var bytesWritten uint32
	r1, _, err = procWritePrinter.Call(
		uintptr(hPrinter),
		uintptr(unsafe.Pointer(&data[0])),
		uintptr(len(data)),
		uintptr(unsafe.Pointer(&bytesWritten)),
	)
	if r1 == 0 {
		return fmt.Errorf("failed to write printer data: %v", err)
	}

	return nil
}
