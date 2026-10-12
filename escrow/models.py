from django.db import models
from django.contrib.auth import User 
import cryptography 

# Create your models here.
class User(models.Model) :
    id = models.BigAutoField(primary_key=True)
    name =  models.CharField(blank=False, max_length=100)
    surname = models.CharField(blank=False, max_length=200)
    password = models.CharField(blank=False, max_length=100)
    email = models.CharField(blank=False, max_length=150)
    ROLE_LIST = ["Client", "Vendeur"]
    role = models.CharField(blank=False, choices=ROLE_LIST)
def __str__(self): 
    return self.name 