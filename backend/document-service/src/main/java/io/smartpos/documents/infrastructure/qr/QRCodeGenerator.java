package io.smartpos.documents.infrastructure.qr;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.util.EnumMap;
import java.util.Map;

@Component
public class QRCodeGenerator {

    public String generateSvg(String data, int size) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
        hints.put(EncodeHintType.MARGIN, 1);
        var matrix = writer.encode(data, BarcodeFormat.QR_CODE, size, size, hints);
        return toSvg(matrix, size);
    }

    private String toSvg(com.google.zxing.common.BitMatrix matrix, int size) throws Exception {
        var doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
        var svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", String.valueOf(size));
        svg.setAttribute("height", String.valueOf(size));
        svg.setAttribute("viewBox", "0 0 " + size + " " + size);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        var rect = doc.createElement("rect");
        rect.setAttribute("width", "100%"); rect.setAttribute("height", "100%");
        rect.setAttribute("fill", "white"); svg.appendChild(rect);
        var group = doc.createElement("g");
        group.setAttribute("fill", "black");
        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
                if (matrix.get(x, y)) {
                    var r = doc.createElement("rect");
                    r.setAttribute("x", String.valueOf(x));
                    r.setAttribute("y", String.valueOf(y));
                    r.setAttribute("width", "1"); r.setAttribute("height", "1");
                    group.appendChild(r);
                }
        svg.appendChild(group); doc.appendChild(svg);
        var transformer = TransformerFactory.newInstance().newTransformer();
        var writer = new StringWriter();
        transformer.transform(new DOMSource(doc), new StreamResult(writer));
        return writer.toString();
    }
}
