from django.urls import path
from . import views

urlpatterns = [
    path('field/', views.index, name='index'),
    path('', views.get_plot, name='get_plot'),
]
