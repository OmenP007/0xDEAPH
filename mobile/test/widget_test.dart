import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trust_mobile/shared/widgets/trust_card.dart';

void main() {
  testWidgets('TrustCard affiche son contenu', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TrustCard(child: Text('TRUST')),
        ),
      ),
    );

    expect(find.text('TRUST'), findsOneWidget);
  });
}
