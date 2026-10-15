from django.db import models
from django.contrib.auth import User 
import cryptography 

# Create your models here.
class User(User): 
        id = models.BigAutoField(primary_key=True)
        nom = models.CharField(max_length=100, blank=False)
        password = 
def __str__(self): 
        return self.name 