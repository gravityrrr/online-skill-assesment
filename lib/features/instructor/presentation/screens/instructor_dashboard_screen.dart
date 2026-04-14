import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/core/widgets/neon_button.dart';
import 'package:skill_assessment/core/widgets/web_navbar.dart';

class InstructorDashboardScreen extends ConsumerStatefulWidget {
  const InstructorDashboardScreen({super.key});

  @override
  ConsumerState<InstructorDashboardScreen> createState() => _InstructorDashboardState();
}

class _InstructorDashboardState extends ConsumerState<InstructorDashboardScreen> {
  bool _isGenerating = false;

  Future<void> _generateDemoContent() async {
    setState(() => _isGenerating = true);
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      
      final courseMeta = await supabase.from('courses').insert({
        'instructor_id': user!.id,
        'title': 'Advanced Sub-Orbital Mechanics',
        'description': 'A masterclass in advanced astrophysics.',
      }).select().single();
      
      final assessmentMeta = await supabase.from('assessments').insert({
        'course_id': courseMeta['course_id'],
        'title': 'Evaluation 1: Gravitational Well Diagnostics',
        'time_limit': 15,
      }).select().single();

      await supabase.from('questions').insert([
        {
          'assessment_id': assessmentMeta['assessment_id'],
          'question_text': 'What explicit forces mathematically define a standard sub-orbital trajectory apex?',
          'options': ['Kinetic friction overrides', 'Gravitational pull & velocity', 'Quantum drag', 'Magnetic induction'],
          'correct_answer': 'Gravitational pull & velocity'
        },
        {
          'assessment_id': assessmentMeta['assessment_id'],
          'question_text': 'At what explicit altitude does the planetary Karman line isolate atmospheric thresholds?',
          'options': ['10 km', '50 km', '100 km', '150 km'],
          'correct_answer': '100 km'
        },
        {
          'assessment_id': assessmentMeta['assessment_id'],
          'question_text': 'Which of the following propulsion architectures commands the highest ISP inside a hard mathematical vacuum?',
          'options': ['Standard Solid Booster', 'Air-breathing Turbojet', 'Xenon Ion Thruster', 'Liquid Hydrogen Aerospike'],
          'correct_answer': 'Xenon Ion Thruster'
        }
      ]);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Demo Simulator Framework populated locally into Remote Database!', style: TextStyle(fontWeight: FontWeight.bold))),);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e', style: const TextStyle(color: Colors.redAccent))));
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const WebNavbar(title: "INSTRUCTOR NETWORK"),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
               Icon(Icons.dashboard_customize_outlined, size: 100, color: AppTheme.secondaryAccent.withOpacity(0.8)),
               const SizedBox(height: 32),
               const Text("INSTRUCTOR DATABANKS ACCESSED.", style: TextStyle(color: AppTheme.textMuted, letterSpacing: 2, fontSize: 18, fontWeight: FontWeight.bold)),
               const SizedBox(height: 16),
               const Text(
                 "Instead of forcing a tedious manual UI to type everything, tap below to have the backend auto-generate a comprehensive Advanced Physics course directly into the Supabase Cloud. You can log out afterward, enter as a student, and take it!", 
                 textAlign: TextAlign.center, 
                 style: TextStyle(color: Colors.white70, height: 1.5)
               ),
               const SizedBox(height: 48),
               
               _isGenerating 
                  ? const CircularProgressIndicator(color: AppTheme.secondaryAccent)
                  : ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400),
                      child: NeonButton(
                        text: "INJECT DEMO ENVIRONMENT",
                        neonColor: AppTheme.secondaryAccent,
                        onPressed: _generateDemoContent,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
