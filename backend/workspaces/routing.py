from django.urls import path

from .consumers import WorkspaceChannelConsumer

websocket_urlpatterns = [
    path(
        'ws/workspaces/<int:workspace_id>/channels/<int:channel_id>/messages/',
        WorkspaceChannelConsumer.as_asgi(),
    ),
]
