# Apply SSL With Let's Encrypt

This guide enables CA-signed HTTPS certificates for the VPS Kubernetes deployment.

Current VPS details:

- Kubernetes entrypoint IP: `103.6.234.153`
- Gateway namespace: `microservices`
- Gateway name: `api-gateway`
- Gateway class: `nginx`
- TLS secret: `haint-fyi-tls`
- Let's Encrypt issuer: `letsencrypt-prod`

## Architecture

SSL is managed inside Kubernetes:

1. NGINX Gateway Fabric exposes ports `80` and `443` on the VPS node.
2. cert-manager requests certificates from Let's Encrypt.
3. Let's Encrypt validates each hostname through HTTP-01 on port `80`.
4. cert-manager stores the issued certificate in the Kubernetes secret `microservices/haint-fyi-tls`.
5. The Gateway HTTPS listener terminates TLS using that secret.

Do not run Certbot directly on the VPS for this deployment. Certbot would create files on the host, while the Gateway needs a Kubernetes TLS secret.

## DNS Requirements

Every hostname in `k8sGateway.routes` must resolve to the VPS:

```text
api.haint.fyi                  -> 103.6.234.153
keycloak.haint.fyi             -> 103.6.234.153
admin-fe.haint.fyi             -> 103.6.234.153
shop-fe.haint.fyi              -> 103.6.234.153
customer-fe-next.haint.fyi     -> 103.6.234.153
customer-wallet-fe.haint.fyi   -> 103.6.234.153
shop-wallet-fe.haint.fyi       -> 103.6.234.153
```

The apex `haint.fyi` is not used by this chart. If you want SSL for `https://haint.fyi`, point the apex DNS record to `103.6.234.153` and add a Gateway route for it.

## Firewall Requirements

Open both ports on the VPS:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

Port `80` must stay open because Let's Encrypt HTTP-01 validation uses it.

## Chart Configuration

The umbrella chart values configure:

- an HTTP listener on port `80`
- an HTTPS listener on port `443`
- a cert-manager `ClusterIssuer`
- a cert-manager `Certificate`
- public application URLs using `https://*.haint.fyi`

The relevant values are in `helm/values.yaml`:

```yaml
k8sGateway:
  gateway:
    listeners:
      - name: http
        port: 80
        protocol: HTTP
      - name: https
        port: 443
        protocol: HTTPS
        tls:
          mode: Terminate
          certificateRefs:
            - name: haint-fyi-tls
  certManager:
    enabled: true
    clusterIssuer:
      name: letsencrypt-prod
      email: admin@haint.fyi
      server: https://acme-v02.api.letsencrypt.org/directory
    certificate:
      name: haint-fyi-tls
      secretName: haint-fyi-tls
```

By default, the certificate DNS names are generated from `k8sGateway.routes`.

## Install cert-manager

cert-manager must be installed before deploying the chart because the chart renders `ClusterIssuer` and `Certificate` resources.

```bash
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.20.2 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set config.enableGatewayAPI=true \
  --set webhook.hostNetwork=true \
  --set webhook.securePort=10260
```

The webhook host-network settings are required on this VPS because the API server did not reliably reach the cert-manager webhook through the pod network. Port `10260` avoids a host-network conflict with the kubelet port `10250`.

Wait for it:

```bash
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager --for=condition=Available
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager-webhook --for=condition=Available
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager-cainjector --for=condition=Available
```

If Gateway API CRDs were installed after cert-manager started, restart cert-manager:

```bash
kubectl rollout restart deployment cert-manager -n cert-manager
kubectl rollout status deployment cert-manager -n cert-manager
```

## Apply SSL

Deploy the chart:

```bash
helm dependency update helm

helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

Check issuance:

```bash
kubectl get clusterissuer letsencrypt-prod
kubectl get certificate haint-fyi-tls -n microservices
kubectl describe certificate haint-fyi-tls -n microservices
kubectl get secret haint-fyi-tls -n microservices
```

Check Gateway HTTPS:

```bash
kubectl get gateway api-gateway -n microservices
kubectl describe gateway api-gateway -n microservices
```

Test externally:

```bash
curl -I https://api.haint.fyi
curl -I https://admin-fe.haint.fyi
curl -I https://keycloak.haint.fyi
```

## Troubleshooting

If the certificate stays `False` or `Issuing`:

```bash
kubectl get certificaterequest,order,challenge -n microservices
kubectl describe challenge -n microservices
```

Common causes:

- DNS does not point to `103.6.234.153`.
- Port `80` is blocked.
- The Gateway HTTP listener on port `80` is missing.
- cert-manager was installed without `config.enableGatewayAPI=true`.
- The API server cannot reach the cert-manager webhook through the pod network. Reinstall or upgrade cert-manager with `webhook.hostNetwork=true` and `webhook.securePort=10260`.
- The NGINX Gateway data plane is not bound to host port `80`.

If an old manually created TLS secret already exists, cert-manager may report `IncorrectIssuer`. Delete only that stale secret and let cert-manager recreate it:

```bash
kubectl delete secret haint-fyi-tls -n microservices
kubectl delete certificate haint-fyi-tls -n microservices

helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

## Rollback

To disable chart-managed cert-manager resources:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --set k8sGateway.certManager.enabled=false
```

To remove cert-manager itself:

```bash
helm uninstall cert-manager -n cert-manager
```

Do not delete cert-manager CRDs unless you intentionally want to remove all cert-manager resources from the cluster.

## References

- cert-manager Helm install: https://cert-manager.io/docs/installation/helm/
- cert-manager Gateway HTTP-01 solver: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource: https://cert-manager.io/docs/usage/certificate/
