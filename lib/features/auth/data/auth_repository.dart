import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(supabaseClientProvider));
});

class AuthRepository {
  final SupabaseClient _supabase;
  AuthRepository(this._supabase);

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
  User? get currentUser => _supabase.auth.currentUser;

  Future<void> signIn(String email, String password) async {
    await _supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signUp(String email, String password, String name, String role) async {
    await _supabase.auth.signUp(
      email: email, 
      password: password,
      data: {'name': name, 'role': role},
    );
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
  
  Future<Map<String, dynamic>> getUserProfile(String userId) async {
    return await _supabase.from('users').select().eq('id', userId).single();
  }
}
