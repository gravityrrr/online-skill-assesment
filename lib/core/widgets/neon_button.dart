import 'package:flutter/material.dart';

class NeonButton extends StatefulWidget {
  final String text;
  final Color neonColor;
  final VoidCallback onPressed;

  const NeonButton({
    super.key, 
    required this.text, 
    required this.onPressed,
    required this.neonColor,
  });

  @override
  State<NeonButton> createState() => _NeonButtonState();
}

class _NeonButtonState extends State<NeonButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isHovered = false; // Dynamically tracks PC mouse cursor states natively required for Web browsers

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 100));
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _tapDown(TapDownDetails details) => _controller.forward();
  void _tapUp(TapUpDetails details) {
    _controller.reverse();
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    // ⚠️ CRITICAL WEB OVERRIDE: Applies Browser hover-cursor logic instantly
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTapDown: _tapDown,
        onTapUp: _tapUp,
        onTapCancel: () => _controller.reverse(),
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              color: widget.neonColor.withOpacity(_isHovered ? 0.2 : 0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: widget.neonColor, width: 2),
              boxShadow: [
                BoxShadow(
                  color: widget.neonColor.withOpacity(_isHovered ? 0.6 : 0.4),
                  blurRadius: _isHovered ? 30 : 20,
                  spreadRadius: _isHovered ? 2 : 1,
                )
              ]
            ),
            child: Center(
              child: Text(
                widget.text.toUpperCase(),
                style: TextStyle(
                  color: widget.neonColor,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: _isHovered ? 17 : 16,
                  shadows: _isHovered ? [Shadow(color: widget.neonColor, blurRadius: 10)] : [],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
