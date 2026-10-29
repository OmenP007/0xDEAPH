import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

class TrustBadge extends StatelessWidget {
  final String status;

  const TrustBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    String label;

    switch (status) {
      case 'BLOCKED':
        bg = TrustColors.warning.withValues(alpha: 0.15);
        text = TrustColors.warning;
        label = 'SÉQUESTRÉ';
        break;
      case 'RELEASED':
        bg = TrustColors.success.withValues(alpha: 0.15);
        text = TrustColors.success;
        label = 'LIBÉRÉ';
        break;
      case 'DISPUTED':
        bg = TrustColors.error.withValues(alpha: 0.15);
        text = TrustColors.error;
        label = 'LITIGE';
        break;
      case 'REFUNDED':
        bg = Colors.blue.withValues(alpha: 0.15);
        text = Colors.blue;
        label = 'REMBOURSÉ';
        break;
      default:
        bg = Colors.grey.withValues(alpha: 0.15);
        text = Colors.grey;
        label = 'CRÉÉ';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: text.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
