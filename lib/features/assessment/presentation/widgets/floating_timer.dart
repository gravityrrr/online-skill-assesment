import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../providers/assessment_provider.dart';

class FloatingTimer extends ConsumerStatefulWidget {
  final String assessmentId;
  const FloatingTimer({super.key, required this.assessmentId});

  @override
  ConsumerState<FloatingTimer> createState() => _FloatingTimerState();
}

class _FloatingTimerState extends ConsumerState<FloatingTimer> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Precision timer execution triggering explicit state re-renders locally
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      ref.read(assessmentProvider(widget.assessmentId).notifier).decrementTimer();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assessmentProvider(widget.assessmentId));
    final seconds = state.timeRemaining % 60;
    final minutes = state.timeRemaining ~/ 60;
    
    final isCritical = state.timeRemaining < 60;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isCritical ? Colors.redAccent.withOpacity(0.2) : AppTheme.surfaceColor.withOpacity(0.8),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: isCritical ? Colors.redAccent : AppTheme.neonAccent.withOpacity(0.5)),
        boxShadow: isCritical ? [
          BoxShadow(color: Colors.redAccent.withOpacity(0.3), blurRadius: 15, spreadRadius: 2)
        ] : [],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.timer_outlined, color: isCritical ? Colors.redAccent : AppTheme.neonAccent, size: 20),
          const SizedBox(width: 8),
          Text(
            '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
            style: TextStyle(
              color: isCritical ? Colors.redAccent : Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          )
        ],
      ),
    );
  }
}
