"""
URL configuration for missculture project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView
from .error_handlers import (
    health_check, debug_info, admin_debug_info, db_performance_check,
    error_404, error_500, error_403, error_400
)


def health(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    # Health & Debug endpoints
    path('health/', health_check, name='health-check'),
    path('api/health/', health_check, name='api-health-check'),
    path('api/debug/', debug_info, name='debug-info'),
    path('api/admin-debug/', admin_debug_info, name='admin-debug'),
    path('api/db-performance/', db_performance_check, name='db-performance'),
    
    # Main application URLs
    path('admin/', admin.site.urls),
    path('api/main/', include('main.urls')),
    path('api/gallery/', include('gallery.urls')),
    path('api/events/', include('events.urls')),

    # API documentation (admin-only, see SPECTACULAR_SETTINGS)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Error handlers
handler404 = 'missculture.error_handlers.error_404'
handler500 = 'missculture.error_handlers.error_500'
handler403 = 'missculture.error_handlers.error_403'
handler400 = 'missculture.error_handlers.error_400'
