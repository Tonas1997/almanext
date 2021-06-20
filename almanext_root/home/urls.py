from django.conf import settings
from django.conf.urls import url
from django.conf.urls.static import static
from django.urls import path
from . import views

urlpatterns = [
    url(r'^get_bands/$', views.get_bands, name='get_bands'),
    url(r'^get_area_per_freq/$', views.get_area_per_freq, name='get_area_per_freq'),
    url(r'^get_archive_info/$', views.get_archive_info, name='get_archive_info'),
    url(r'', views.index, name='index'),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)