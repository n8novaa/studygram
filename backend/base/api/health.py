import logging

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)


@require_GET
def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        logger.exception('Health check could not reach the database.')
        response = JsonResponse({'status': 'unavailable'}, status=503)
        response['Cache-Control'] = 'no-store'
        return response

    if settings.REDIS_URL:
        client = None
        try:
            from redis import Redis

            client = Redis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            client.ping()
        except Exception:
            logger.exception('Health check could not reach Redis.')
            response = JsonResponse({'status': 'unavailable'}, status=503)
            response['Cache-Control'] = 'no-store'
            return response
        finally:
            if client is not None:
                client.close()

    response = JsonResponse({'status': 'ok'})
    response['Cache-Control'] = 'no-store'
    return response
