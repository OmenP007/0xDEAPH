import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

enum TrustButtonVariant { primary, secondary }

class TrustButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isSecondary;
  final TrustButtonVariant? variant;
  final IconData? icon;

  const TrustButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.isSecondary = false,
    this.variant,
    this.icon,
  });

  bool get _isSecondary =>
      variant == TrustButtonVariant.secondary ||
      (variant == null && isSecondary);

  @override
  Widget build(BuildContext context) {
    if (_isSecondary) {
      return SizedBox(
        width: double.infinity,
        height: 52,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: TrustColors.darkBorder, width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            foregroundColor: Colors.white,
          ),
          child: _buildChild(Colors.white),
        ),
      );
    }

    return Container(
      width: double.infinity,
      height: 52,
      decoration: BoxDecoration(
        gradient: TrustColors.brandGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: TrustColors.primary.withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: isLoading ? null : onPressed,
          child: Center(child: _buildChild(Colors.white)),
        ),
      ),
    );
  }

  Widget _buildChild(Color textColor) {
    if (isLoading) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
      );
    }

    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: textColor),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ],
      );
    }

    return Text(
      text,
      style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 14),
    );
  }
}
