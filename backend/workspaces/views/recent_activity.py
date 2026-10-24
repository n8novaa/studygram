from django.db.models import BigIntegerField, F, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from ..models import WorkspaceChannelMessage, WorkspaceChannelReadPosition
from ..serializers import RecentWorkspaceActivitySerializer


class RecentActivityPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 50


class RecentWorkspaceActivityView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RecentWorkspaceActivitySerializer
    pagination_class = RecentActivityPagination

    def get_queryset(self):
        view = self.request.query_params.get('view', 'active')
        if view not in {'active', 'history'}:
            raise ValidationError({'view': 'Choose active or history.'})
        # Message access follows the same workspace-membership rule as the
        # channel message API. No client-supplied workspace/channel IDs are
        # used to build this queryset.
        queryset = (
            WorkspaceChannelMessage.objects
            .filter(channel__workspace__memberships__user=self.request.user)
            .exclude(user=self.request.user)
            .select_related('user__profile', 'channel__workspace')
            .order_by('-created', '-pk')
        )
        if view == 'active':
            position = WorkspaceChannelReadPosition.objects.filter(
                user=self.request.user, channel_id=OuterRef('channel_id')
            ).values('last_viewed_message_id')[:1]
            queryset = queryset.annotate(
                last_viewed_position=Coalesce(
                    Subquery(position), Value(0), output_field=BigIntegerField()
                )
            ).filter(pk__gt=F('last_viewed_position'))
        return queryset
