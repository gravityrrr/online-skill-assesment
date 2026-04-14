import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:skill_assessment/core/theme/app_theme.dart';
import 'package:skill_assessment/core/widgets/glass_container.dart';
import 'package:skill_assessment/core/widgets/neon_button.dart';
import 'package:skill_assessment/features/auth/presentation/providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passController = TextEditingController();
  bool _isInstructor = false; 

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    ref.listen<AuthStateStatus>(authStateProvider, (previous, next) {
      if (next == AuthStateStatus.error) {
        final err = ref.read(authStateProvider.notifier).errorMessage ?? 'Registration Error';
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
          Positioned(top: -50, left: -50, child: _buildGlowSphere(AppTheme.secondaryAccent, 500)),
          Positioned(bottom: -50, right: -50, child: _buildGlowSphere(AppTheme.neonAccent, 400)),
          
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
                          const Icon(Icons.person_add_alt_1_outlined, size: 60, color: AppTheme.secondaryAccent),
                          const SizedBox(height: 16),
                          Text(
                            "ESTABLISH IDENTITY", 
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.5)
                          ),
                          const SizedBox(height: 32),
                          _buildTextField("Full Name", Icons.badge_outlined, AppTheme.secondaryAccent, _nameController),
                          const SizedBox(height: 16),
                          _buildTextField("Email Address", Icons.email_outlined, AppTheme.secondaryAccent, _emailController),
                          const SizedBox(height: 16),
                          _buildTextField("Password", Icons.lock_outline, AppTheme.secondaryAccent, _passController, obscureText: true),
                          const SizedBox(height: 16),
                          
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Request Instructor Privileges", style: TextStyle(color: Colors.white70, fontSize: 14)),
                              Switch(
                                value: _isInstructor,
                                activeColor: AppTheme.secondaryAccent,
                                onChanged: (val) => setState(() => _isInstructor = val),
                              )
                            ],
                          ),
                          const SizedBox(height: 24),
                          
                          if (authState == AuthStateStatus.loading)
                            const CircularProgressIndicator(color: AppTheme.secondaryAccent)
                          else
                            NeonButton(
                              text: "INITIATE SEQUENCE",
                              neonColor: AppTheme.secondaryAccent,
                              onPressed: () {
                                ref.read(authStateProvider.notifier).signUp(
                                  _emailController.text.trim(),
                                  _passController.text.trim(),
                                  _nameController.text.trim(),
                                  _isInstructor
                                );
                              },
                            ),
                            
                          const SizedBox(height: 16),
                          MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: GestureDetector(
                              onTap: () {
                                Navigator.pushReplacementNamed(context, '/');
                              },
                              child: const Text("ABORT & RETURN", style: TextStyle(color: AppTheme.textMuted, letterSpacing: 1.2)),
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

  Widget _buildTextField(String hint, IconData icon, Color accent, TextEditingController controller, {bool obscureText = false}) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
        prefixIcon: Icon(icon, color: accent.withOpacity(0.8)),
        filled: true, fillColor: Colors.black.withOpacity(0.3),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.white.withOpacity(0.05))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: accent)),
      ),
    );
  }
}
