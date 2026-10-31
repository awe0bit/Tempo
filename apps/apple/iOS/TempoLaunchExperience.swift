import SwiftUI

struct TempoLaunchExperience: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  let onFinished: () -> Void

  @State private var hasStarted = false
  @State private var markVisible = false
  @State private var revealingApp = false
  @State private var crossbarProgress: CGFloat = 0
  @State private var stemProgress: CGFloat = 0
  @State private var tipSeated = false
  @State private var highlightProgress: CGFloat = -0.5
  @State private var accentPulse = false

  var body: some View {
    ZStack {
      TempoPalette.background
        .opacity(revealingApp ? 0 : 1)

      assembledMark
        .frame(width: 236, height: 236)
        .scaleEffect(reduceMotion ? 1 : revealingApp ? 1.06 : markVisible ? 1 : 0.96)
        .opacity(markVisible && !revealingApp ? 1 : 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .ignoresSafeArea()
    .accessibilityHidden(true)
    .task { await playOnce() }
  }

  private var symbol: some View {
    Image("TempoLaunchMark")
      .renderingMode(.original)
      .resizable()
      .scaledToFit()
      .mask(LaunchSymbolSilhouette())
  }

  private var assembledMark: some View {
    GeometryReader { proxy in
      let size = proxy.size
      ZStack(alignment: .topLeading) {
        // Every layer uses the same original artwork and alpha mask. Once
        // seated, the three pieces reconstruct the icon without visible seams.
        symbol
          .mask(LaunchCrossbarMask())
          .mask(alignment: .leading) {
            Rectangle().frame(width: size.width * crossbarProgress)
          }
          .offset(x: reduceMotion ? 0 : -12 * (1 - crossbarProgress))

        symbol
          .mask(alignment: .top) {
            VStack(spacing: 0) {
              Color.clear.frame(height: size.height * 0.44)
              Rectangle().frame(height: size.height * 0.56 * stemProgress)
              Spacer(minLength: 0)
            }
          }

        Circle()
          .fill(TempoPalette.accent.opacity(accentPulse ? 0.15 : 0))
          .frame(width: 24, height: 24)
          .blur(radius: 14)
          .scaleEffect(accentPulse ? 1.6 : 0.7)
          .position(x: size.width * 0.73, y: size.height * 0.35)

        symbol
          .mask(LaunchCrossbarMask(inverted: true).fill(style: FillStyle(eoFill: true)))
          .mask(alignment: .top) { Rectangle().frame(height: size.height * 0.44) }
          .offset(x: tipSeated || reduceMotion ? 0 : 22, y: tipSeated || reduceMotion ? 0 : -10)
          .rotationEffect(.degrees(tipSeated || reduceMotion ? 0 : -7), anchor: .init(x: 0.7, y: 0.35))
          .opacity(tipSeated ? 1 : 0)

        if !reduceMotion {
          LinearGradient(colors: [.clear, .white.opacity(0.28), .clear], startPoint: .leading, endPoint: .trailing)
            .frame(width: size.width * 0.22, height: size.height)
            .rotationEffect(.degrees(18))
            .offset(x: size.width * highlightProgress)
            .frame(width: size.width, height: size.height, alignment: .leading)
            .mask { symbol }
            .opacity(tipSeated ? 1 : 0)
        }
      }
    }
  }

  @MainActor
  private func playOnce() async {
    guard !hasStarted else { return }
    hasStarted = true

    do {
      if reduceMotion {
        markVisible = true
        crossbarProgress = 1
        stemProgress = 1
        tipSeated = true
        try await Task.sleep(for: .milliseconds(180))
      } else {
        withAnimation(.timingCurve(0.22, 0.8, 0.2, 1, duration: 0.48)) {
          markVisible = true
          crossbarProgress = 1
        }
        try await Task.sleep(for: .milliseconds(160))
        withAnimation(.timingCurve(0.22, 0.8, 0.2, 1, duration: 0.46)) {
          stemProgress = 1
        }
        try await Task.sleep(for: .milliseconds(260))
        withAnimation(.spring(response: 0.42, dampingFraction: 0.84)) {
          tipSeated = true
          accentPulse = true
        }
        try await Task.sleep(for: .milliseconds(300))
        withAnimation(.easeOut(duration: 0.48)) {
          accentPulse = false
          highlightProgress = 1.15
        }
        try await Task.sleep(for: .milliseconds(530))
      }
      withAnimation(.easeInOut(duration: reduceMotion ? 0.18 : 0.36)) {
        revealingApp = true
      }
      try await Task.sleep(for: .milliseconds(reduceMotion ? 200 : 380))
      try Task.checkCancellation()
      onFinished()
    } catch {
      // A removed scene must not complete the launch of a replacement scene.
    }
  }
}

private struct LaunchCrossbarMask: Shape {
  var inverted = false

  func path(in rect: CGRect) -> Path {
    Path { path in
      if inverted { path.addRect(rect) }
      path.move(to: .zero)
      path.addLine(to: CGPoint(x: rect.width * 0.7, y: 0))
      path.addLine(to: CGPoint(x: rect.width * 0.7, y: rect.height * 0.27))
      path.addLine(to: CGPoint(x: rect.width * 0.60, y: rect.height * 0.44))
      path.addLine(to: CGPoint(x: 0, y: rect.height * 0.44))
      path.closeSubpath()
    }
  }
}

// Normalized native curves isolate the existing artwork, including its detached
// tip, without carrying any of the square app-icon background into the motion.
private struct LaunchSymbolSilhouette: Shape {
  func path(in rect: CGRect) -> Path {
    let outline = Path { path in
      path.move(to: CGPoint(x: 0.186, y: 0.399))
      path.addCurve(to: CGPoint(x: 0.310, y: 0.278), control1: CGPoint(x: 0.219, y: 0.318), control2: CGPoint(x: 0.245, y: 0.280))
      path.addLine(to: CGPoint(x: 0.676, y: 0.278))
      path.addCurve(to: CGPoint(x: 0.618, y: 0.382), control1: CGPoint(x: 0.659, y: 0.296), control2: CGPoint(x: 0.636, y: 0.354))
      path.addCurve(to: CGPoint(x: 0.563, y: 0.405), control1: CGPoint(x: 0.607, y: 0.402), control2: CGPoint(x: 0.590, y: 0.405))
      path.addLine(to: CGPoint(x: 0.521, y: 0.405))
      path.addCurve(to: CGPoint(x: 0.578, y: 0.465), control1: CGPoint(x: 0.560, y: 0.409), control2: CGPoint(x: 0.578, y: 0.429))
      path.addLine(to: CGPoint(x: 0.578, y: 0.704))
      path.addCurve(to: CGPoint(x: 0.530, y: 0.754), control1: CGPoint(x: 0.578, y: 0.743), control2: CGPoint(x: 0.561, y: 0.754))
      path.addLine(to: CGPoint(x: 0.458, y: 0.754))
      path.addCurve(to: CGPoint(x: 0.414, y: 0.706), control1: CGPoint(x: 0.426, y: 0.754), control2: CGPoint(x: 0.414, y: 0.739))
      path.addLine(to: CGPoint(x: 0.414, y: 0.491))
      path.addCurve(to: CGPoint(x: 0.367, y: 0.427), control1: CGPoint(x: 0.414, y: 0.448), control2: CGPoint(x: 0.400, y: 0.427))
      path.addLine(to: CGPoint(x: 0.212, y: 0.427))
      path.addCurve(to: CGPoint(x: 0.186, y: 0.399), control1: CGPoint(x: 0.186, y: 0.427), control2: CGPoint(x: 0.178, y: 0.416))
      path.closeSubpath()

      path.move(to: CGPoint(x: 0.607, y: 0.418))
      path.addCurve(to: CGPoint(x: 0.682, y: 0.309), control1: CGPoint(x: 0.641, y: 0.398), control2: CGPoint(x: 0.662, y: 0.353))
      path.addCurve(to: CGPoint(x: 0.729, y: 0.278), control1: CGPoint(x: 0.693, y: 0.286), control2: CGPoint(x: 0.704, y: 0.278))
      path.addLine(to: CGPoint(x: 0.799, y: 0.278))
      path.addCurve(to: CGPoint(x: 0.817, y: 0.304), control1: CGPoint(x: 0.816, y: 0.278), control2: CGPoint(x: 0.821, y: 0.286))
      path.addLine(to: CGPoint(x: 0.780, y: 0.380))
      path.addCurve(to: CGPoint(x: 0.699, y: 0.418), control1: CGPoint(x: 0.764, y: 0.407), control2: CGPoint(x: 0.737, y: 0.418))
      path.closeSubpath()
    }
    return outline.applying(CGAffineTransform(scaleX: rect.width, y: rect.height))
  }
}
