from django.apps import AppConfig


class WorkspacesConfig(AppConfig):
    name = 'workspaces'

    def ready(self):
        from . import signals  # noqa: F401
