from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.utils.translation import gettext_lazy as _
from .services.security_service import SecurityService

class HoneyPotView(APIView):
    """
    HoneyPot View ("Горшочек с медом").
    Любой запрос сюда приводит к вечному бану IP.
    """
    permission_classes = [AllowAny]
    authentication_classes = [] # No auth required to be caught

    def get(self, request, *args, **kwargs):
        return self._trap(request)

    def post(self, request, *args, **kwargs):
        return self._trap(request)
        
    def _trap(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        # Бан
        SecurityService.ban_user(
            ip=ip,
            reason="HoneyPot Trap Triggered (Attempted access to hidden admin URL)"
        )

        # Возвращаем 403 (или 404, чтобы сбить с толку, но 403 честнее)
        return Response(
            {"detail": "Access Denied. Security Violation Logged."}, 
            status=status.HTTP_403_FORBIDDEN
        )
