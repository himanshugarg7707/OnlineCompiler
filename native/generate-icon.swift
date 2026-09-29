import AppKit

func renderIcon(size: CGFloat) -> NSImage {
    let img = NSImage(size: NSSize(width: size, height: size))
    img.lockFocus()

    guard let ctx = NSGraphicsContext.current?.cgContext else {
        img.unlockFocus()
        return img
    }

    ctx.setAllowsAntialiasing(true)
    ctx.setShouldAntialias(true)

    let scale = size / 1024.0

    // Apple standard squircle dimensions: 824x824 on 1024x1024
    let inset: CGFloat = 100.0 * scale
    let rectSize = size - (2 * inset)
    let squircleRect = CGRect(x: inset, y: inset, width: rectSize, height: rectSize)
    let cornerRadius: CGFloat = 185.0 * scale

    // 1. Drop shadow for squircle
    ctx.saveGState()
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.45)
    shadow.shadowOffset = NSSize(width: 0, height: -14 * scale)
    shadow.shadowBlurRadius = 24 * scale
    shadow.set()

    let squirclePath = NSBezierPath(roundedRect: squircleRect, xRadius: cornerRadius, yRadius: cornerRadius)
    NSColor.black.setFill()
    squirclePath.fill()
    ctx.restoreGState()

    // 2. Base Squircle with rich gradient
    ctx.saveGState()
    squirclePath.addClip()

    // Deep dark futuristic gradient: Royal Slate Navy -> Deep Obsidian
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bgColors = [
        NSColor(red: 0.12, green: 0.11, blue: 0.22, alpha: 1.0).cgColor,
        NSColor(red: 0.07, green: 0.06, blue: 0.14, alpha: 1.0).cgColor,
        NSColor(red: 0.04, green: 0.03, blue: 0.08, alpha: 1.0).cgColor
    ] as CFArray
    let bgLocations: [CGFloat] = [0.0, 0.5, 1.0]
    if let bgGradient = CGGradient(colorsSpace: colorSpace, colors: bgColors, locations: bgLocations) {
        ctx.drawLinearGradient(bgGradient,
                               start: CGPoint(x: squircleRect.midX, y: squircleRect.maxY),
                               end: CGPoint(x: squircleRect.midX, y: squircleRect.minY),
                               options: [])
    }

    // Subtle ambient glowing radial light in center
    let glowColors = [
        NSColor(red: 0.54, green: 0.23, blue: 1.0, alpha: 0.35).cgColor,
        NSColor(red: 0.0, green: 0.85, blue: 1.0, alpha: 0.15).cgColor,
        NSColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 0.0).cgColor
    ] as CFArray
    let glowLocations: [CGFloat] = [0.0, 0.45, 1.0]
    if let glowGradient = CGGradient(colorsSpace: colorSpace, colors: glowColors, locations: glowLocations) {
        ctx.drawRadialGradient(glowGradient,
                               startCenter: CGPoint(x: squircleRect.midX, y: squircleRect.midY + 20 * scale),
                               startRadius: 0,
                               endCenter: CGPoint(x: squircleRect.midX, y: squircleRect.midY),
                               endRadius: squircleRect.width * 0.55,
                               options: [])
    }

    // Top subtle bevel highlight
    let bevelPath = NSBezierPath()
    bevelPath.move(to: NSPoint(x: squircleRect.minX + cornerRadius, y: squircleRect.maxY))
    bevelPath.line(to: NSPoint(x: squircleRect.maxX - cornerRadius, y: squircleRect.maxY))
    NSColor(white: 1.0, alpha: 0.22).setStroke()
    bevelPath.lineWidth = 2.0 * scale
    bevelPath.stroke()

    // 3. Central Logo: Glowing High-Tech Code Compiler Symbol < / >
    ctx.saveGState()

    let centerX = squircleRect.midX
    let centerY = squircleRect.midY
    let strokeWidth: CGFloat = 44.0 * scale

    // Glowing drop shadow for the code symbols
    let glyphShadow = NSShadow()
    glyphShadow.shadowColor = NSColor(red: 0.0, green: 0.9, blue: 1.0, alpha: 0.55)
    glyphShadow.shadowOffset = NSSize(width: 0, height: -2 * scale)
    glyphShadow.shadowBlurRadius = 16 * scale
    glyphShadow.set()

    // Left Chevron `<`
    let leftChevron = NSBezierPath()
    let leftX = centerX - 180 * scale
    leftChevron.move(to: NSPoint(x: leftX + 50 * scale, y: centerY + 130 * scale))
    leftChevron.line(to: NSPoint(x: leftX - 70 * scale, y: centerY))
    leftChevron.line(to: NSPoint(x: leftX + 50 * scale, y: centerY - 130 * scale))
    leftChevron.lineCapStyle = .round
    leftChevron.lineJoinStyle = .round
    leftChevron.lineWidth = strokeWidth

    NSColor(red: 0.0, green: 0.88, blue: 1.0, alpha: 1.0).setStroke()
    leftChevron.stroke()

    // Forward Slash `/` (Dynamic compiler lightning bar)
    let slashPath = NSBezierPath()
    slashPath.move(to: NSPoint(x: centerX - 45 * scale, y: centerY - 150 * scale))
    slashPath.line(to: NSPoint(x: centerX + 45 * scale, y: centerY + 150 * scale))
    slashPath.lineCapStyle = .round
    slashPath.lineWidth = strokeWidth + 4 * scale

    let slashShadow = NSShadow()
    slashShadow.shadowColor = NSColor(red: 0.65, green: 0.3, blue: 1.0, alpha: 0.7)
    slashShadow.shadowOffset = NSSize(width: 0, height: 0)
    slashShadow.shadowBlurRadius = 20 * scale
    slashShadow.set()

    NSColor(red: 0.72, green: 0.35, blue: 1.0, alpha: 1.0).setStroke()
    slashPath.stroke()

    // Right Chevron `>`
    let rightChevron = NSBezierPath()
    let rightX = centerX + 180 * scale
    rightChevron.move(to: NSPoint(x: rightX - 50 * scale, y: centerY + 130 * scale))
    rightChevron.line(to: NSPoint(x: rightX + 70 * scale, y: centerY))
    rightChevron.line(to: NSPoint(x: rightX - 50 * scale, y: centerY - 130 * scale))
    rightChevron.lineCapStyle = .round
    rightChevron.lineJoinStyle = .round
    rightChevron.lineWidth = strokeWidth

    let rightShadow = NSShadow()
    rightShadow.shadowColor = NSColor(red: 0.05, green: 0.85, blue: 0.65, alpha: 0.6)
    rightShadow.shadowOffset = NSSize(width: 0, height: -2 * scale)
    rightShadow.shadowBlurRadius = 16 * scale
    rightShadow.set()

    NSColor(red: 0.08, green: 0.82, blue: 0.62, alpha: 1.0).setStroke()
    rightChevron.stroke()

    // Small active compiler energy dot at bottom right
    let dotRadius: CGFloat = 16 * scale
    let dotRect = NSRect(x: centerX + 175 * scale, y: centerY - 170 * scale, width: dotRadius * 2, height: dotRadius * 2)
    let dotPath = NSBezierPath(ovalIn: dotRect)
    NSColor(red: 0.0, green: 0.95, blue: 0.7, alpha: 1.0).setFill()
    dotPath.fill()

    ctx.restoreGState()

    // 4. Subtle glossy outer rim
    let rimPath = NSBezierPath(roundedRect: squircleRect.insetBy(dx: 1, dy: 1), xRadius: cornerRadius - 1, yRadius: cornerRadius - 1)
    NSColor(white: 1.0, alpha: 0.12).setStroke()
    rimPath.lineWidth = 1.5 * scale
    rimPath.stroke()

    ctx.restoreGState()
    img.unlockFocus()
    return img
}

func savePNG(image: NSImage, path: String) {
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        print("Failed to convert image to PNG: \(path)")
        return
    }
    do {
        try png.write(to: URL(fileURLWithPath: path))
    } catch {
        print("Error saving \(path): \(error)")
    }
}

// Generate complete iconset
let iconsetDir = "/tmp/AppIcon.iconset"
try? FileManager.default.removeItem(atPath: iconsetDir)
try? FileManager.default.createDirectory(atPath: iconsetDir, withIntermediateDirectories: true)

let sizes: [(String, CGFloat)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]

for (name, px) in sizes {
    let img = renderIcon(size: px)
    savePNG(image: img, path: "\(iconsetDir)/\(name)")
}

print("✅ Iconset generated successfully at \(iconsetDir)")
