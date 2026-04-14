import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/core/widgets/glass_container.dart';
import 'package:skill_assessment/core/widgets/neon_button.dart';
import 'package:skill_assessment/features/auth/presentation/providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    ref.listen<AuthStateStatus>(authStateProvider, (previous, next) {
      if (next == AuthStateStatus.error) {
        final err = ref.read(authStateProvider.notifier).errorMessage ?? 'System Error';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), backgroundColor: Colors.redAccent, behavior: SnackBarBehavior.floating));
      } else if (next == AuthStateStatus.authenticatedInstructor) {
        Navigator.pushReplacementNamed(context, '/instructor');
      } else if (next == AuthStateStatus.authenticatedLearner) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    });

    return Scaffold(
      resizeToAvoidBottomInset: false, 
      body: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(top: -100, right: -100, child: _buildGlowSphere(AppTheme.neonAccent, 600)),
          Positioned(bottom: -50, left: -50, child: _buildGlowSphere(AppTheme.secondaryAccent, 400)),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 450), 
                child: Hero(
                  tag: 'auth_container',
                  child: Material(
                    type: MaterialType.transparency,
                    child: GlassContainer(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.hub_outlined, size: 60, color: AppTheme.neonAccent),
                          const SizedBox(height: 16),
                          Text(
                            "SYSTEM LOGIN", 
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.5)
                          ),
                          const SizedBox(height: 32),
                          _buildTextField("Email Address", Icons.email_outlined, _emailController),
                          const SizedBox(height: 16),
                          _buildTextField("Password", Icons.lock_outline, _passController, obscureText: true),
                          const SizedBox(height: 32),
                          
                          if (authState == AuthStateStatus.loading)
                            const CircularProgressIndicator(color: AppTheme.neonAccent)
                          else
                            NeonButton(
                              text: "INITIALIZE PROTOCOL",
                              neonColor: AppTheme.neonAccent,
                              onPressed: () {
                                ref.read(authStateProvider.notifier).signIn(
                                  _emailController.text.trim(), 
                                  _passController.text.trim(),
                                );
                              },
                            ),
                            
                          const SizedBox(height: 24),
                          MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: GestureDetector(
                              onTap: () {
                                Navigator.pushReplacementNamed(context, '/register');
                              },
                              child: const Text("NEW USER? REGISTER HERE", style: TextStyle(color: AppTheme.textMuted, letterSpacing: 1.2)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlowSphere(Color color, double size) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.08), boxShadow: [BoxShadow(color: color.withOpacity(0.12), blurRadius: 100, spreadRadius: 100)]),
    );
  }

  Widget _buildTextField(String hint, IconData icon, TextEditingController controller, {bool obscureText = false}) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
        prefixIcon: Icon(icon, color: AppTheme.neonAccent.withOpacity(0.8)),
        filled: true, fillColor: Colors.black.withOpacity(0.3),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.white.withOpacity(0.05))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppTheme.neonAccent)),
      ),
    );
  }
}
