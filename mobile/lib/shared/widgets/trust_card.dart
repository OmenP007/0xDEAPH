import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

class TrustCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Border? border;
  final Color? color;
  final Gradient? gradient;

  const TrustCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.border,
    this.color,
    this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    final cardWidget = Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? TrustColors.darkSurface) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(20),
        border: border ?? Border.all(color: TrustColors.darkBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: cardWidget,
        ),
      );
    }

    return cardWidget;
  }
}
