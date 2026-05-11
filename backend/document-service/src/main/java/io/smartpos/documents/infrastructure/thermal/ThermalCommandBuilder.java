package io.smartpos.documents.infrastructure.thermal;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * ESC/POS command builder for thermal receipt printers.
 * Builds byte arrays using standard ESC/POS sequences.
 * No external dependencies beyond java.io.
 */
public class ThermalCommandBuilder {

    private static final byte ESC = 0x1B;
    private static final byte GS = 0x1D;
    private static final byte LF = 0x0A;
    private static final byte CR = 0x0D;

    private final ByteArrayOutputStream buffer;

    public ThermalCommandBuilder() {
        this.buffer = new ByteArrayOutputStream();
    }

    /** Initialize printer: ESC @ */
    public ThermalCommandBuilder initialize() {
        writeBytes(ESC, 0x40);
        return this;
    }

    /**
     * Set text alignment: ESC a n
     * @param align 0=left, 1=center, 2=right
     */
    public ThermalCommandBuilder align(int align) {
        writeBytes(ESC, 0x61, (byte) align);
        return this;
    }

    /** Append plain text followed by CR LF */
    public ThermalCommandBuilder text(String text) {
        writeString(text);
        writeBytes(CR, LF);
        return this;
    }

    /** Append bold text: ESC ! 0x08 + text + ESC ! 0x00 (reset) + LF */
    public ThermalCommandBuilder boldText(String text) {
        writeBytes(ESC, 0x21, 0x08);
        writeString(text);
        writeBytes(ESC, 0x21, 0x00);
        writeBytes(LF);
        return this;
    }

    /** Append double-size text: ESC ! 0x30 + text + ESC ! 0x00 (reset) + LF */
    public ThermalCommandBuilder doubleSizeText(String text) {
        writeBytes(ESC, 0x21, 0x30);
        writeString(text);
        writeBytes(ESC, 0x21, 0x00);
        writeBytes(LF);
        return this;
    }

    /** Feed n lines: ESC d n */
    public ThermalCommandBuilder feedLines(int n) {
        writeBytes(ESC, 0x64, (byte) n);
        return this;
    }

    /** Partial cut: ESC i */
    public ThermalCommandBuilder partialCut() {
        writeBytes(ESC, 0x69);
        return this;
    }

    /** Full cut: ESC m */
    public ThermalCommandBuilder fullCut() {
        writeBytes(ESC, 0x6D);
        return this;
    }

    /** Cash drawer pulse: ESC p 0 25 250 */
    public ThermalCommandBuilder drawerPulse() {
        writeBytes(ESC, 0x70, (byte) 0, (byte) 25, (byte) 250);
        return this;
    }

    /**
     * CODE128 barcode: GS k 73 n data
     * @param data   barcode data string
     * @param height barcode height in dots (1-255)
     */
    public ThermalCommandBuilder barcode128(String data, int height) {
        byte[] dataBytes = data.getBytes(StandardCharsets.ISO_8859_1);
        writeBytes(GS, 0x68, (byte) height);      // GS h n — set barcode height
        writeBytes(GS, 0x77, (byte) 3);            // GS w n — barcode width (3 = medium)
        writeBytes(GS, 0x6B, (byte) 73, (byte) dataBytes.length);
        writeBytes(dataBytes);
        return this;
    }

    /**
     * QR Code: full GS ( k sequence
     * @param data QR code data string
     * @param size module size (1-16)
     */
    public ThermalCommandBuilder qrCode(String data, int size) {
        byte[] dataBytes = data.getBytes(StandardCharsets.ISO_8859_1);
        int pL = (dataBytes.length + 3) % 256;
        int pH = (dataBytes.length + 3) / 256;

        // Select QR model 2
        writeBytes(GS, 0x28, 0x6B, (byte) 4, (byte) 0, (byte) 49, (byte) 65, (byte) 50, (byte) 0);
        // Set module size
        writeBytes(GS, 0x28, 0x6B, (byte) 3, (byte) 0, (byte) 49, (byte) 67, (byte) size);
        // Set error correction level L (48)
        writeBytes(GS, 0x28, 0x6B, (byte) 3, (byte) 0, (byte) 49, (byte) 69, (byte) 48);
        // Store QR data
        writeBytes(GS, 0x28, 0x6B, (byte) pL, (byte) pH, (byte) 49, (byte) 80, (byte) 48);
        writeBytes(dataBytes);
        // Print QR code
        writeBytes(GS, 0x28, 0x6B, (byte) 3, (byte) 0, (byte) 49, (byte) 81, (byte) 48);
        return this;
    }

    /** Append a dashed line across the width (approx 42 dashes for 80mm) */
    public ThermalCommandBuilder line() {
        writeString("------------------------------------------");
        writeBytes(CR, LF);
        return this;
    }

    /** Center-justify text: align center + text + align left */
    public ThermalCommandBuilder centerText(String text) {
        align(1);
        text(text);
        align(0);
        return this;
    }

    /** Single empty line (LF) */
    public ThermalCommandBuilder emptyLine() {
        writeBytes(LF);
        return this;
    }

    /** Build and return the full byte array */
    public byte[] build() {
        return buffer.toByteArray();
    }

    // --- private helpers ---

    private void writeBytes(byte... bytes) {
        try {
            buffer.write(bytes);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write to command buffer", e);
        }
    }

    private void writeBytes(int... ints) {
        for (int i : ints) {
            buffer.write((byte) i);
        }
    }

    private void writeString(String s) {
        try {
            buffer.write(s.getBytes(StandardCharsets.ISO_8859_1));
        } catch (IOException e) {
            throw new RuntimeException("Failed to write string to command buffer", e);
        }
    }
}
