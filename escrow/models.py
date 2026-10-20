from django.db import models
from django.contrib.auth.models import AbstractUser
import cryptography 

# Create your models here.
class User(AbstractUser): 
        id = models.BigAutoField(primary_key=True)
        ROLE_USERS = [('member', 'Membre'), ('deaph', 'Admin'),("client", "Client"), ("seller", "Vendeur" )]
        role = models.CharField(max_length=10, blank=False, choices=ROLE_USERS)
        def __str__(self): 
                return self.username
 
class Paiement(models.Model) : 
        STATUS = [('CREATED', 'Initié, En attente de paiement'),
                 ('BLOCKED', 'Fonds bloqués sous sequestre'),
                 ('RELEASED', 'Fonds libéré'),
                 ('REFUNDED', 'Remboursée')
                 ]
        buyer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='purchase')
        seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sales')
        amount = models.DecimalField(max_digits=10, decimal_places=2)
        escrow_id = models.CharField(max_length=225, blank=True)
        status = models.CharField(max_length=10, choices=STATUS, default='CREATED')
        created_at = models.DateTimeField(auto_now_add=True)
        def __str__(self):
                return f"{self.buyer} -> {self.seller} : {self.amount} ({self.status})"
        