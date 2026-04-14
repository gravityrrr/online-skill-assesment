import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/features/auth/presentation/screens/login_screen.dart';
import 'package:skill_assessment/features/auth/presentation/screens/register_screen.dart';
import 'package:skill_assessment/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:skill_assessment/features/instructor/presentation/screens/instructor_dashboard_screen.dart';
import 'package:skill_assessment/features/assessment/presentation/screens/assessment_screen.dart';

const supabaseUrl = 'https://epcgbfogzqumjybibwiz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY2diZm9nenF1bWp5Ymlid2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjYxMzQsImV4cCI6MjA5MTIwMjEzNH0.V5QLc-rMb6jsYQHx9IuTvCEszXhZPAMD1mQgh294B7c';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const ProviderScope(child: SkillAssessmentWebsite()));
}

class SkillAssessmentWebsite extends StatelessWidget {
  const SkillAssessmentWebsite({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Skill Assessment Web Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/', // Bootstraps native Web browser HTTP routing mechanics mapping straight onto Chrome
      onGenerateRoute: (settings) {
        // Enforces actual URL string parsing ensuring the top search-bar explicitly matches JS paradigms (/dashboard etc)
        switch (settings.name) {
          case '/': 
            return MaterialPageRoute(builder: (_) => const LoginScreen());
          case '/register': 
            return MaterialPageRoute(builder: (_) => const RegisterScreen());
          case '/dashboard': 
            return MaterialPageRoute(builder: (_) => const DashboardScreen());
          case '/instructor': 
            return MaterialPageRoute(builder: (_) => const InstructorDashboardScreen());
          case '/assessment':
            final id = settings.arguments as String;
            return MaterialPageRoute(builder: (_) => AssessmentScreen(assessmentId: id));
          default:
            return MaterialPageRoute(builder: (_) => const LoginScreen());
        }
      },
    );
  }
}
