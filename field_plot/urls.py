from django.urls import path
from . import views

urlpatterns = [
      path('', views.get_plot, name='get_plot'),
  ]
