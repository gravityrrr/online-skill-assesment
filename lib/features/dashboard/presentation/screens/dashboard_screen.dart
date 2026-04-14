import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/core/widgets/neon_button.dart';
import 'package:skill_assessment/core/widgets/web_navbar.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: const WebNavbar(title: "LEARNER GATEWAY"), // Injects flawless edge-to-edge Web Toolbar
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: Supabase.instance.client.from('assessments').select(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.neonAccent));
          }

          if (snapshot.hasError) {
             final err = snapshot.error.toString();
             bool isAuthError = err.contains('JWT') || err.contains('policy');
             return Center(
               child: Padding(
                 padding: const EdgeInsets.all(32.0),
                 child: ConstrainedBox(
                   constraints: const BoxConstraints(maxWidth: 600),
                   child: Column(
                     mainAxisAlignment: MainAxisAlignment.center,
                     children: [
                       const Icon(Icons.warning_amber_rounded, color: Colors.orangeAccent, size: 60),
                       const SizedBox(height: 16),
                       Text("SECURE QUERY REJECTED", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                       const SizedBox(height: 16),
                       Text(
                         isAuthError 
                           ? "Supabase demands Email Verification by default! Please verify your identity footprint, or disable 'Confirm Email' locally in the Auth Settings."
                           : err,
                         style: const TextStyle(color: AppTheme.textMuted, height: 1.5),
                         textAlign: TextAlign.center,
                       ),
                     ],
                   ),
                 ),
               ),
             );
          }

          final assessments = snapshot.data ?? [];
          
          if (assessments.isEmpty) {
            return Center(
              child: Column(
                 mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.dns_outlined, size: 80, color: AppTheme.textMuted),
                  const SizedBox(height: 16),
                  const Text("NO ASSESSMENTS AVAILABLE", style: TextStyle(color: AppTheme.textMuted, fontSize: 18, letterSpacing: 2)),
                  const SizedBox(height: 8),
                  const Text("Instructors must populate the Database.", style: TextStyle(color: Colors.white54, fontSize: 14)),
                ],
              ),
            );
          }

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800), // Locks rendering to explicit JS Desktop Web-Page maximums
              child: ListView.builder(
                padding: const EdgeInsets.all(40),
                itemCount: assessments.length,
                itemBuilder: (context, index) {
                  final assessment = assessments[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(40),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.02),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.neonAccent.withOpacity(0.3), width: 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                       Row(
                         mainAxisAlignment: MainAxisAlignment.spaceBetween,
                         children: [
                           Text(assessment['title'], style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                           Row(
                             children: [
                               const Icon(Icons.timer, color: AppTheme.secondaryAccent, size: 16),
                               const SizedBox(width: 8),
                                Text("Time Limit: ${assessment['time_limit']} mins", style: const TextStyle(color: AppTheme.secondaryAccent, fontWeight: FontWeight.w600)),
                             ],
                           ),
                         ],
                       ),
                        const SizedBox(height: 48),
                        NeonButton(
                          text: "COMMENCE EVALUATION",
                          neonColor: AppTheme.neonAccent,
                          onPressed: () {
                            // Imposes standard Desktop URL String execution specifically tracking "/assessment"
                            Navigator.pushNamed(context, '/assessment', arguments: assessment['assessment_id']);
                          },
                        )
                      ],
                    ),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }
}
