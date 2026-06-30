# NGINX Gateway Fabric

Install the Gateway API CRDs and the NGINX Gateway Fabric controller with:

```bash
./k8s/manifests/gateway-controller/install.sh
```

The install script applies both Gateway API CRDs and NGINX Gateway Fabric CRDs
before installing the controller chart.

For local `kind`, this repo exposes the Gateway listener on:

- `http://localhost:8080`
- `https://localhost:8443`

Those host ports map to the NodePorts configured in [values.yaml](./values.yaml)
and in [k8s/kind/kind-config.yaml](../../kind/kind-config.yaml).

To use hostname-based routes locally, add hostnames that point to `127.0.0.1`,
for example:

```text
127.0.0.1 admin-fe.local
127.0.0.1 shop-fe.local
127.0.0.1 customer-fe-next.local
127.0.0.1 api.local
127.0.0.1 keycloak.local
127.0.0.1 kafka-ui.local
127.0.0.1 schema-registry.local
```

Then access services through the Gateway on port `8080`, for example
`http://kafka-ui.local:8080/` or `http://keycloak.local:8080/`.
