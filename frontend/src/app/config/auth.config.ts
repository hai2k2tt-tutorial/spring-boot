import { PassedInitialConfig } from 'angular-auth-oidc-client';

const realmPath = '/realms/spring-microservices-security-realm';
const { hostname, origin, protocol } = window.location;

const authority = hostname === 'localhost'
  ? `http://localhost:8181${realmPath}`
  : `${protocol}//${hostname.replace(/^[^.]+/, 'keycloak')}${realmPath}`;

export const authConfig: PassedInitialConfig = {
  config: {
    authority,
    redirectUrl: origin,
    postLogoutRedirectUri: origin,
    clientId: 'angular-client',
    scope: 'openid profile offline_access',
    responseType: 'code',
    silentRenew: true,
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 30,
  }
}
