"""Django Airavata Auth Backends: KeycloakBackend."""
import logging
import time

from django.conf import settings
from django.contrib.auth.models import User
from django.urls import reverse

from oauthlib.oauth2 import LegacyApplicationClient
import requests
from requests_oauthlib import OAuth2Session

from . import utils


logger = logging.getLogger(__name__)


class KeycloakBackend(object):
    """Django authentication backend for Keycloak."""

    def authenticate(self, request=None, username=None, password=None):
        try:
            if username and password:
                token, userinfo = self._get_token_and_userinfo_password_flow(
                    username, password)
                self._process_token(request, token)
                return self._process_userinfo(request, userinfo)
            # user is already logged in and can use refresh token
            elif request.user and not utils.is_refresh_token_expired(request):
                logger.debug("Refreshing token...")
                token = self._get_token_from_refresh_token(request)
                self._process_token(request, token)
                # user is already logged in
                return request.user
            else:
                token, userinfo = self._get_token_and_userinfo_redirect_flow(
                    request)
                self._process_token(request, token)
                return self._process_userinfo(request, userinfo)
        except Exception as e:
            logger.exception("login failed")
            return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def _get_token_and_userinfo_password_flow(self, username, password):
        client_id = settings.KEYCLOAK_CLIENT_ID
        client_secret = settings.KEYCLOAK_CLIENT_SECRET
        token_url = settings.KEYCLOAK_TOKEN_URL
        userinfo_url = settings.KEYCLOAK_USERINFO_URL
        verify_ssl = settings.KEYCLOAK_VERIFY_SSL
        oauth2_session = OAuth2Session(client=LegacyApplicationClient(
            client_id=client_id))
        if hasattr(settings, 'KEYCLOAK_CA_CERTFILE'):
            oauth2_session.verify = settings.KEYCLOAK_CA_CERTFILE
        token = oauth2_session.fetch_token(token_url=token_url,
                                           username=username,
                                           password=password,
                                           client_id=client_id,
                                           client_secret=client_secret,
                                           verify=verify_ssl)
        userinfo = oauth2_session.get(userinfo_url).json()
        return token, userinfo

    def _get_token_and_userinfo_redirect_flow(self, request):
        authorization_code_url = request.build_absolute_uri()
        redirect_url = request.build_absolute_uri(
            reverse('django_airavata_auth:callback'))
        client_id = settings.KEYCLOAK_CLIENT_ID
        client_secret = settings.KEYCLOAK_CLIENT_SECRET
        token_url = settings.KEYCLOAK_TOKEN_URL
        userinfo_url = settings.KEYCLOAK_USERINFO_URL
        verify_ssl = settings.KEYCLOAK_VERIFY_SSL
        state = request.session['OAUTH2_STATE']
        logger.debug("state={}".format(state))
        oauth2_session = OAuth2Session(client_id,
                                       scope='openid',
                                       redirect_uri=redirect_url,
                                       state=state)
        if hasattr(settings, 'KEYCLOAK_CA_CERTFILE'):
            oauth2_session.verify = settings.KEYCLOAK_CA_CERTFILE
        token = oauth2_session.fetch_token(
            token_url, client_secret=client_secret,
            authorization_response=authorization_code_url, verify=verify_ssl)
        userinfo = oauth2_session.get(userinfo_url).json()
        return token, userinfo

    def _get_token_from_refresh_token(self, request):
        client_id = settings.KEYCLOAK_CLIENT_ID
        client_secret = settings.KEYCLOAK_CLIENT_SECRET
        token_url = settings.KEYCLOAK_TOKEN_URL
        verify_ssl = settings.KEYCLOAK_VERIFY_SSL
        oauth2_session = OAuth2Session(client_id, scope='openid')
        if hasattr(settings, 'KEYCLOAK_CA_CERTFILE'):
            oauth2_session.verify = settings.KEYCLOAK_CA_CERTFILE
        refresh_token = request.session['REFRESH_TOKEN']
        # refresh_token doesn't take client_secret kwarg, so create auth
        # explicitly
        auth = requests.auth.HTTPBasicAuth(client_id, client_secret)
        token = oauth2_session.refresh_token(token_url=token_url,
                                             refresh_token=refresh_token,
                                             auth=auth,
                                             verify_ssl=verify_ssl)
        return token

    def _process_token(self, request, token):
        # TODO validate the JWS signature
        logger.debug("token: {}".format(token))
        now = time.time()
        # Put access_token into session to be used for authenticating with API
        # server
        sess = request.session
        sess['ACCESS_TOKEN'] = token['access_token']
        sess['ACCESS_TOKEN_EXPIRES_AT'] = now + token['expires_in']
        sess['REFRESH_TOKEN'] = token['refresh_token']
        sess['REFRESH_TOKEN_EXPIRES_AT'] = now + token['refresh_expires_in']

    def _process_userinfo(self, request, userinfo):
        logger.debug("userinfo: {}".format(userinfo))
        username = userinfo['preferred_username']
        request.session['USERINFO'] = userinfo
        # TODO load user roles too
        try:
            user = User.objects.get(username=username)
            return user
        except User.DoesNotExist:
            user = User(username=username)
            user.save()
            return user
