from django.conf import settings
from django.conf.urls import url
from django.conf.urls.static import static
from django.urls import path
from . import views

urlpatterns = [
    url(r'^get_bands/$', views.get_bands, name='get_bands'),
    url(r'', views.index, name='index'),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)