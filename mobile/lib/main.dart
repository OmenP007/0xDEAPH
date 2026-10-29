import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'features/auth/screens/splash_screen.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/navigation/main_nav_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TrustApp());
}

class TrustApp extends StatelessWidget {
  const TrustApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(
          create: (_) => ApiService(),
        ),
        ChangeNotifierProvider<AuthService>(
          create: (ctx) => AuthService(api: ctx.read<ApiService>()),
        ),
        // La session est restaurée une seule fois par AuthGate (initAuth).
      ],
      child: MaterialApp(
        title: 'TRUST Escrow',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthService>().initAuth();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (auth.isLoading) {
      return const SplashScreen();
    }

    if (!auth.isAuthenticated) {
      // Une session peut expirer pendant qu'un écran est ouvert :
      // on revient à la racine pour afficher l'écran de connexion.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final navigator = Navigator.of(context);
        if (navigator.canPop()) {
          navigator.popUntil((route) => route.isFirst);
        }
      });
      return const LoginScreen();
    }

    // Après inscription/connexion, on ferme les éventuels écrans empilés
    // (ex: RegisterScreen) pour laisser AuthGate piloter la navigation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final navigator = Navigator.of(context);
      if (navigator.canPop()) {
        navigator.popUntil((route) => route.isFirst);
      }
    });
    return const MainNavScreen();
  }
}
