import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workspaces', '0010_workspaceinvitation_max_uses_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkspacePresenceConnection',
            fields=[
                (
                    'connection_id',
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ('connected_at', models.DateTimeField(auto_now_add=True)),
                ('last_seen', models.DateTimeField(auto_now=True)),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='workspace_presence_connections',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'workspace',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='presence_connections',
                        to='workspaces.workspace',
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name='workspacepresenceconnection',
            index=models.Index(
                fields=['workspace', 'last_seen'],
                name='ws_presence_ws_seen_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='workspacepresenceconnection',
            index=models.Index(
                fields=['workspace', 'user', 'last_seen'],
                name='ws_presence_ws_user_seen_idx',
            ),
        ),
    ]
