import AppKit
import Foundation

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "outputs/animated-explainer/png"
let width: CGFloat = 1080, height: CGFloat = 1080
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
  NSColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: alpha)
}
func drawText(_ s: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ c: NSColor, _ weight: NSFont.Weight = .bold, _ align: NSTextAlignment = .left) {
  let font = NSFont.systemFont(ofSize: size, weight: weight)
  let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: c, .paragraphStyle: { let p = NSMutableParagraphStyle(); p.alignment = align; return p }()]
  (s as NSString).draw(in: NSRect(x: x, y: y, width: 950, height: size * 1.35), withAttributes: attrs)
}
func rect(_ r: NSRect, _ c: NSColor, _ radius: CGFloat = 0) {
  c.setFill(); (radius > 0 ? NSBezierPath(roundedRect: r, xRadius: radius, yRadius: radius) : NSBezierPath(rect: r)).fill()
}
func circle(_ r: NSRect, _ c: NSColor, stroke: NSColor? = nil, width: CGFloat = 1) {
  c.setFill(); NSBezierPath(ovalIn: r).fill()
  if let stroke { stroke.setStroke(); let p = NSBezierPath(ovalIn: r); p.lineWidth = width; p.stroke() }
}
func clamp(_ v: CGFloat) -> CGFloat { max(0, min(1, v)) }
func ease(_ v: CGFloat) -> CGFloat { let t = clamp(v); return t * t * (3 - 2 * t) }
func fade(_ t: CGFloat, _ start: CGFloat, _ duration: CGFloat = 0.45) -> CGFloat { clamp((t - start) / duration) }

for frame in 0..<300 {
  let t = CGFloat(frame) / 30
  let img = NSImage(size: NSSize(width: width, height: height)); img.lockFocus()
  rect(NSRect(x: 0, y: 0, width: width, height: height), color(0x0E2934))
  circle(NSRect(x: -60, y: 820, width: 360, height: 360), color(0x193B4A, 0.7))
  circle(NSRect(x: 820, y: -90, width: 440, height: 440), color(0xF18C5B, 0.22))
  circle(NSRect(x: 848, y: 820, width: 144, height: 144), color(0xF8C76A, 0.85))
  drawText("IDEA → IMPACT", 78, 950, 23, color(0xF8C76A), .bold)
  rect(NSRect(x: 78, y: 145, width: 924, height: 3), color(0xF7F1E6, 0.22))
  drawText("A 10-second explainer", 78, 73, 20, color(0xB8C8C8), .medium)
  drawText(String(format: "%02d / 03", min(3, Int(t / 3.33) + 1)), 900, 73, 20, color(0xB8C8C8), .bold, .right)

  let in1 = ease(t / 0.55), out1 = 1 - fade(t, 2.65, 0.4), alpha1 = in1 * out1
  NSGraphicsContext.current?.cgContext.setAlpha(alpha1)
  let x = 78 - (1 - in1) * 80
  drawText("BIG IDEAS", x, 620, 82, color(0xF7F1E6))
  drawText("deserve a", x, 525, 82, color(0xF7F1E6))
  drawText("clear path.", x, 430, 82, color(0xF18C5B))
  drawText("Turn complexity into momentum.", x, 354, 28, color(0xB8C8C8), .medium)
  NSGraphicsContext.current?.cgContext.setAlpha(1)

  let a2 = 1 - fade(t, 5.75, 0.4), in2 = ease((t - 3.05) / 0.5)
  NSGraphicsContext.current?.cgContext.setAlpha(a2)
  drawText("MAKE IT", 78, 720, 72, color(0xF7F1E6)); drawText("move.", 78, 638, 72, color(0xF18C5B))
  let rows = [("01   Focus", "Find the one clear point."), ("02   Shape", "Give the story a simple form."), ("03   Launch", "Let people take the next step.")]
  for (idx, row) in rows.enumerated() { let p = ease((t - (3.15 + CGFloat(idx) * 0.16)) / 0.4); NSGraphicsContext.current?.cgContext.setAlpha(a2 * p); let y = 526 - CGFloat(idx) * 134; drawText(row.0, 110, y, 34, color(0xF7F1E6)); drawText(row.1, 110, y - 40, 22, color(0xB8C8C8), .medium); rect(NSRect(x: 790, y: y + 12, width: 190, height: 10), color(idx == 1 ? 0xF18C5B : 0xF8C76A), 5) }
  NSGraphicsContext.current?.cgContext.setAlpha(1)

  let a3 = fade(t, 6.15, 0.45); NSGraphicsContext.current?.cgContext.setAlpha(a3)
  drawText("CLARITY", 78, 620, 86, color(0xF7F1E6)); drawText("creates", 78, 520, 86, color(0xF7F1E6)); drawText("momentum.", 78, 420, 86, color(0xF8C76A)); drawText("Start with one idea. Make it unforgettable.", 78, 340, 28, color(0xB8C8C8), .medium)
  rect(NSRect(x: 78, y: 282, width: 316, height: 74), color(0xF18C5B), 37); drawText("MAKE YOUR MOVE  →", 98, 304, 22, color(0x0E2934))
  circle(NSRect(x: 748, y: 270, width: 152, height: 152), color(0xF8C76A)); drawText("GO", 824, 319, 43, color(0x0E2934), .bold, .center)
  NSGraphicsContext.current?.cgContext.setAlpha(1); img.unlockFocus()
  if let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) { try? png.write(to: URL(fileURLWithPath: String(format: "%@/frame_%04d.png", out, frame))) }
}
