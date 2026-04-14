import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/neon_button.dart';

class ResultScreen extends StatelessWidget {
  final int score;
  final String status;

  const ResultScreen({super.key, required this.score, required this.status});

  @override
  Widget build(BuildContext context) {
    bool isPass = status == 'pass';
    Color glowColor = isPass ? AppTheme.neonAccent : AppTheme.secondaryAccent;

    return Scaffold(
      body: Stack(
        children: [
          // Enormous immersive background lighting dynamically indicating success/fail physically onto the environment constraint
          Positioned(top: 0, bottom: 0, left: 0, right: 0, child: Center(child: _buildGlowSphere(glowColor, 400))),
          
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isPass ? Icons.emoji_events : Icons.sentiment_very_dissatisfied, 
                      size: 150, 
                      color: glowColor,
                      shadows: [Shadow(color: glowColor.withOpacity(0.5), blurRadius: 30)],
                    ),
                    const SizedBox(height: 32),
                    Text(
                      isPass ? "EVALUATION COMPLETE" : "EVALUATION FAILED", 
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white, 
                        fontWeight: FontWeight.bold, 
                        letterSpacing: 2
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isPass ? "Outstanding performance verified." : "Insufficient competence level detected.",
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 18),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 64),
                    Text(
                      "$score%",
                      style: TextStyle(
                        color: glowColor,
                        fontSize: 90,
                        fontWeight: FontWeight.bold,
                        shadows: [Shadow(color: glowColor.withOpacity(0.8), blurRadius: 40)]
                      ),
                    ),
                    const Spacer(),
                    NeonButton(
                      text: "RETURN TO DASHBOARD",
                      neonColor: glowColor,
                      onPressed: () {
                        Navigator.popUntil(context, (route) => route.isFirst);
                      },
                    ),
                    const SizedBox(height: 32)
                  ],
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildGlowSphere(Color color, double size) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.12), boxShadow: [BoxShadow(color: color.withOpacity(0.2), blurRadius: 100, spreadRadius: 100)]),
    );
  }
}
