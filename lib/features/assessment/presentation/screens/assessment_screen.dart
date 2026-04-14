import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/neon_button.dart';
import '../../domain/question_model.dart';
import '../providers/assessment_provider.dart';
import 'result_screen.dart';
import '../widgets/floating_timer.dart';

class AssessmentScreen extends ConsumerWidget {
  final String assessmentId;
  const AssessmentScreen({super.key, required this.assessmentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(assessmentProvider(assessmentId));
    final notifier = ref.read(assessmentProvider(assessmentId).notifier);

    if (state.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppTheme.neonAccent)));
    }

    if (state.questions.isEmpty) {
      return const Scaffold(body: Center(child: Text("Database validation fault. No logic accessible.", style: TextStyle(color: Colors.white))));
    }

    final currentQ = state.questions[state.currentIndex];
    final progress = (state.currentIndex + 1) / state.questions.length;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // Dark immersive background ambient layer
            Positioned(top: -150, left: -100, child: _buildGlowSphere(AppTheme.neonAccent, 400)),
            
            Column(
              children: [
                // UX: Precision Header Bar
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: LinearProgressIndicator(
                            value: progress,
                            backgroundColor: Colors.white.withOpacity(0.05),
                            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.neonAccent),
                            minHeight: 10,
                          ),
                        ),
                      ),
                      const SizedBox(width: 24),
                      FloatingTimer(assessmentId: assessmentId),
                    ],
                  ),
                ),
                
                // UX: Distraction free smooth transitions preventing fast-clicking layout breaking
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 350),
                      transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: SlideTransition(
                        position: Tween<Offset>(begin: const Offset(0.05, 0), end: Offset.zero).animate(animation),
                        child: child,
                      )),
                      child: _buildQuestionView(context, currentQ, state, notifier, key: ValueKey(currentQ.id)),
                    ),
                  ),
                ),

                // UX: Strict Navigation Ruleset Bottom Layer
                Container(
                  padding: const EdgeInsets.all(24.0),
                  decoration: BoxDecoration(
                    color: AppTheme.darkBackground.withOpacity(0.95),
                    border: Border(top: BorderSide(color: Colors.white.withOpacity(0.03))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        onPressed: state.currentIndex > 0 && !state.isSubmitting 
                            ? () => notifier.setIndex(state.currentIndex - 1) : null,
                        icon: Icon(Icons.arrow_back_ios, color: state.currentIndex > 0 ? Colors.white : AppTheme.textMuted),
                      ),
                      
                      state.currentIndex == state.questions.length - 1
                        ? Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: state.isSubmitting 
                                ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAccent))
                                : NeonButton(
                                  text: "SUBMIT PAYLOAD",
                                  neonColor: AppTheme.secondaryAccent,
                                  onPressed: () async {
                                    final result = await notifier.submitAssessment();
                                    if (result['status'] == 'success') {
                                      Navigator.pushReplacement(context, PageRouteBuilder(
                                        pageBuilder: (c, a1, a2) => ResultScreen(score: result['score'], status: result['result_status']),
                                        transitionsBuilder: (c, a1, a2, child) => FadeTransition(opacity: a1, child: child),
                                        transitionDuration: const Duration(seconds: 1)
                                      ));
                                    } else {
                                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'])));
                                    }
                                  },
                                ),
                            ),
                          )
                        : const Spacer(),

                      IconButton(
                        onPressed: state.currentIndex < state.questions.length - 1 && !state.isSubmitting 
                            ? () => notifier.setIndex(state.currentIndex + 1) : null,
                        icon: Icon(Icons.arrow_forward_ios, color: state.currentIndex < state.questions.length - 1 ? Colors.white : AppTheme.textMuted),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionView(BuildContext context, Question q, AssessmentState state, AssessmentNotifier notifier, {Key? key}) {
    return SingleChildScrollView(
      key: key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Text("QUESTION ${state.currentIndex + 1} OF ${state.questions.length}", 
            style: const TextStyle(color: AppTheme.secondaryAccent, fontWeight: FontWeight.bold, letterSpacing: 2)
          ),
          const SizedBox(height: 16),
          Text(q.text, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, height: 1.4)),
          const SizedBox(height: 48),
          
          ...q.options.map((option) {
            final isSelected = state.selectedAnswers[q.id] == option;
            return Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: GestureDetector(
                onTap: () => notifier.selectAnswer(q.id, option),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.neonAccent.withOpacity(0.12) : AppTheme.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isSelected ? AppTheme.neonAccent : Colors.white.withOpacity(0.03), width: 2),
                    boxShadow: isSelected ? [BoxShadow(color: AppTheme.neonAccent.withOpacity(0.2), blurRadius: 20, spreadRadius: 0)] : [],
                  ),
                  child: Row(
                    children: [
                      Icon(isSelected ? Icons.check_circle : Icons.radio_button_unchecked, color: isSelected ? AppTheme.neonAccent : AppTheme.textMuted),
                      const SizedBox(width: 16),
                      Expanded(child: Text(option, style: TextStyle(color: isSelected ? Colors.white : AppTheme.textMuted, fontSize: 16))),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildGlowSphere(Color color, double size) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.06), boxShadow: [BoxShadow(color: color.withOpacity(0.1), blurRadius: 100, spreadRadius: 100)]),
    );
  }
}
