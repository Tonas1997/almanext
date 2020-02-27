from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from . import views

urlpatterns = [
    path('field/', views.index, name='index'),
    path('', views.get_plot, name='get_plot'),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
